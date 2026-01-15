import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import fastf1
import pandas as pd
import numpy as np

# 1. SETUP: Serve the 'dist' folder (React build output)
# static_folder='dist' tells Flask where the HTML/JS files are located
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# 2. CACHE CONFIGURATION FOR RENDER
# Render only allows writing to the /tmp directory
# We check if the folder exists, if not create it
cache_dir = '/tmp/cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

# ==========================================
#  API ROUTES (F1 Logic)
# ==========================================

@app.route('/api/race-data')
def get_race_data():
    year = request.args.get('year', default=2023, type=int)
    track = request.args.get('track', default='Monza', type=str)
    
    print(f"🏁 LOADING: {year} {track} GP")
    
    try:
        session = fastf1.get_session(year, track, 'R')
        session.load()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # A. Track Map
    track_path = []
    try:
        fastest_lap = session.laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry()
        track_path = [{"x": int(row['X']), "y": int(row['Y'])} for _, row in telemetry.iterrows()]
    except:
        pass

    # B. Process Drivers (Data-Driven Timeline Logic)
    driver_numbers = [d for d in session.drivers if not session.laps.pick_drivers(d).empty]
    driver_data = {}
    driver_info_map = {}
    
    raw_streams = {}
    min_time = pd.Timedelta.max
    max_time = pd.Timedelta.min
    
    # 1. Scan for Time Boundaries
    for drv_num in driver_numbers:
        try:
            d_info = session.get_driver(drv_num)
            drv_id = d_info['Abbreviation']
            driver_info_map[drv_id] = d_info
            
            laps = session.laps.pick_drivers(drv_num)
            car = laps.get_car_data()
            pos = laps.get_pos_data()
            
            if car.empty or pos.empty: continue
            
            t_min = car['Time'].min()
            t_max = car['Time'].max()
            
            if t_min < min_time: min_time = t_min
            if t_max > max_time: max_time = t_max
            
            raw_streams[drv_id] = { "car": car, "pos": pos, "laps": laps }
        except:
            continue
    
    # 2. Build Timeline
    if min_time == pd.Timedelta.max:
        return jsonify({"error": "No data found"}), 404
        
    timeline = pd.timedelta_range(start=min_time, end=max_time, freq='250ms')
    
    # 3. Align Drivers
    for drv_id, stream in raw_streams.items():
        try:
            raw_car = stream["car"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            raw_pos = stream["pos"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            
            aligned_car = raw_car.reindex(timeline, method='nearest')
            aligned_pos = raw_pos.reindex(timeline, method='nearest')
            
            combined = pd.DataFrame({
                'Speed': aligned_car['Speed'],
                'RPM': aligned_car['RPM'],
                'nGear': aligned_car['nGear'],
                'Throttle': aligned_car['Throttle'],
                'Brake': aligned_car['Brake'],
                'DRS': aligned_car['DRS'],
                'X': aligned_pos['X'],
                'Y': aligned_pos['Y']
            })
            
            # Simple Distance Calc
            combined['TotalDistance'] = (combined['Speed'] / 3.6 * 0.25).cumsum().fillna(0)
            combined['LapNumber'] = 1
            combined['TyreCompound'] = 'SOFT'
            combined['TyreLife'] = 1
            
            laps = stream["laps"]
            for _, lap in laps.iterrows():
                start_t = lap['LapStartTime']
                if pd.isna(start_t): continue
                mask = combined.index >= start_t
                combined.loc[mask, 'LapNumber'] = lap['LapNumber']
                combined.loc[mask, 'TyreCompound'] = lap['Compound']
                combined.loc[mask, 'TyreLife'] = lap['TyreLife']
            
            driver_data[drv_id] = combined
        except:
            continue

    # 4. Package Frames
    frames = []
    timeline_seconds = timeline.total_seconds()
    
    # Optimization: Step=2 (500ms) for stability
    for i in range(0, len(timeline), 2):
        ts = int(timeline_seconds[i] * 1000)
        frame_drivers = []
        leader_lap = 0
        
        for drv_id, df in driver_data.items():
            try:
                row = df.iloc[i]
                if pd.isna(row['X']): continue
                
                info = driver_info_map[drv_id]
                if row['LapNumber'] > leader_lap: leader_lap = int(row['LapNumber'])
                
                brake_val = 0
                if not pd.isna(row['Brake']) and row['Brake'] > 0: brake_val = 100

                frame_drivers.append({
                    "id": drv_id,
                    "name": info['LastName'],
                    "team": info['TeamName'],
                    "color": f"#{info['TeamColor']}",
                    "x": int(row['X']),
                    "y": int(row['Y']),
                    "speed": int(row['Speed']),
                    "rpm": int(row['RPM']),
                    "gear": int(row['nGear']),
                    "throttle": int(row['Throttle']),
                    "brake": brake_val,
                    "drs": int(row['DRS']) in [10, 12, 14],
                    "totalDistance": float(row['TotalDistance']),
                    "lap": int(row['LapNumber']),
                    "tyreCompound": str(row['TyreCompound']),
                    "tyreAge": int(row['TyreLife'])
                })
            except:
                continue
        
        if frame_drivers:
            frame_drivers.sort(key=lambda x: x['totalDistance'], reverse=True)
            frames.append({
                "timestamp": ts,
                "drivers": frame_drivers,
                "leaderLap": leader_lap,
                "sectorOwners": {"1": "VER", "2": "VER", "3": "VER"},
                "pittingDrivers": []
            })

    return jsonify({ "trackPath": track_path, "frames": frames })

# ==========================================
#  FRONTEND SERVING (Hosting React)
# ==========================================

@app.route('/')
def serve_react():
    # 1. Serve the main HTML file
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # 2. Serve other assets (JS/CSS) if they exist
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # 3. Fallback to index.html for React Router links
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # 3. USE RENDER PORT
    # Render provides a 'PORT' environment variable. We must listen on it.
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 F1 SERVER READY ON PORT {port}")
    app.run(host='0.0.0.0', port=port)

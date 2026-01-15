import os
import gc  # Garbage Collector interface
from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS
import fastf1
import pandas as pd
import numpy as np

# 1. APP CONFIG: Serve files from current directory (.) to support browser-side Babel
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# 2. CACHE: Use /tmp for Render
cache_dir = '/tmp/f1_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

# ==========================================
#  SMART STATIC SERVING (The Fix for 404s)
# ==========================================

@app.route('/')
def serve_index():
    # Explicitly serve index.html at root
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Security: Prevent accessing hidden files or server code
    if path.startswith('.') or path == 'server.py' or path == 'Procfile':
        abort(403)

    # 1. Try to serve the exact file requested
    if os.path.exists(path):
        return send_from_directory('.', path)
    
    # 2. SMART FIX: If not found, try adding .tsx or .ts
    # This solves "import App from './App'" 404 errors
    if os.path.exists(path + '.tsx'):
        return send_from_directory('.', path + '.tsx')
    if os.path.exists(path + '.ts'):
        return send_from_directory('.', path + '.ts')
    
    # 3. Fallback to index.html for React Router paths
    return send_from_directory('.', 'index.html')

# ==========================================
#  API ROUTES (Memory Optimized)
# ==========================================

@app.route('/api/race-data')
def get_race_data():
    year = request.args.get('year', default=2023, type=int)
    track = request.args.get('track', default='Monza', type=str)
    
    print(f"🏁 LOADING: {year} {track} GP (Low Mem Mode)")
    
    try:
        # MEMORY FIX 1: Load ONLY what we need
        # We disable weather data to save RAM
        session = fastf1.get_session(year, track, 'R')
        session.load(telemetry=True, laps=True, weather=False, messages=False)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Garbage collect immediately after load
    gc.collect()

    try:
        # MEMORY FIX 2: Downsample Track Map
        fastest_lap = session.laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry()
        # Take only 1 out of every 5 points for the map
        track_path = [{"x": int(row['X']), "y": int(row['Y'])} for _, row in telemetry.iloc[::5].iterrows()]
    except:
        track_path = []

    driver_numbers = [d for d in session.drivers if not session.laps.pick_drivers(d).empty]
    driver_data = {}
    driver_info_map = {}
    
    min_time = pd.Timedelta.max
    max_time = pd.Timedelta.min
    
    # Scan Boundaries
    for drv_num in driver_numbers:
        try:
            laps = session.laps.pick_drivers(drv_num)
            # MEMORY FIX 3: Get ONLY necessary columns immediately
            # This drops unused data like 'Brake', 'Source', 'RelativeDistance' early
            car = laps.get_car_data()[['Time', 'Speed', 'RPM', 'nGear', 'Throttle', 'Brake', 'DRS']]
            pos = laps.get_pos_data()[['Time', 'X', 'Y']]
            
            if car.empty or pos.empty: continue
            
            # Update boundaries
            t_min = car['Time'].min()
            t_max = car['Time'].max()
            if t_min < min_time: min_time = t_min
            if t_max > max_time: max_time = t_max
            
            d_info = session.get_driver(drv_num)
            driver_info_map[d_info['Abbreviation']] = d_info
            
            # MEMORY FIX 4: Store only minimal raw data
            driver_data[d_info['Abbreviation']] = { 
                "car": car, "pos": pos, "laps": laps[['LapStartTime', 'LapNumber', 'Compound', 'TyreLife']] 
            }
        except:
            continue
            
    if min_time == pd.Timedelta.max:
        return jsonify({"error": "No data found"}), 404

    # MEMORY FIX 5: Low Frequency Timeline
    # 500ms freq (2fps) is much lighter than 250ms
    timeline = pd.timedelta_range(start=min_time, end=max_time, freq='500ms')
    
    processed_data = {}
    
    # Align Drivers (Iterative to save RAM)
    for drv_id, stream in driver_data.items():
        try:
            # Drop duplicates and sort
            raw_car = stream["car"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            raw_pos = stream["pos"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            
            # Reindex
            aligned_car = raw_car.reindex(timeline, method='nearest')
            aligned_pos = raw_pos.reindex(timeline, method='nearest')
            
            # Combine
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
            
            # Clean up raw dataframes immediately to free RAM
            del raw_car
            del raw_pos
            del aligned_car
            del aligned_pos
            
            # Add Computed Fields
            combined['TotalDistance'] = (combined['Speed'] / 3.6 * 0.5).cumsum().fillna(0) # 0.5s intervals
            combined['LapNumber'] = 1
            combined['TyreCompound'] = 'SOFT'
            combined['TyreLife'] = 1
            
            # Map Laps
            laps = stream["laps"]
            for _, lap in laps.iterrows():
                start_t = lap['LapStartTime']
                if pd.isna(start_t): continue
                mask = combined.index >= start_t
                combined.loc[mask, 'LapNumber'] = lap['LapNumber']
                combined.loc[mask, 'TyreCompound'] = lap['Compound']
                combined.loc[mask, 'TyreLife'] = lap['TyreLife']
            
            processed_data[drv_id] = combined
            
        except:
            continue
            
    # Clear raw driver data dict
    driver_data = None
    gc.collect()

    # Package Frames
    frames = []
    timeline_seconds = timeline.total_seconds()
    
    for i in range(len(timeline)):
        ts = int(timeline_seconds[i] * 1000)
        frame_drivers = []
        leader_lap = 0
        
        for drv_id, df in processed_data.items():
            try:
                row = df.iloc[i]
                if pd.isna(row['X']): continue
                
                info = driver_info_map[drv_id]
                if row['LapNumber'] > leader_lap: leader_lap = int(row['LapNumber'])
                
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
                    "brake": 100 if row['Brake'] > 0 else 0,
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 RENDER SERVER READY ON PORT {port}")
    app.run(host='0.0.0.0', port=port)

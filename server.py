import os
import gc
import mimetypes
from flask import Flask, jsonify, request, send_from_directory, abort, Response
from flask_cors import CORS
import fastf1
import pandas as pd
import numpy as np

# ==========================================
# 1. APP & MIME TYPES CONFIGURATION
# ==========================================

# Explicitly tell the browser that .ts and .tsx files are JavaScript
# This fixes the "Blocked because MIME type mismatch" errors
mimetypes.add_type('application/javascript', '.ts')
mimetypes.add_type('application/javascript', '.tsx')

# We set static_folder to '.' so Flask can find files in the root directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ==========================================
# 2. RENDER-SPECIFIC CACHING
# ==========================================

# Render only allows writing to /tmp
cache_dir = '/tmp/f1_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

# ==========================================
# 3. SMART STATIC SERVING (The Fix)
# ==========================================

@app.route('/')
def serve_index():
    # Serve index.html at the root URL
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Security: Prevent access to backend code
    if path in ['server.py', 'Procfile', 'requirements.txt'] or path.startswith('.git'):
        abort(403)

    # A. If the file exists exactly as requested, serve it
    if os.path.exists(path):
        return send_from_directory('.', path)

    # B. SMART FIX: Handle extension-less imports (e.g., import App from './App')
    # If browser asks for "App", we look for "App.tsx" or "App.ts"
    if os.path.exists(path + '.tsx'):
        return send_from_directory('.', path + '.tsx')
    if os.path.exists(path + '.ts'):
        return send_from_directory('.', path + '.ts')
    
    # C. Fallback to index.html for React Router (e.g. /dashboard -> index.html)
    # Only if it looks like a page navigation, not a missing asset
    if '.' not in path:
         return send_from_directory('.', 'index.html')
         
    return abort(404)

# ==========================================
# 4. API ROUTES (Memory Optimized)
# ==========================================

@app.route('/api/race-data')
def get_race_data():
    year = request.args.get('year', default=2023, type=int)
    track = request.args.get('track', default='Monza', type=str)
    
    print(f"🏁 LOADING: {year} {track} GP (Render Mode)")
    
    try:
        # MEMORY OPTIMIZATION #1: Load only critical data
        # disabling weather/messages saves ~50-100MB RAM
        session = fastf1.get_session(year, track, 'R')
        session.load(telemetry=True, laps=True, weather=False, messages=False)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Force garbage collection to free memory immediately
    gc.collect()

    # --- A. Generate Sparse Track Map ---
    track_path = []
    try:
        fastest_lap = session.laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry()
        # MEMORY OPTIMIZATION #2: Downsample Map (1 point every 10)
        track_path = [{"x": int(row['X']), "y": int(row['Y'])} for _, row in telemetry.iloc[::10].iterrows()]
    except:
        pass

    # --- B. Process Drivers ---
    driver_numbers = [d for d in session.drivers if not session.laps.pick_drivers(d).empty]
    
    min_time = pd.Timedelta.max
    max_time = pd.Timedelta.min
    raw_streams = {}
    driver_info_map = {}

    for drv_num in driver_numbers:
        try:
            d_info = session.get_driver(drv_num)
            drv_id = d_info['Abbreviation']
            driver_info_map[drv_id] = d_info
            
            laps = session.laps.pick_drivers(drv_num)
            
            # MEMORY OPTIMIZATION #3: Filter Columns Immediately
            # We discard unused columns before they even hit variable storage
            car = laps.get_car_data()[['Time', 'Speed', 'RPM', 'nGear', 'Throttle', 'Brake', 'DRS']]
            pos = laps.get_pos_data()[['Time', 'X', 'Y']]
            
            if car.empty or pos.empty: continue
            
            # Find timeline boundaries
            t_min = car['Time'].min()
            t_max = car['Time'].max()
            if t_min < min_time: min_time = t_min
            if t_max > max_time: max_time = t_max
            
            raw_streams[drv_id] = { "car": car, "pos": pos, "laps": laps[['LapStartTime', 'LapNumber', 'Compound', 'TyreLife']] }
            
        except:
            continue
    
    if min_time == pd.Timedelta.max:
        return jsonify({"error": "No data found"}), 404
        
    # MEMORY OPTIMIZATION #4: Aggressive Timeline Downsampling
    # 1s frequency (1Hz) is enough for a smooth-ish web view and prevents OOM crashes
    timeline = pd.timedelta_range(start=min_time, end=max_time, freq='1s')
    
    frames = []
    timeline_seconds = timeline.total_seconds()
    
    # Process drivers one by one to keep peak memory usage low
    processed_drivers = {}

    for drv_id, stream in raw_streams.items():
        try:
            # Clean & Sort
            raw_car = stream["car"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            raw_pos = stream["pos"].drop_duplicates(subset=['Time']).set_index('Time').sort_index()
            
            # Align
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
            
            # Cleanup raw immediately
            del raw_car
            del raw_pos
            del aligned_car
            del aligned_pos
            
            # Calculations
            combined['TotalDistance'] = (combined['Speed'] / 3.6).cumsum().fillna(0) # 1s intervals
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
                
            processed_drivers[drv_id] = combined
            
        except:
            continue

    # Cleanup raw streams dict to free massive RAM block
    raw_streams = None
    gc.collect()

    # --- C. Package JSON Frames ---
    # Loop through the timeline index
    for i in range(len(timeline)):
        ts = int(timeline_seconds[i] * 1000)
        frame_drivers = []
        leader_lap = 0
        
        for drv_id, df in processed_drivers.items():
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
    # Use the PORT provided by Render
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 RENDER SERVER READY ON PORT {port}")
    app.run(host='0.0.0.0', port=port)

import os
import logging
import mimetypes
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import fastf1
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Ensure .tsx and .ts files are served with a type Babel can handle
mimetypes.add_type('text/plain', '.tsx')
mimetypes.add_type('text/plain', '.ts')

# Setup FastF1 Cache
CACHE_DIR = './f1_cache'
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)
fastf1.Cache.enable_cache(CACHE_DIR)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/race-data')
def get_race_data():
    year = int(request.args.get('year', 2024))
    track = request.args.get('track', 'bahrain')
    
    try:
        logger.info(f"Loading session: {year} {track} Race")
        session = fastf1.get_session(year, track, 'R')
        session.load(telemetry=True, weather=False, messages=False)
        
        laps = session.laps
        drivers = pd.unique(laps['Driver'])
        
        # Get track path from the fastest lap for visualization
        fastest_lap = laps.pick_fastest()
        pos = fastest_lap.get_pos_data()
        track_path = []
        for _, row in pos.iterrows():
            track_path.push({'x': float(row['X']), 'y': float(row['Y'])})

        # Process telemetry into frames
        # We sample every 0.5 seconds to balance performance and smoothness
        start_time = laps['Time'].min().total_seconds()
        end_time = laps['Time'].max().total_seconds()
        step = 0.5 
        
        frames = []
        
        # Pre-calculate telemetry for all drivers to avoid repeated lookups
        driver_telemetry = {}
        for drv in drivers:
            try:
                drv_laps = laps.pick_driver(drv)
                tel = drv_laps.get_telemetry()
                # Relative time to race start
                tel['RelTime'] = tel['Date'].apply(lambda x: x.timestamp())
                driver_telemetry[drv] = {
                    'data': tel,
                    'info': session.get_driver(drv)
                }
            except Exception as e:
                logger.warning(f"Could not get telemetry for {drv}: {e}")

        # Generate snapshots
        # Limit frames for local performance (first 1000 frames ~ 8 mins of race)
        current_t = start_time
        frame_limit = 1200 
        
        for _ in range(frame_limit):
            if current_t > end_time: break
            
            frame_drivers = []
            for drv, payload in driver_telemetry.items():
                tel = payload['data']
                # Find closest telemetry point to current timestamp
                idx = np.abs(tel['SessionTime'].dt.total_seconds() - current_t).idxmin()
                row = tel.iloc[idx]
                
                # Get lap info
                current_lap = laps.pick_driver(drv).iloc[0]['LapNumber'] # Simplified
                
                frame_drivers.append({
                    'id': drv,
                    'name': payload['info']['FullName'],
                    'team': payload['info']['TeamName'],
                    'color': f"#{payload['info']['TeamColor']}",
                    'x': float(row['X']),
                    'y': float(row['Y']),
                    'speed': int(row['Speed']),
                    'rpm': int(row['RPM']),
                    'gear': int(row['nGear']),
                    'throttle': int(row['Throttle']),
                    'brake': 100 if row['Brake'] else 0,
                    'drs': row['DRS'] > 8, # Simplified DRS check
                    'tyreCompound': 'SOFT', # FastF1 lap data has this, but simplified here
                    'tyreAge': 5,
                    'lap': int(current_lap),
                    'totalDistance': float(row['Distance']),
                    'currentSector': 1,
                    'date': row['Date'].timestamp() * 1000
                })
            
            frames.append({
                'timestamp': current_t * 1000,
                'drivers': frame_drivers,
                'leaderLap': int(max([d['lap'] for d in frame_drivers]) if frame_drivers else 0),
                'sectorOwners': {1: 'VER', 2: 'VER', 3: 'VER'},
                'pittingDrivers': []
            })
            
            current_t += step

        return jsonify({
            'trackPath': track_path,
            'frames': frames
        })

    except Exception as e:
        logger.error(f"Error processing race data: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Local dev: Run on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)

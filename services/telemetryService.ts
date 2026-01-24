import { Coordinates, RaceFrame, DriverState } from '../types';
import { ALL_DRIVERS } from '../constants';

interface RaceDataResponse {
    trackPath: Coordinates[];
    frames: any[];
    error?: string;
}

// INTELLIGENT URL SELECTION
// Since server.py serves the frontend, we can just use relative paths.
const BACKEND_URL = '/api/race-data';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchRaceData = async (year: number, trackId: string): Promise<{ frames: RaceFrame[], trackPath: Coordinates[] }> => {
  const maxRetries = 1; // Faster fail locally
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
        const url = `${BACKEND_URL}?year=${year}&track=${trackId}`;
        console.log(`📡 Fetching Telemetry: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errorText}`);
        }
        
        const data: RaceDataResponse = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        console.log("✅ Data Received:", data.frames.length, "frames");

        const frames: RaceFrame[] = data.frames.map((f: any) => ({
            timestamp: f.timestamp,
            drivers: f.drivers.map((d: any) => ({
                ...d,
                tyreCompound: d.tyreCompound || 'SOFT', 
                tyreAge: d.tyreAge || 0,
                lap: d.lap || 0,
                totalDistance: d.totalDistance || 0,
                currentSector: d.currentSector || 1,
                isPitting: d.isPitting || false,
                throttle: Math.min(100, Math.max(0, d.throttle)),
                brake: Math.min(100, Math.max(0, d.brake))
            })),
            leaderLap: f.leaderLap || 0,
            sectorOwners: f.sectorOwners || { 1: null, 2: null, 3: null },
            pittingDrivers: f.pittingDrivers || []
        }));

        return {
            frames,
            trackPath: data.trackPath
        };

    } catch (error) {
        console.warn(`⚠️ Attempt ${attempt + 1} Failed:`, error);
        attempt++;
    }
  }
  return { frames: [], trackPath: [] };
};

export const generateDemoData = (): { frames: RaceFrame[], trackPath: Coordinates[] } => {
    const trackPath: Coordinates[] = [];
    const POINTS = 800;
    for (let i = 0; i <= POINTS; i++) {
        const t = (i / POINTS) * 2 * Math.PI;
        const x = 1200 * Math.sin(t);
        const y = 800 * Math.sin(2 * t); 
        trackPath.push({ x: x + 1500, y: y + 1000 });
    }

    const frames: RaceFrame[] = [];
    const TOTAL_FRAMES = 500;
    
    for (let f = 0; f < TOTAL_FRAMES; f++) {
        const frameDrivers: DriverState[] = ALL_DRIVERS.map((d, idx) => {
            const offset = (idx * (POINTS / ALL_DRIVERS.length)) * 0.8; 
            const tIndex = Math.floor((f + offset) % POINTS);
            const pos = trackPath[tIndex];
            
            const nextPos = trackPath[(tIndex + 10) % POINTS];
            const dist = Math.sqrt(Math.pow(nextPos.x - pos.x, 2) + Math.pow(nextPos.y - pos.y, 2));
            const isCorner = dist < 20;

            const speed = isCorner ? 80 + Math.random() * 20 : 300 + Math.random() * 20;
            const gear = Math.min(8, Math.floor(speed / 40));
            const lap = Math.floor((f + offset) / POINTS) + 1;
            const lapDist = tIndex * 10;
            
            return {
                id: d.id,
                name: d.name,
                team: d.team,
                color: d.color,
                x: pos.x,
                y: pos.y,
                speed: Math.floor(speed),
                rpm: Math.floor(10000 + (speed * 20)),
                gear,
                throttle: isCorner ? 40 : 100,
                brake: isCorner ? 80 : 0,
                drs: !isCorner && speed > 280,
                tyreCompound: idx % 2 === 0 ? 'SOFT' : 'MEDIUM',
                tyreAge: Math.floor(f / 100),
                lap: lap,
                lapDistance: lapDist,
                totalDistance: (lap * 5000) + lapDist,
                currentSector: tIndex < POINTS/3 ? 1 : tIndex < (POINTS*2)/3 ? 2 : 3,
                isPitting: false,
                date: Date.now() + (f * 100)
            };
        });

        frameDrivers.sort((a, b) => b.totalDistance - a.totalDistance);

        frames.push({
            timestamp: f * 100,
            drivers: frameDrivers,
            leaderLap: Math.max(...frameDrivers.map(d => d.lap)),
            sectorOwners: { 1: 'VER', 2: 'LEC', 3: 'HAM' },
            pittingDrivers: []
        });
    }

    return { frames, trackPath };
};
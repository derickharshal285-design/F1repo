import React, { useEffect, useState, useRef, useMemo } from 'react';
import TrackMap from './components/TrackMap';
import TelemetryPanel from './components/TelemetryPanel';
import DriverList from './components/DriverList';
import Controls from './components/Controls';
import { fetchRaceData, generateDemoData } from './services/telemetryService';
import { RaceFrame, Coordinates, DriverState } from './types';
import { REPLAY_FPS, TRACKS, YEARS } from './constants';

const EMPTY_FRAME: RaceFrame = {
  timestamp: 0,
  drivers: [],
  leaderLap: 0,
  sectorOwners: { 1: null, 2: null, 3: null },
  pittingDrivers: []
};

const App: React.FC = () => {
  // --- App View State ---
  const [viewState, setViewState] = useState<'SETUP' | 'LOADING' | 'DASHBOARD' | 'ERROR'>('SETUP');
  const [config, setConfig] = useState({ year: 2024, trackId: 'bahrain' });

  // --- Data State ---
  const [raceData, setRaceData] = useState<RaceFrame[]>([]);
  const [trackPath, setTrackPath] = useState<Coordinates[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // --- Playback State ---
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLive, setIsLive] = useState(false);
  
  // --- Selection State ---
  const [selectedDriverId, setSelectedDriverId] = useState<string>('VER');

  // --- Memoized Data Derivations ---
  const currentFrameData: RaceFrame = raceData[currentFrameIndex] || EMPTY_FRAME;
  const currentDrivers = currentFrameData.drivers;
  const sortedDrivers = useMemo(() => [...currentDrivers].sort((a, b) => b.totalDistance - a.totalDistance), [currentDrivers]);
  const selectedDriver = useMemo(() => sortedDrivers.find(d => d.id === selectedDriverId) || null, [sortedDrivers, selectedDriverId]);
  
  const rival = useMemo(() => {
    if (!selectedDriver) return null;
    const selectedIdx = sortedDrivers.findIndex(d => d.id === selectedDriver.id);
    if (selectedIdx === -1) return null;

    const driverAhead = selectedIdx > 0 ? sortedDrivers[selectedIdx - 1] : null;
    const driverBehind = selectedIdx < sortedDrivers.length - 1 ? sortedDrivers[selectedIdx + 1] : null;

    if (!driverAhead && !driverBehind) return null;

    const gapAhead = driverAhead ? selectedDriver.totalDistance - driverAhead.totalDistance : Infinity;
    const gapBehind = driverBehind ? driverBehind.totalDistance - selectedDriver.totalDistance : Infinity;

    // Return the closer of the two
    return gapAhead < gapBehind ? driverAhead : driverBehind;

  }, [sortedDrivers, selectedDriver]);


  // --- Actions ---

  const handleStartSession = async () => {
      setViewState('LOADING');
      setErrorMsg(null);
      
      const data = await fetchRaceData(config.year, config.trackId);
      
      if (data.frames.length === 0) {
          setViewState('ERROR');
          setErrorMsg("Failed to retrieve telemetry.");
      } else {
          setRaceData(data.frames);
          setTrackPath(data.trackPath);
          if(data.frames[0]?.drivers[0]) {
              setSelectedDriverId(data.frames[0].drivers[0].id);
          }
          setViewState('DASHBOARD');
          setIsPlaying(true);
      }
  };

  const handleUseSimulation = () => {
      setViewState('LOADING');
      setTimeout(() => {
          const demo = generateDemoData();
          setRaceData(demo.frames);
          setTrackPath(demo.trackPath);
          setSelectedDriverId('VER');
          setViewState('DASHBOARD');
          setIsPlaying(true);
      }, 800);
  };

  // --- Animation Loop ---
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      const framesToAdvance = (deltaTime / 1000) * REPLAY_FPS * playbackSpeed;
      
      if (framesToAdvance >= 1) {
        setCurrentFrameIndex(prev => {
            if (raceData.length === 0) return 0;
            const next = Math.floor(prev + framesToAdvance);
            if (next >= raceData.length - 1) {
                if (isLive) return raceData.length - 1;
                return 0; // Loop in replay mode
            }
            return next;
        });
        lastTimeRef.current = time;
      }
    } else {
        lastTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (viewState !== 'DASHBOARD') return;

    if (isLive) {
        setIsPlaying(true);
        setPlaybackSpeed(1); 
        const interval = setInterval(() => {
            setCurrentFrameIndex(prev => Math.min(prev + 1, raceData.length - 1));
        }, 100); 
        return () => clearInterval(interval);
    } 

    if (isPlaying && raceData.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
        lastTimeRef.current = null;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isLive, playbackSpeed, raceData.length, viewState]);

  // --- Handlers ---
  const handleSeek = (val: number) => {
    if (raceData.length === 0) return;
    const frame = Math.floor(val * (raceData.length - 1));
    setCurrentFrameIndex(frame);
  };

  const handleJumpToLap = (lap: number) => {
    if (raceData.length === 0) return;
    const frameIndex = raceData.findIndex(frame => frame.leaderLap >= lap - 1);
    if (frameIndex !== -1) {
        setCurrentFrameIndex(frameIndex);
    }
    setIsPlaying(false);
  };

  const handleToggleLive = () => {
    setIsLive(!isLive);
    if (!isLive && raceData.length > 0) {
        setCurrentFrameIndex(Math.max(0, raceData.length - 200));
        setIsPlaying(true);
    } else {
        setIsPlaying(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if(!isLive) setIsPlaying(p => !p);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLive]);


  // --- VIEWS ---

  if (viewState === 'SETUP') {
      return (
        <div className="flex min-h-screen bg-black text-white items-center justify-center p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black pointer-events-none"></div>
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
             <div className="max-w-md w-full relative z-10 flex flex-col gap-8">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-red-600 flex items-center justify-center font-black italic text-2xl text-white mx-auto shadow-[0_0_30px_rgba(220,38,38,0.6)]">F1</div>
                    <h1 className="text-3xl font-bold tracking-tight">ENGINEER DASHBOARD</h1>
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Secure Telemetry Uplink</p>
                </div>
                <div className="space-y-6 bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Season</label>
                        <div className="grid grid-cols-4 gap-2">
                            {YEARS.slice(0,4).map(y => (
                                <button
                                    key={y}
                                    onClick={() => setConfig({...config, year: y})}
                                    className={`py-2 text-xs font-mono font-bold border transition-all ${config.year === y ? 'bg-white text-black border-white' : 'border-white/20 text-white/40 hover:border-white/60'}`}
                                >{y}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                         <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Grand Prix</label>
                         <select 
                            value={config.trackId}
                            onChange={(e) => setConfig({...config, trackId: e.target.value})}
                            className="w-full bg-black border border-white/20 text-white p-3 font-mono text-sm outline-none focus:border-red-600 uppercase"
                         >
                            {TRACKS.map(t => (<option key={t.id} value={t.id}>{t.country.toUpperCase()} - {t.name}</option>))}
                         </select>
                    </div>
                    <button 
                        onClick={handleStartSession}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                    >Initialize Session</button>
                    <div className="text-center">
                         <button onClick={handleUseSimulation} className="text-[10px] text-white/30 hover:text-white underline decoration-white/30 underline-offset-4 uppercase tracking-widest">Or Run Simulation Mode</button>
                    </div>
                </div>
             </div>
        </div>
      );
  }

  if (viewState === 'LOADING') {
      return (
          <div className="flex min-h-screen bg-black items-center justify-center text-white flex-col gap-6">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="flex flex-col items-center gap-1">
                <div className="font-mono text-sm font-bold uppercase tracking-widest">Est. Connection to Localhost:5000</div>
                <div className="text-[10px] text-white/40 font-mono">Fetching {config.year} {config.trackId.toUpperCase()} Payload...</div>
              </div>
          </div>
      );
  }

  if (viewState === 'ERROR') {
      return (
          <div className="flex min-h-screen bg-black items-center justify-center text-white p-8">
              <div className="max-w-xl border border-red-900 bg-red-900/10 p-8 w-full">
                <h1 className="text-2xl font-black text-red-600 mb-4">CONNECTION FAILED</h1>
                <p className="font-mono text-sm text-white/70 mb-6">{errorMsg || "Could not connect to Python backend."}</p>
                <div className="bg-black p-4 text-xs font-mono text-white/50 whitespace-pre-wrap border border-white/10 mb-8">
                    TROUBLESHOOTING:{'\n'}
                    1. Ensure 'server.py' is running locally on port 5000.{'\n'}
                    2. Ensure it handles query parameters (?year=...&track=...).
                </div>
                <div className="flex flex-col gap-4">
                    <button onClick={() => setViewState('SETUP')} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">Back to Configuration</button>
                    <button onClick={handleStartSession} className="w-full py-4 border border-red-600 text-red-600 font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors">Retry Connection</button>
                </div>
              </div>
          </div>
      );
  }

  // MAIN DASHBOARD
  const leaderLap = currentFrameData.leaderLap || 0;
  const selectedTrackInfo = TRACKS.find(t => t.id === config.trackId);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      <header className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-40 sticky top-0">
        <div className="flex items-center gap-6">
            <button onClick={() => setViewState('SETUP')} className="w-10 h-10 bg-red-600 hover:bg-white hover:text-red-600 transition-colors flex items-center justify-center font-black italic text-white" title="Back to Setup">F1</button>
            <div className="hidden md:block">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                    <span className="text-white/40">MONITOR</span>
                    <span className="w-px h-4 bg-white/20"></span>
                    <span className="tracking-widest uppercase">{selectedTrackInfo?.country || config.trackId} GP {config.year}</span>
                </h1>
            </div>
        </div>
        <div className="flex flex-col items-center">
             <div className="text-[9px] font-bold text-red-600 uppercase tracking-[0.2em] mb-0.5">Lap</div>
             <div className="text-3xl font-bold text-white leading-none font-mono tabular-nums">{leaderLap + 1}</div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-green-900/50 bg-green-900/10 text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                LINK ESTABLISHED
            </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 grid-rows-auto md:grid-rows-6 gap-0 md:gap-4 p-0 md:p-4 overflow-y-auto md:overflow-hidden relative">
        <div className="col-span-1 md:col-span-12 lg:col-span-9 row-span-4 lg:row-span-5 h-[50vh] md:h-auto border-b md:border border-white/10 relative">
            <TrackMap 
                drivers={currentDrivers} 
                selectedDriver={selectedDriver}
                rival={rival}
                onSelectDriver={setSelectedDriverId}
                sectorOwners={currentFrameData.sectorOwners}
                trackPath={trackPath}
            />
        </div>

        <div className="col-span-1 md:col-span-6 lg:col-span-3 row-span-2 lg:row-span-4 h-[40vh] md:h-full border-b md:border border-white/10">
             <DriverList 
                drivers={sortedDrivers} 
                selectedDriverId={selectedDriverId} 
                rivalId={rival?.id || null}
                onSelectDriver={setSelectedDriverId}
            />
        </div>

        <div className="col-span-1 md:col-span-6 lg:col-span-3 row-span-2 lg:row-span-2 h-[30vh] md:h-full border-b md:border border-white/10">
            <TelemetryPanel driver={selectedDriver} rival={rival} />
        </div>
      </main>

      <Controls 
        isPlaying={isPlaying}
        onTogglePlay={() => !isLive && setIsPlaying(!isPlaying)}
        progress={raceData.length > 1 ? currentFrameIndex / (raceData.length - 1) : 0}
        onSeek={handleSeek}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        totalFrames={raceData.length}
        currentFrame={currentFrameIndex}
        currentLap={leaderLap + 1}
        isLive={isLive}
        onToggleLive={handleToggleLive}
        onJumpToLap={handleJumpToLap}
      />
    </div>
  );
};

export default App;

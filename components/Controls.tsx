import React from 'react';
import { TOTAL_LAPS } from '../constants';

interface ControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number; 
  onSeek: (val: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  totalFrames: number;
  currentFrame: number;
  currentLap: number;
  isLive: boolean;
  onToggleLive: () => void;
  onJumpToLap: (lap: number) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onTogglePlay,
  progress,
  onSeek,
  playbackSpeed,
  onSpeedChange,
  currentLap,
  isLive,
  onToggleLive,
  onJumpToLap
}) => {
  
  return (
    <div className="bg-black border-t border-white/10 p-4 md:p-6 z-50 fixed bottom-0 w-full md:relative md:w-auto">
      <div className="flex flex-col gap-4 max-w-[1800px] mx-auto">
        
        {/* Scrubber - Minimal Line */}
        {!isLive && (
            <div className="relative h-8 group flex items-center cursor-pointer">
                {/* Track */}
                <div className="absolute w-full h-[2px] bg-white/20">
                    <div className="h-full bg-red-600 shadow-[0_0_10px_red]" style={{ width: `${progress * 100}%` }}></div>
                </div>
                
                {/* Input */}
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.0001"
                    value={progress}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="absolute w-full h-full opacity-0 z-10 cursor-pointer"
                />
                
                {/* Thumb */}
                <div 
                    className="absolute h-4 w-1 bg-white shadow-lg pointer-events-none transition-transform group-hover:scale-y-150"
                    style={{ left: `${progress * 100}%` }}
                ></div>
            </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center justify-between">
            
            {/* Left Controls */}
            <div className="flex items-center gap-6">
                 <button 
                    onClick={onTogglePlay}
                    disabled={isLive}
                    className="text-white hover:text-red-500 disabled:opacity-20 transition-colors"
                >
                    {isPlaying ? (
                         <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                         <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>

                <div className="flex items-center gap-1">
                    {[1, 2, 4].map(speed => (
                        <button
                            key={speed}
                            onClick={() => onSpeedChange(speed)}
                            disabled={isLive}
                            className={`px-3 py-1 text-[10px] font-bold border transition-all uppercase ${playbackSpeed === speed ? 'bg-white text-black border-white' : 'text-white/50 border-white/20 hover:text-white'}`}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Center Status */}
            <div className="hidden md:flex flex-col items-center">
                 {isLive ? (
                     <div className="text-red-600 font-bold tracking-[0.3em] text-xs animate-pulse">LIVE BROADCAST</div>
                 ) : (
                     <div className="text-white/40 font-bold tracking-[0.3em] text-xs">REPLAY MODE</div>
                 )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
                 <button
                    onClick={onToggleLive}
                    className={`
                        px-4 py-2 border transition-all text-xs font-bold uppercase tracking-wider
                        ${isLive ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-white/20 text-white/50 hover:text-white'}
                    `}
                 >
                    {isLive ? 'LIVE' : 'GO LIVE'}
                 </button>

                <div className="h-6 w-px bg-white/10"></div>

                <select 
                    value={Math.floor(currentLap)}
                    onChange={(e) => onJumpToLap(Number(e.target.value))}
                    disabled={isLive}
                    className="bg-black border border-white/20 text-white text-xs px-2 py-2 outline-none uppercase font-mono tracking-wider hover:border-white transition-colors"
                >
                    {Array.from({length: TOTAL_LAPS}, (_, i) => i + 1).map(l => (
                        <option key={l} value={l}>Lap {l}</option>
                    ))}
                </select>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Controls;
import React from 'react';
import { DriverState } from '../types';

interface TelemetryPanelProps {
  driver: DriverState | null;
  rival: DriverState | null;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ driver, rival }) => {
  if (!driver) return (
    <div className="h-full bg-black flex items-center justify-center text-white/20 font-mono text-xs tracking-[0.2em] uppercase">
      No Signal
    </div>
  );

  const displayName = driver.name.includes(' ') ? driver.name.split(' ').pop() : driver.name;

  return (
    <div className="bg-black p-4 h-full flex flex-col gap-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/10 pb-3">
        <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                {displayName}
            </h2>
            <div className="text-[9px] font-mono text-white/40 tracking-[0.2em] mt-1">{driver.team.toUpperCase()}</div>
        </div>
        <div className="text-right">
             <div className="text-xs font-mono text-white/60">{driver.id}</div>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* INPUTS */}
        <div className="flex gap-3 h-full items-end justify-center">
            {/* Brake */}
            <div className="flex flex-col items-center h-full w-5 gap-2">
                <div className="w-full flex-1 bg-white/5 relative">
                    <div 
                        className="absolute bottom-0 w-full bg-red-600 transition-all duration-75 ease-linear"
                        style={{ height: `${driver.brake}%` }}
                    ></div>
                </div>
                <span className="text-[8px] text-white/40 font-bold uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>BRAKE</span>
            </div>
            
            {/* Throttle */}
            <div className="flex flex-col items-center h-full w-5 gap-2">
                <div className="w-full flex-1 bg-white/5 relative">
                    <div 
                        className="absolute bottom-0 w-full bg-green-500 transition-all duration-75 ease-linear"
                        style={{ height: `${driver.throttle}%` }}
                    ></div>
                </div>
                <span className="text-[8px] text-white/40 font-bold uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>THROTTLE</span>
            </div>
        </div>

        {/* METRICS */}
        <div className="flex-1 flex flex-col justify-between">
            <div>
                <div className="text-[9px] text-white/40 font-mono tracking-widest mb-1">VELOCITY</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
                        {driver.speed}
                    </div>
                    <span className="text-xs font-bold text-red-600">KPH</span>
                </div>
            </div>

            <div>
                <div className="text-[9px] text-white/40 font-mono tracking-widest mb-1">GEARBOX</div>
                <div className={`text-5xl font-black tracking-tighter tabular-nums ${driver.gear >= 7 ? 'text-purple-500' : 'text-white'}`}>
                    {driver.gear}
                </div>
            </div>

             <div className="w-full">
                <div className="flex justify-between text-[9px] text-white/40 font-mono mb-1 tracking-widest">
                    <span>RPM</span>
                    <span>{driver.rpm}</span>
                </div>
                <div className="h-1 w-full bg-white/10">
                    <div 
                        className={`h-full transition-all duration-75 ${driver.rpm > 11500 ? 'bg-red-600' : 'bg-blue-500'}`}
                        style={{ width: `${(driver.rpm / 15000) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>
      
      {/* --- RIVAL INTEL --- */}
      {rival && (
        <div className="border-t border-yellow-500/20 pt-3">
             <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-[0.2em] mb-2">Rival Intel: {rival.id}</div>
             <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-1">
                    <div className="text-2xl font-bold font-mono text-white">{rival.speed}</div>
                    <div className="text-[8px] text-white/40">KPH</div>
                </div>
                <div className="bg-white/5 p-1">
                    <div className="text-2xl font-bold font-mono text-white">{rival.gear}</div>
                    <div className="text-[8px] text-white/40">GEAR</div>
                </div>
                <div className="bg-white/5 p-1">
                    <div className="text-2xl font-bold font-mono text-white">{rival.tyreAge}</div>
                    <div className="text-[8px] text-white/40">TYRE AGE</div>
                </div>
             </div>
        </div>
      )}

      {/* DRS Status */}
      <div className="flex gap-2 border-t border-white/10 pt-3 mt-auto">
        <div className={`flex-1 py-2 text-center text-[10px] font-black tracking-widest border transition-all uppercase ${driver.drs ? 'bg-green-500 text-black border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-black border-white/10 text-white/20'}`}>
            DRS {driver.drs ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;

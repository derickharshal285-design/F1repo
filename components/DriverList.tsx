import React from 'react';
import { DriverState } from '../types';
import { TYRE_COLORS } from '../constants';

interface DriverListProps {
  drivers: DriverState[];
  selectedDriverId: string | null;
  rivalId: string | null;
  onSelectDriver: (id: string) => void;
}

const DriverList: React.FC<DriverListProps> = ({ drivers, selectedDriverId, rivalId, onSelectDriver }) => {

  const getTyreColor = (compound: string) => {
      const upperCompound = (compound || 'unknown').toUpperCase();
      if (upperCompound.includes('SOFT')) return TYRE_COLORS.SOFT;
      if (upperCompound.includes('MEDIUM')) return TYRE_COLORS.MEDIUM;
      if (upperCompound.includes('HARD')) return TYRE_COLORS.HARD;
      if (upperCompound.includes('INTER')) return TYRE_COLORS.INTER;
      if (upperCompound.includes('WET')) return TYRE_COLORS.WET;
      return '#888';
  };

  const getTyreLetter = (compound: string) => {
      const upperCompound = (compound || 'unknown').toUpperCase();
      if (upperCompound.includes('SOFT')) return 'S';
      if (upperCompound.includes('MEDIUM')) return 'M';
      if (upperCompound.includes('HARD')) return 'H';
      if (upperCompound.includes('INTER')) return 'I';
      if (upperCompound.includes('WET')) return 'W';
      return '?';
  };

  const formatDriverName = (name: string) => {
      if (name.includes(' ')) {
          return name.split(' ').pop()?.toUpperCase();
      }
      return name.toUpperCase();
  };

  const leader = drivers[0];

  return (
    <div className="bg-black flex flex-col h-full">
      <div className="bg-black p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Live Timing</h3>
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {drivers.map((d, index) => {
            const isSelected = selectedDriverId === d.id;
            const isRival = rivalId === d.id;
            const tyreColor = getTyreColor(d.tyreCompound);
            const gap = leader && index > 0 ? ((leader.totalDistance - d.totalDistance) / d.speed).toFixed(2) : 'Leader';

            let rowClass = 'hover:bg-white/5';
            if (isSelected) rowClass = 'bg-white/10';
            if (isRival) rowClass = 'bg-yellow-500/10 hover:bg-yellow-500/20';

            return (
                <div 
                    key={d.id}
                    onClick={() => onSelectDriver(d.id)}
                    className={`
                        py-3 px-4 border-b border-white/5 cursor-pointer transition-all flex items-center justify-between
                        ${rowClass}
                    `}
                >
                    <div className="flex items-center gap-4">
                        <div className="font-mono text-white/30 font-bold w-4 text-sm">{index + 1}</div>
                        <div className="w-1 h-8" style={{ backgroundColor: d.color }}></div>
                        <div>
                            <div className={`font-bold text-sm tracking-wide ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                {formatDriverName(d.name)}
                            </div>
                            <div className="text-[9px] text-white/40 font-mono tracking-wider">{d.team.toUpperCase()}</div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/50 w-16 text-right">
                                {index === 0 ? 'LEADER' : `+${gap}s`}
                            </span>
                            <div 
                                className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                style={{ backgroundColor: tyreColor }}
                            >
                                {getTyreLetter(d.tyreCompound)}
                            </div>
                        </div>
                        <div className="h-0.5 w-16 bg-white/10 rounded-full overflow-hidden">
                             {/* Tyre Life Visualization (Assume 30 laps is max life for visual) */}
                             <div className={`h-full ${d.tyreAge > 20 ? 'bg-red-500' : 'bg-white/50'}`} style={{ width: `${Math.max(0, 100 - (d.tyreAge * 3.3))}%` }}></div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default DriverList;
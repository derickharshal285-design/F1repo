import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DriverState, Coordinates } from '../types';
import { ALL_DRIVERS, TYRE_COLORS } from '../constants';

interface TrackMapProps {
  drivers: DriverState[];
  selectedDriver: DriverState | null;
  rival: DriverState | null;
  onSelectDriver: (id: string) => void;
  sectorOwners: { 1: string | null; 2: string | null; 3: string | null };
  trackPath: Coordinates[];
}

const TrackMap: React.FC<TrackMapProps> = ({ drivers, selectedDriver, rival, onSelectDriver, sectorOwners, trackPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoCam, setIsAutoCam] = useState(true);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastViewBox = useRef(viewBox);

  const showBattleLine = selectedDriver && rival;
  const battleGapMeters = (showBattleLine) ? Math.abs(selectedDriver.totalDistance - rival.totalDistance) : 0;
  
  const fullTrackPath = useMemo(() => {
    if (trackPath.length < 2) return "";
    return d3.line<Coordinates>().x(d => d.x).y(d => d.y).curve(d3.curveBasis)(trackPath) || "";
  }, [trackPath]);

  useEffect(() => {
    if (!isAutoCam || trackPath.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    trackPath.forEach(d => {
      minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y);
    });

    if (minX === Infinity) { minX = -1000; maxX = 1000; minY = -1000; maxY = 1000; }

    const w = maxX - minX;
    const h = maxY - minY;
    // Massive padding to account for the much thicker track lines
    const padding = Math.max(w, h) * 0.35;
    
    setViewBox({ 
      x: minX - padding, 
      y: minY - padding, 
      w: w + padding * 2, 
      h: h + padding * 2 
    });
  }, [isAutoCam, trackPath]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (isAutoCam) setIsAutoCam(false);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseXRatio = (e.clientX - rect.left) / rect.width;
    const mouseYRatio = (e.clientY - rect.top) / rect.height;
    const mouseSvgX = viewBox.x + viewBox.w * mouseXRatio;
    const mouseSvgY = viewBox.y + viewBox.h * mouseYRatio;
    const zoomFactor = 1.15;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newW = direction > 0 ? viewBox.w / zoomFactor : viewBox.w * zoomFactor;
    const MAX_TRACK_DIMENSION = 50000;
    const MIN_ZOOM_WIDTH = 500;
    const clampedW = Math.max(MIN_ZOOM_WIDTH, Math.min(newW, MAX_TRACK_DIMENSION));
    if (clampedW === viewBox.w) return;
    const clampedH = clampedW * (viewBox.h / viewBox.w);
    const newX = mouseSvgX - mouseXRatio * clampedW;
    const newY = mouseSvgY - mouseYRatio * clampedH;
    setViewBox({ x: newX, y: newY, w: clampedW, h: clampedH });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); setIsDragging(true); setIsAutoCam(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastViewBox.current = viewBox;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return; e.preventDefault();
    const container = containerRef.current; if (!container) return;
    const scaleX = viewBox.w / container.clientWidth;
    const scaleY = viewBox.h / container.clientHeight;
    const dx = (e.clientX - dragStart.current.x) * scaleX;
    const dy = (e.clientY - dragStart.current.y) * scaleY;
    setViewBox({ ...lastViewBox.current, x: lastViewBox.current.x - dx, y: lastViewBox.current.y - dy });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getTeamColor = (driverId: string | null) => ALL_DRIVERS.find(d => d.id === driverId)?.color || '#333';
  const getTyreColor = (compound: string) => {
    const upper = (compound || 'unknown').toUpperCase();
    if (upper.includes('SOFT')) return TYRE_COLORS.SOFT;
    if (upper.includes('MEDIUM')) return TYRE_COLORS.MEDIUM;
    if (upper.includes('HARD')) return TYRE_COLORS.HARD;
    if (upper.includes('INTER')) return TYRE_COLORS.INTER;
    if (upper.includes('WET')) return TYRE_COLORS.WET;
    return '#FFF';
  };

  // Dimensions configuration for easy tweaking
  const DIM = {
      TRACK_BASE_WIDTH: 140,
      TRACK_ASPHALT_WIDTH: 90,
      DRIVER_OUTER_R: 32,
      DRIVER_TYRE_R: 26,
      DRIVER_INNER_R: 16,
      DRIVER_SEL_R: 38
  };

  const startFinishLine = useMemo(() => {
    if (trackPath.length < 2) return null;
    const p1 = trackPath[0];
    const p2 = trackPath[1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    return { x: p1.x, y: p1.y, angle: angle - 90, width: DIM.TRACK_BASE_WIDTH };
  }, [trackPath]);

  return (
    <div 
        ref={containerRef}
        className="w-full h-full bg-[#2a382a] relative overflow-hidden group select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 right-4 z-20">
         <button 
          onClick={() => setIsAutoCam(!isAutoCam)}
          className={`w-10 h-10 text-xs font-bold border transition-colors flex items-center justify-center ${isAutoCam ? 'bg-white text-black border-white' : 'text-white/50 border-white/20 hover:text-white'}`}
          title="Toggle Auto Camera"
        >AUTO</button>
      </div>

      <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}>
        <defs>
            <filter id="drs-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="30" result="coloredBlur" in="SourceGraphic" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.7"/>
            </filter>
            
            {/* Asphalt Texture Noise */}
            <filter id="asphalt-noise" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" result="desaturatedNoise" />
                <feComponentTransfer in="desaturatedNoise" result="theNoise">
                    <feFuncA type="linear" slope="0.2" intercept="0" /> 
                </feComponentTransfer>
                <feBlend in="SourceGraphic" in2="theNoise" mode="multiply" />
            </filter>

            {/* Subtle Gradient for Track Depth */}
            <linearGradient id="track-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#333" />
                <stop offset="50%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#333" />
            </linearGradient>

            <pattern id="checkerboard" patternUnits="userSpaceOnUse" width="40" height="40">
              <rect x="0" y="0" width="20" height="20" fill="white" />
              <rect x="20" y="0" width="20" height="20" fill="black" />
              <rect x="0" y="20" width="20" height="20" fill="black" />
              <rect x="20" y="20" width="20" height="20" fill="white" />
            </pattern>
            <style>{`
                @keyframes pulse {
                  0%, 100% { stroke-opacity: 1; transform: scale(1); }
                  50% { stroke-opacity: 0.7; transform: scale(1.1); }
                }
                .pulse-anim { animation: pulse 1.0s ease-in-out infinite; transform-origin: center; }
            `}</style>
        </defs>

        <g className="track-layout">
          {/* 1. Base/Kerb Layer (Extremely Wide) */}
          <path d={fullTrackPath} fill="none" stroke="#d4d4d4" strokeWidth={DIM.TRACK_BASE_WIDTH} strokeLinejoin="round" />
          
          {/* 2. Sector highlights acting as Colored Kerbs */}
          {Object.entries(sectorOwners).map(([sector, owner]) => {
            if (!owner || trackPath.length < 3) return null;
            const total = trackPath.length;
            const start = sector === '1' ? 0 : (sector === '2' ? Math.floor(total/3) : Math.floor(2*total/3));
            const end = sector === '1' ? Math.floor(total/3) : (sector === '2' ? Math.floor(2*total/3) : total);
            const sectorPath = d3.line<Coordinates>().x(d=>d.x).y(d=>d.y).curve(d3.curveBasis)(trackPath.slice(start, end));
            
            // Large dashes on the sides
            return <path key={sector} d={sectorPath||""} fill="none" stroke={getTeamColor(owner as string)} strokeWidth={DIM.TRACK_BASE_WIDTH} strokeDasharray="30 30" strokeLinejoin="round" />
          })}
          
          {/* 3. Main Asphalt Road (Wide) */}
          <path d={fullTrackPath} fill="none" stroke="url(#track-gradient)" strokeWidth={DIM.TRACK_ASPHALT_WIDTH} strokeLinejoin="round" filter="url(#asphalt-noise)" />

          {/* 4. Center Line */}
          <path d={fullTrackPath} fill="none" stroke="white" strokeWidth="2" strokeDasharray="60 80" opacity="0.3" />

          {startFinishLine && (
            <rect 
              x={-startFinishLine.width / 2}
              y={-30}
              width={startFinishLine.width}
              height="30"
              fill="url(#checkerboard)"
              transform={`translate(${startFinishLine.x}, ${startFinishLine.y}) rotate(${startFinishLine.angle})`}
            />
          )}
        </g>
        
        {showBattleLine && (
          <g className="battle-line">
            <line x1={selectedDriver.x} y1={selectedDriver.y} x2={rival.x} y2={rival.y} stroke="yellow" strokeWidth="6" strokeDasharray="15,15" opacity="0.8"/>
            <text x={(selectedDriver.x + rival.x) / 2} y={(selectedDriver.y + rival.y) / 2} fill="yellow" fontSize="50px" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="8px" paintOrder="stroke">
                {battleGapMeters.toFixed(1)}m
            </text>
          </g>
        )}

        {drivers.map(d => {
            const isSelected = d.id === selectedDriver?.id;
            const isRival = d.id === rival?.id;
            // When selected/rival, render even bigger
            const scale = isSelected || isRival ? 1.2 : 1.0; 

            return (
                <g 
                    key={d.id}
                    transform={`translate(${d.x}, ${d.y}) scale(${scale})`}
                    onClick={() => onSelectDriver(d.id)}
                    className="cursor-pointer"
                    style={{ filter: d.drs ? 'url(#drs-glow) url(#marker-shadow)' : 'url(#marker-shadow)' }}
                >
                    {/* Pulsing Selection Ring */}
                    {isSelected && <circle r={DIM.DRIVER_SEL_R} fill="none" stroke="white" strokeWidth="4" className="pulse-anim" />}
                    {isRival && <circle r={DIM.DRIVER_SEL_R} fill="none" stroke="yellow" strokeWidth="4" opacity="1" />}
                    
                    {/* Tyre Compound (Outer Thick Ring) */}
                    <circle r={DIM.DRIVER_TYRE_R} fill="none" stroke={getTyreColor(d.tyreCompound)} strokeWidth="8"/>
                    
                    {/* Team Color (Inner Core) */}
                    <circle r={DIM.DRIVER_INNER_R} fill={d.color} stroke="black" strokeWidth="1" />
                    
                    {/* Driver ID */}
                    <text y="6" fill="white" fontSize="16px" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="3px" paintOrder="stroke" className="pointer-events-none" style={{ fontFamily: 'monospace' }}>
                        {d.id.substring(0,3)}
                    </text>
                </g>
            );
        })}
      </svg>
    </div>
  );
};

export default TrackMap;

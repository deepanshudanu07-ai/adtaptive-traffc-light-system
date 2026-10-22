import React from 'react';
import { RoadDirection, SignalState } from '../types/traffic';
import { ShieldAlert, Car, Clock } from 'lucide-react';

interface IntersectionProps {
  activeRoad: RoadDirection;
  signalState: SignalState;
  remainingSeconds: number;
  totalDuration: number;
  queues: Record<RoadDirection, number>;
  servedCount?: number;
  mode?: 'adaptive' | 'fixed';
  starvingRoads?: RoadDirection[];
  priorityScores?: Record<RoadDirection, number>;
}

export const IntersectionCanvas: React.FC<IntersectionProps> = ({
  activeRoad,
  signalState,
  remainingSeconds,
  totalDuration,
  queues,
  servedCount = 0,
  mode = 'adaptive',
  starvingRoads = [],
  priorityScores = { North: 0, South: 0, East: 0, West: 0 }
}) => {
  // Determine light color for each road
  const getRoadSignal = (road: RoadDirection): 'green' | 'amber' | 'red' => {
    if (activeRoad === road) {
      if (signalState === 'GREEN') return 'green';
      if (signalState === 'AMBER') return 'amber';
      return 'red'; // CLEARANCE
    }
    return 'red';
  };

  // Helper to render vehicle markers in FIFO queue line
  const renderVehicleQueue = (road: RoadDirection, count: number) => {
    const displayCount = Math.min(count, 8); // show up to 8 icons visually
    const vehicles = [];

    for (let i = 0; i < displayCount; i++) {
      let x = 0;
      let y = 0;
      let angle = 0;

      // Positions relative to center (300, 300)
      if (road === 'North') {
        x = 282;
        y = 175 - i * 20;
        angle = 180;
      } else if (road === 'South') {
        x = 318;
        y = 425 + i * 20;
        angle = 0;
      } else if (road === 'West') {
        x = 175 - i * 20;
        y = 318;
        angle = 90;
      } else if (road === 'East') {
        x = 425 + i * 20;
        y = 282;
        angle = 270;
      }

      vehicles.push(
        <g key={`${road}-veh-${i}`} transform={`translate(${x}, ${y}) rotate(${angle})`}>
          <rect
            x="-7"
            y="-11"
            width="14"
            height="22"
            rx="3"
            fill={i === 0 ? "#60a5fa" : "#94a3b8"}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* Headlights / windshield */}
          <rect x="-5" y="-9" width="10" height="4" rx="1" fill="#38bdf8" opacity="0.8" />
          <rect x="-5" y="5" width="10" height="3" rx="1" fill="#ef4444" opacity="0.8" />
        </g>
      );
    }

    return vehicles;
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden">
      {/* Top Banner Stats */}
      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-400 border border-blue-800">
            {mode.toUpperCase()} CONTROL
          </span>
          <span className="text-slate-400">
            Active: <strong className="text-white font-mono">{activeRoad} Approach</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Car className="w-3.5 h-3.5" />
            <span>Served: {servedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className={signalState === 'GREEN' ? 'text-emerald-400 font-bold' : signalState === 'AMBER' ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>
              {signalState} ({remainingSeconds}s)
            </span>
          </div>
        </div>
      </div>

      {/* SVG 4-Way Intersection Layout */}
      <svg
        viewBox="0 0 600 600"
        className="w-full max-w-[500px] h-auto select-none rounded-xl bg-slate-900 shadow-inner border border-slate-800"
      >
        <defs>
          {/* Road asphalt pattern / gradients */}
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Glow filter for green and amber lights */}
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowAmber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Surrounding Grass/Sidewalks (4 Corners) */}
        <rect x="0" y="0" width="220" height="220" fill="#091e1b" rx="8" />
        <rect x="380" y="0" width="220" height="220" fill="#091e1b" rx="8" />
        <rect x="0" y="380" width="220" height="220" fill="#091e1b" rx="8" />
        <rect x="380" y="380" width="220" height="220" fill="#091e1b" rx="8" />

        {/* Sidewalk curb borders */}
        <rect x="212" y="0" width="8" height="220" fill="#475569" />
        <rect x="380" y="0" width="8" height="220" fill="#475569" />
        <rect x="212" y="380" width="8" height="220" fill="#475569" />
        <rect x="380" y="380" width="8" height="220" fill="#475569" />
        <rect x="0" y="212" width="220" height="8" fill="#475569" />
        <rect x="0" y="380" width="220" height="8" fill="#475569" />
        <rect x="380" y="212" width="220" height="8" fill="#475569" />
        <rect x="380" y="380" width="220" height="8" fill="#475569" />

        {/* 2. Main Roads (North-South & East-West) */}
        {/* North-South Road */}
        <rect x="220" y="0" width="160" height="600" fill="url(#roadGrad)" />
        {/* East-West Road */}
        <rect x="0" y="220" width="600" height="160" fill="url(#roadGrad)" />

        {/* 3. Center Intersection Junction Box */}
        <rect x="220" y="220" width="160" height="160" fill="#1e293b" />
        {/* Yellow Box junction hatched lines */}
        <rect x="230" y="230" width="140" height="140" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />

        {/* 4. Road Lane Markings */}
        {/* North center double yellow line */}
        <line x1="298" y1="0" x2="298" y2="200" stroke="#facc15" strokeWidth="2" />
        <line x1="302" y1="0" x2="302" y2="200" stroke="#facc15" strokeWidth="2" />
        {/* South center double yellow line */}
        <line x1="298" y1="400" x2="298" y2="600" stroke="#facc15" strokeWidth="2" />
        <line x1="302" y1="400" x2="302" y2="600" stroke="#facc15" strokeWidth="2" />
        {/* West center double yellow line */}
        <line x1="0" y1="298" x2="200" y2="298" stroke="#facc15" strokeWidth="2" />
        <line x1="0" y1="302" x2="200" y2="302" stroke="#facc15" strokeWidth="2" />
        {/* East center double yellow line */}
        <line x1="400" y1="298" x2="600" y2="298" stroke="#facc15" strokeWidth="2" />
        <line x1="400" y1="302" x2="600" y2="302" stroke="#facc15" strokeWidth="2" />

        {/* White dashed lane dividers */}
        <line x1="260" y1="0" x2="260" y2="200" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="340" y1="0" x2="340" y2="200" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="260" y1="400" x2="260" y2="600" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="340" y1="400" x2="340" y2="600" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="0" y1="260" x2="200" y2="260" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="0" y1="340" x2="200" y2="340" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="400" y1="260" x2="600" y2="260" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
        <line x1="400" y1="340" x2="600" y2="340" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />

        {/* Solid White Stop Lines */}
        <line x1="220" y1="200" x2="300" y2="200" stroke="#ffffff" strokeWidth="5" />
        <line x1="300" y1="400" x2="380" y2="400" stroke="#ffffff" strokeWidth="5" />
        <line x1="200" y1="300" x2="200" y2="380" stroke="#ffffff" strokeWidth="5" />
        <line x1="400" y1="220" x2="400" y2="300" stroke="#ffffff" strokeWidth="5" />

        {/* 5. Direction & Flow Arrows */}
        {/* North approach arrow (heading South) */}
        <path d="M 260 180 L 260 195 M 255 190 L 260 195 L 265 190" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" />
        {/* South approach arrow (heading North) */}
        <path d="M 340 420 L 340 405 M 335 410 L 340 405 L 345 410" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" />
        {/* West approach arrow (heading East) */}
        <path d="M 180 340 L 195 340 M 190 335 L 195 340 L 190 345" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" />
        {/* East approach arrow (heading West) */}
        <path d="M 420 260 L 405 260 M 410 255 L 405 260 L 410 265" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" />

        {/* 6. Render Waiting Vehicles on Approaches */}
        {renderVehicleQueue('North', queues.North || 0)}
        {renderVehicleQueue('South', queues.South || 0)}
        {renderVehicleQueue('East', queues.East || 0)}
        {renderVehicleQueue('West', queues.West || 0)}

        {/* 7. Traffic Signals & Light Heads (All 4 corners facing drivers) */}
        {/* North Signal Head (located at (200, 190) facing North approach) */}
        {(() => {
          const sig = getRoadSignal('North');
          return (
            <g transform="translate(195, 130)">
              <rect x="0" y="0" width="22" height="60" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <circle cx="11" cy="12" r="6" fill={sig === 'red' ? '#ef4444' : '#450a0a'} stroke="#991b1b" strokeWidth="0.5" />
              <circle cx="11" cy="30" r="6" fill={sig === 'amber' ? '#f59e0b' : '#451a03'} filter={sig === 'amber' ? 'url(#glowAmber)' : undefined} />
              <circle cx="11" cy="48" r="6" fill={sig === 'green' ? '#10b981' : '#022c22'} filter={sig === 'green' ? 'url(#glowGreen)' : undefined} />
            </g>
          );
        })()}

        {/* South Signal Head (located at (383, 410) facing South approach) */}
        {(() => {
          const sig = getRoadSignal('South');
          return (
            <g transform="translate(383, 410)">
              <rect x="0" y="0" width="22" height="60" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <circle cx="11" cy="12" r="6" fill={sig === 'red' ? '#ef4444' : '#450a0a'} stroke="#991b1b" strokeWidth="0.5" />
              <circle cx="11" cy="30" r="6" fill={sig === 'amber' ? '#f59e0b' : '#451a03'} filter={sig === 'amber' ? 'url(#glowAmber)' : undefined} />
              <circle cx="11" cy="48" r="6" fill={sig === 'green' ? '#10b981' : '#022c22'} filter={sig === 'green' ? 'url(#glowGreen)' : undefined} />
            </g>
          );
        })()}

        {/* West Signal Head (located at (130, 383) facing West approach) */}
        {(() => {
          const sig = getRoadSignal('West');
          return (
            <g transform="translate(130, 383)">
              <rect x="0" y="0" width="60" height="22" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <circle cx="12" cy="11" r="6" fill={sig === 'red' ? '#ef4444' : '#450a0a'} stroke="#991b1b" strokeWidth="0.5" />
              <circle cx="30" cy="11" r="6" fill={sig === 'amber' ? '#f59e0b' : '#451a03'} filter={sig === 'amber' ? 'url(#glowAmber)' : undefined} />
              <circle cx="48" cy="11" r="6" fill={sig === 'green' ? '#10b981' : '#022c22'} filter={sig === 'green' ? 'url(#glowGreen)' : undefined} />
            </g>
          );
        })()}

        {/* East Signal Head (located at (410, 195) facing East approach) */}
        {(() => {
          const sig = getRoadSignal('East');
          return (
            <g transform="translate(410, 195)">
              <rect x="0" y="0" width="60" height="22" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <circle cx="48" cy="11" r="6" fill={sig === 'red' ? '#ef4444' : '#450a0a'} stroke="#991b1b" strokeWidth="0.5" />
              <circle cx="30" cy="11" r="6" fill={sig === 'amber' ? '#f59e0b' : '#451a03'} filter={sig === 'amber' ? 'url(#glowAmber)' : undefined} />
              <circle cx="12" cy="11" r="6" fill={sig === 'green' ? '#10b981' : '#022c22'} filter={sig === 'green' ? 'url(#glowGreen)' : undefined} />
            </g>
          );
        })()}

        {/* 8. Labels and Queue badges on each approach */}
        {/* North Label & Queue Badge */}
        <g transform="translate(250, 40)">
          <rect x="-10" y="-18" width="120" height="34" rx="6" fill="#0f172a" stroke={activeRoad === 'North' ? '#10b981' : '#334155'} strokeWidth="1.5" />
          <text x="50" y="-2" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">NORTH ROAD</text>
          <text x="50" y="10" textAnchor="middle" fill="#94a3b8" fontSize="9">Queue: {queues.North || 0} veh</text>
        </g>

        {/* South Label & Queue Badge */}
        <g transform="translate(250, 560)">
          <rect x="-10" y="-18" width="120" height="34" rx="6" fill="#0f172a" stroke={activeRoad === 'South' ? '#10b981' : '#334155'} strokeWidth="1.5" />
          <text x="50" y="-2" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">SOUTH ROAD</text>
          <text x="50" y="10" textAnchor="middle" fill="#94a3b8" fontSize="9">Queue: {queues.South || 0} veh</text>
        </g>

        {/* West Label & Queue Badge */}
        <g transform="translate(60, 290)">
          <rect x="-40" y="-18" width="100" height="34" rx="6" fill="#0f172a" stroke={activeRoad === 'West' ? '#10b981' : '#334155'} strokeWidth="1.5" />
          <text x="10" y="-2" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">WEST ROAD</text>
          <text x="10" y="10" textAnchor="middle" fill="#94a3b8" fontSize="9">Queue: {queues.West || 0} veh</text>
        </g>

        {/* East Label & Queue Badge */}
        <g transform="translate(520, 290)">
          <rect x="-40" y="-18" width="100" height="34" rx="6" fill="#0f172a" stroke={activeRoad === 'East' ? '#10b981' : '#334155'} strokeWidth="1.5" />
          <text x="10" y="-2" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">EAST ROAD</text>
          <text x="10" y="10" textAnchor="middle" fill="#94a3b8" fontSize="9">Queue: {queues.East || 0} veh</text>
        </g>
      </svg>

      {/* Road Cards Bottom Grid */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
        {(['North', 'South', 'East', 'West'] as RoadDirection[]).map((road) => {
          const isActive = activeRoad === road;
          const isStarving = starvingRoads.includes(road);
          const qCount = queues[road] || 0;
          const score = priorityScores[road] || 0;

          return (
            <div
              key={road}
              className={`p-2.5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive
                        ? signalState === 'GREEN'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400'
                        : 'bg-red-500'
                    }`}
                  />
                  {road}
                </span>
                {isStarving && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800">
                    <ShieldAlert className="w-2.5 h-2.5" /> Aging
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Queue: <strong className="text-white font-mono">{qCount}</strong></span>
                {mode === 'adaptive' && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Score: <strong className="text-blue-400">{score.toFixed(2)}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

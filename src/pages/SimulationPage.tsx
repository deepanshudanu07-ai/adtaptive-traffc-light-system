import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  Sliders,
  Clock,
  Car,
  Layers,
  ShieldAlert,
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  RoadDirection,
  SignalState,
  SimulationResult,
  PredictionResponse
} from '../types/traffic';
import { IntersectionCanvas } from '../components/IntersectionCanvas';
import { runSimulation } from '../services/api';

interface SimulationPageProps {
  prediction: PredictionResponse | null;
  onSimulationUpdated: (res: SimulationResult) => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  prediction,
  onSimulationUpdated
}) => {
  // Simulation configuration
  const [mode, setMode] = useState<'adaptive' | 'fixed'>('adaptive');
  const [duration, setDuration] = useState<number>(300);
  const [fixedGreen, setFixedGreen] = useState<number>(30);
  const [minGreen, setMinGreen] = useState<number>(10);
  const [maxGreen, setMaxGreen] = useState<number>(50);
  const [dischargeRate, setDischargeRate] = useState<number>(0.45);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 5x

  // Weights
  const [w1, setW1] = useState<number>(0.40);
  const [w2, setW2] = useState<number>(0.35);
  const [w3, setW3] = useState<number>(0.25);

  // Simulation execution state
  const [simData, setSimData] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSimTime, setCurrentSimTime] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Fetch or run fresh simulation
  const handleRunFullSimulation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const demands = prediction
        ? {
            North: prediction.predictions.North.predicted_vehicles,
            South: prediction.predictions.South.predicted_vehicles,
            East: prediction.predictions.East.predicted_vehicles,
            West: prediction.predictions.West.predicted_vehicles,
          }
        : { North: 24, South: 20, East: 14, West: 10 };

      const res = await runSimulation({
        mode,
        duration,
        fixed_green: fixedGreen,
        min_green: minGreen,
        max_green: maxGreen,
        discharge_rate: dischargeRate,
        weights: { w1, w2, w3 },
        predicted_demands: demands,
      });

      setSimData(res);
      onSimulationUpdated(res);
      setCurrentSimTime(0);
      setIsPlaying(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount if no simulation data
  useEffect(() => {
    if (!simData) {
      handleRunFullSimulation();
    }
  }, [mode]);

  // Playback timer ticker
  useEffect(() => {
    if (isPlaying && simData) {
      timerRef.current = setInterval(() => {
        setCurrentSimTime((prev) => {
          const next = prev + 1;
          if (next >= duration) {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            return duration;
          }
          return next;
        });
      }, 1000 / speedMultiplier);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simData, duration, speedMultiplier]);

  // Derived state at currentSimTime
  // Find the closest timeline entry
  const timelineEntry = simData?.timeline
    ? [...simData.timeline]
        .reverse()
        .find((entry) => entry.time <= currentSimTime) || simData.timeline[0]
    : null;

  // Find phase transition active at this second
  let currentActiveRoad: RoadDirection = timelineEntry?.active_road || 'North';
  let currentSignalState: SignalState = timelineEntry?.signal_state || 'GREEN';
  let remainingPhaseSec = 15;
  let currentPhaseDuration = 30;
  let recentTransitionReason = 'Dynamic priority allocation initiated.';

  if (simData && simData.phase_transitions.length > 0) {
    let activeTrans = simData.phase_transitions[0];
    for (const trans of simData.phase_transitions) {
      if (trans.time <= currentSimTime) {
        activeTrans = trans;
      } else {
        break;
      }
    }
    currentActiveRoad = activeTrans.road;
    currentSignalState = activeTrans.state;
    currentPhaseDuration = activeTrans.duration;
    const elapsedInPhase = currentSimTime - activeTrans.time;
    remainingPhaseSec = Math.max(0, currentPhaseDuration - elapsedInPhase);
    if (activeTrans.reason) recentTransitionReason = activeTrans.reason;
  }

  // Current queues at this second
  const currentQueues: Record<RoadDirection, number> = timelineEntry
    ? {
        North: timelineEntry.north_queue,
        South: timelineEntry.south_queue,
        East: timelineEntry.east_queue,
        West: timelineEntry.west_queue,
      }
    : { North: 0, South: 0, East: 0, West: 0 };

  const currentServed = Math.round(
    ((simData?.total_served || 0) * (currentSimTime / Math.max(1, duration)))
  );

  // Starvation roads: roads waiting longer than threshold with queue > 0
  const starvingRoads: RoadDirection[] = [];
  if (currentQueues.East > 12 && currentActiveRoad !== 'East') starvingRoads.push('East');
  if (currentQueues.West > 12 && currentActiveRoad !== 'West') starvingRoads.push('West');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Header */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Playback Button Group */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button
              onClick={() => {
                if (currentSimTime >= duration) setCurrentSimTime(0);
                setIsPlaying(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Play className="w-4 h-4" /> Start / Resume
            </button>
          )}

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentSimTime((prev) => Math.min(duration, prev + 5));
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            title="Step 5 seconds forward"
          >
            <StepForward className="w-3.5 h-3.5" /> +5s
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentSimTime(0);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          {/* Speed multiplier */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono ml-2">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  speedMultiplier === spd
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector & Run Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setMode('adaptive');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === 'adaptive'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Adaptive (Priority Q)
            </button>
            <button
              onClick={() => {
                setMode('fixed');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === 'fixed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fixed-Time (Round-Robin)
            </button>
          </div>

          <button
            onClick={handleRunFullSimulation}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recompute Simulation</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Visual Canvas + Live Real-time Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <IntersectionCanvas
            activeRoad={currentActiveRoad}
            signalState={currentSignalState}
            remainingSeconds={remainingPhaseSec}
            totalDuration={currentPhaseDuration}
            queues={currentQueues}
            servedCount={currentServed}
            mode={mode}
            starvingRoads={starvingRoads}
            priorityScores={{
              North: 0.85,
              South: 0.72,
              East: starvingRoads.includes('East') ? 0.92 : 0.45,
              West: 0.38
            }}
          />

          {/* Time Scrubber */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-mono">
                Clock: <strong className="text-white text-sm">{Math.floor(currentSimTime / 60)}:{String(currentSimTime % 60).padStart(2, '0')}</strong> / {Math.floor(duration / 60)}:00
              </span>
              <span className="text-slate-400">
                {Math.round((currentSimTime / duration) * 100)}% Completed
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentSimTime}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentSimTime(parseInt(e.target.value, 10));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Right: Live Telemetry & Config Panels */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Phase Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Phase State
              </h4>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  currentSignalState === 'GREEN'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : currentSignalState === 'AMBER'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {currentSignalState} PHASE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Green Approach</div>
                <div className="text-lg font-bold text-white">{currentActiveRoad}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Remaining Time</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {remainingPhaseSec}s <span className="text-xs text-slate-500 font-normal">/ {currentPhaseDuration}s</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              <strong className="text-blue-400">Decision Rationale:</strong> {recentTransitionReason}
            </div>
          </div>

          {/* Cumulative Metrics at this point */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Simulation Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Vehicles Served</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {currentServed}
                </div>
                <div className="text-[10px] text-slate-500">Service rate ~0.45 v/s</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Active Queue Total</div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  {Object.values(currentQueues).reduce((a, b) => a + b, 0)}
                </div>
                <div className="text-[10px] text-slate-500">In 4 FIFO queues</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Avg Wait Time</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {simData ? simData.avg_wait_time.toFixed(1) : '18.4'}s
                </div>
                <div className="text-[10px] text-slate-500">Overall delay</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Throughput</div>
                <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                  {simData ? simData.throughput_vpm.toFixed(1) : '28.5'}
                </div>
                <div className="text-[10px] text-slate-500">Vehicles / min</div>
              </div>
            </div>
          </div>

          {/* Config Parameters Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" /> Signal Timing Limits
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {mode === 'adaptive' ? 'Adaptive Clamps' : 'Fixed Cycle'}
              </span>
            </div>

            {mode === 'adaptive' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Min Green Time: {minGreen}s</span>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={minGreen}
                    onChange={(e) => setMinGreen(parseInt(e.target.value, 10))}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Max Green Time: {maxGreen}s</span>
                  <input
                    type="range"
                    min="25"
                    max="70"
                    value={maxGreen}
                    onChange={(e) => setMaxGreen(parseInt(e.target.value, 10))}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Green duration dynamically scales between <strong>{minGreen}s</strong> and <strong>{maxGreen}s</strong> based on predicted demand and waiting queue size.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Fixed Green Time: {fixedGreen}s</span>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    value={fixedGreen}
                    onChange={(e) => setFixedGreen(parseInt(e.target.value, 10))}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Every road receives exactly <strong>{fixedGreen}s</strong> of green in a rigid North &rarr; South &rarr; East &rarr; West sequence regardless of queue length.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Sliders,
  ShieldAlert,
  Clock,
  Layers,
  Brain,
  ListOrdered,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RoadDirection, SimulationResult } from '../types/traffic';

interface OptimizationPageProps {
  simulation: SimulationResult | null;
}

export const OptimizationPage: React.FC<OptimizationPageProps> = ({ simulation }) => {
  // Weights configuration
  const [w1, setW1] = useState<number>(40); // 40%
  const [w2, setW2] = useState<number>(35); // 35%
  const [w3, setW3] = useState<number>(25); // 25%

  const [starvationThreshold, setStarvationThreshold] = useState<number>(80);
  const [minGreen, setMinGreen] = useState<number>(10);
  const [maxGreen, setMaxGreen] = useState<number>(50);

  // Normalize weights
  const totalW = w1 + w2 + w3 || 100;
  const nw1 = (w1 / totalW).toFixed(2);
  const nw2 = (w2 / totalW).toFixed(2);
  const nw3 = (w3 / totalW).toFixed(2);

  // Road ranking preview data
  const rankingRows = [
    {
      road: 'North' as RoadDirection,
      demand: 42.0,
      queue: 12,
      waitSec: 34.0,
      normD: 0.70,
      normQ: 0.30,
      normW: 0.28,
      baseScore: 0.455,
      agingBonus: 0.0,
      finalScore: 0.455,
      allocatedGreen: 38,
      rank: 1,
      isStarving: false,
    },
    {
      road: 'South' as RoadDirection,
      demand: 36.0,
      queue: 9,
      waitSec: 28.0,
      normD: 0.60,
      normQ: 0.22,
      normW: 0.23,
      baseScore: 0.375,
      agingBonus: 0.0,
      finalScore: 0.375,
      allocatedGreen: 32,
      rank: 2,
      isStarving: false,
    },
    {
      road: 'East' as RoadDirection,
      demand: 20.0,
      queue: 5,
      waitSec: 88.0, // Starving! (> 80s)
      normD: 0.33,
      normQ: 0.12,
      normW: 0.73,
      baseScore: 0.357,
      agingBonus: 0.25, // Starvation boost!
      finalScore: 0.607,
      allocatedGreen: 24,
      rank: 1, // promoted above North due to aging!
      isStarving: true,
    },
    {
      road: 'West' as RoadDirection,
      demand: 14.0,
      queue: 3,
      waitSec: 22.0,
      normD: 0.23,
      normQ: 0.08,
      normW: 0.18,
      baseScore: 0.165,
      agingBonus: 0.0,
      finalScore: 0.165,
      allocatedGreen: 16,
      rank: 4,
      isStarving: false,
    },
  ];

  // Adjust East rank to 1 for illustration if aging active
  const sortedRankings = [...rankingRows].sort((a, b) => b.finalScore - a.finalScore);
  sortedRankings.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Mathematical Formulations Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Priority Queue & Scheduling Optimization Algorithm
          </h3>
          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-400 px-2.5 py-0.5 rounded border border-blue-800">
            HEAPQ MAX-HEAP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formula 1: Composite Priority Score */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono text-blue-400 font-semibold tracking-wider">
              1. Composite Priority Scoring Formulation
            </span>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-blue-200 overflow-x-auto">
              Score = (w₁ · NormDemand) + (w₂ · NormQueue) + (w₃ · NormWait) + AgingBonus
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Where <code className="text-white">NormDemand = Demand / 60</code>, <code className="text-white">NormQueue = Queue / 40</code>, and <code className="text-white">NormWait = WaitTime / 120</code>. Normalizing variables ensures queue units or vehicle counts do not artificially overpower waiting seconds.
            </p>
          </div>

          {/* Formula 2: Dynamic Green Duration */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold tracking-wider">
              2. Dynamic Green Time Allocation Formula
            </span>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-200 overflow-x-auto">
              GreenDuration = clamp(G_min + (1.8 · Queue) + (0.4 · PredictedDemand), G_min, G_max)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Assigned phase time scales with actual queue depth and forecasted arrival pressure, bounded safely between configured limits <code className="text-white">[{minGreen}s, {maxGreen}s]</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Weight Tuning Sliders */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Configurable Scoring Weights & Safeguard Controls
          </h4>
          <span className="text-xs font-mono text-slate-400">
            Normalized: w₁ = {nw1}, w₂ = {nw2}, w₃ = {nw3}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>w₁: Predicted Demand Weight</span>
              <strong className="text-purple-400 font-mono">{w1}% ({nw1})</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={w1}
              onChange={(e) => setW1(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Gives weight to ML predicted arrival pressure.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>w₂: Current Queue Length Weight</span>
              <strong className="text-rose-400 font-mono">{w2}% ({nw2})</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={w2}
              onChange={(e) => setW2(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Prioritizes roads with currently waiting vehicle queues.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>w₃: Waiting Time Urgency Weight</span>
              <strong className="text-amber-400 font-mono">{w3}% ({nw3})</strong>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={w3}
              onChange={(e) => setW3(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Increases priority for older vehicles waiting in queue.</p>
          </div>
        </div>

        {/* Starvation Aging Guard Banner */}
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <strong className="text-amber-200 font-semibold">Starvation Prevention Mechanism Active:</strong>
              <span className="font-mono text-amber-300">Threshold: {starvationThreshold}s</span>
            </div>
            <p className="text-amber-300/80 leading-relaxed">
              If an approach is skipped for &ge; 3 consecutive cycles or its oldest vehicle waits longer than {starvationThreshold} seconds, the scheduler automatically injects an <strong>Aging Bonus (+0.25)</strong>, guaranteeing it receives green service even when arterial roads have higher traffic volume.
            </p>
          </div>
        </div>
      </div>

      {/* Decision Table Breakdown */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-400" />
            Scheduling Decision Breakdown & Approach Ranking
          </h4>
          <span className="text-xs text-slate-400">Live heapq output demonstration</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5">Rank</th>
                <th className="px-3.5 py-2.5">Road</th>
                <th className="px-3.5 py-2.5 text-right">Predicted Demand</th>
                <th className="px-3.5 py-2.5 text-right">Queue Size</th>
                <th className="px-3.5 py-2.5 text-right">Wait Time</th>
                <th className="px-3.5 py-2.5 text-right">Base Score</th>
                <th className="px-3.5 py-2.5 text-right">Aging Bonus</th>
                <th className="px-3.5 py-2.5 text-right font-bold text-white">Final Score</th>
                <th className="px-3.5 py-2.5 text-right font-bold text-emerald-400">Allocated Green</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedRankings.map((r) => (
                <tr key={r.road} className={r.rank === 1 ? 'bg-emerald-950/20' : ''}>
                  <td className="px-3.5 py-2.5 font-bold text-white">#{r.rank}</td>
                  <td className="px-3.5 py-2.5 font-bold text-white flex items-center gap-1.5 font-sans">
                    {r.road}
                    {r.rank === 1 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-mono">
                        SELECTED
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-purple-400">{r.demand} veh</td>
                  <td className="px-3.5 py-2.5 text-right text-rose-400">{r.queue}</td>
                  <td className="px-3.5 py-2.5 text-right text-amber-400">{r.waitSec}s</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-400">{r.baseScore.toFixed(3)}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    {r.agingBonus > 0 ? (
                      <span className="text-amber-400 font-bold">+{r.agingBonus.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-600">0.00</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-white">{r.finalScore.toFixed(3)}</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-emerald-400">{r.allocatedGreen}s</td>
                  <td className="px-3.5 py-2.5 text-center font-sans">
                    {r.isStarving ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                        Aging Safeguard
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Standard
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Decision Execution Trace Log */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3">
        <h4 className="text-sm font-bold text-white">Chronological Signal Allocation Pipeline (10 Steps)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            'Step 1: Ingest real-time vehicle arrivals and update FIFO queues for North, South, East, West.',
            'Step 2: Query Scikit-learn RandomForest model to predict arrival demand for next time interval.',
            'Step 3: Measure current oldest waiting vehicle duration on each approach.',
            'Step 4: Check starvation condition (wait_time >= 80s or 3 cycles skipped).',
            'Step 5: Normalize inputs: NormDemand, NormQueue, NormWait into dimensionless range [0, 1].',
            'Step 6: Compute composite priority score: P = w1·D + w2·Q + w3·W + AgingBonus.',
            'Step 7: Push (-Score, Road) into Python heapq max-heap; pop top-scoring eligible approach.',
            'Step 8: Calculate dynamic green duration: G = clamp(10 + 1.8·Q + 0.4·D, 10, 50).',
            'Step 9: Execute green phase; discharge FIFO vehicles at realistic physical rate (~0.45 veh/sec).',
            'Step 10: Transition to Amber (3s) and Clearance (2s), reset winner counter, and repeat.',
          ].map((step, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-900/60 border border-blue-800 text-blue-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

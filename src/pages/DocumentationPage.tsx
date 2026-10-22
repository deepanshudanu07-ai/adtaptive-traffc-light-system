import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Brain,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Code2,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { fetchFullReport } from '../services/api';

export const DocumentationPage: React.FC = () => {
  const [openVivaIndex, setOpenVivaIndex] = useState<number | null>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleDownloadJSONReport = async () => {
    setIsExporting(true);
    try {
      const report = await fetchFullReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traffic_optimizer_academic_report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Report export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const vivaQuestions = [
    {
      q: '1. What is the fundamental problem with traditional fixed-time traffic signals?',
      a: 'Traditional fixed-time signals cycle through predefined phase durations (e.g., 30s per approach) in a fixed round-robin order regardless of actual traffic demand. During asymmetric congestion—such as morning rush hour on an arterial commuter corridor—they grant empty roads green time while congested roads endure unnecessary waiting queues and excessive idling delays.',
    },
    {
      q: '2. How does the Adaptive Traffic Signal Optimizer solve this problem?',
      a: 'Our system combines machine learning demand forecasting with priority-based queue scheduling. It predicts future vehicle arrivals using a Scikit-learn Random Forest model, tracks waiting vehicles in FIFO queues, computes composite priority scores via a heapq Priority Queue, and dynamically assigns green durations clamped between minimum and maximum bounds.',
    },
    {
      q: '3. Why is a FIFO Queue used to model waiting vehicles on each road?',
      a: 'A FIFO (First-In, First-Out) queue models the physical reality of a road lane: the first vehicle that stops at the intersection line is the first vehicle that discharges when the signal turns green. In Python, this is implemented using collections.deque with enqueue (append) and dequeue (popleft) operations running in O(1) time.',
    },
    {
      q: '4. How is the Priority Queue implemented in Python and why?',
      a: 'The Priority Queue is implemented using Python’s built-in heapq library. Since heapq provides a min-heap by default, we insert negated priority scores (-score, road) to create a max-heap. This guarantees O(log N) insertion and O(log N) extraction of the highest-priority road approach.',
    },
    {
      q: '5. What is the exact mathematical formula used to calculate the Priority Score?',
      a: 'Priority Score = (w1 · NormDemand) + (w2 · NormQueue) + (w3 · NormWait) + AgingBonus. Where NormDemand = Demand / 60, NormQueue = Queue / 40, and NormWait = WaitTime / 120. Configurable weights (w1=0.40, w2=0.35, w3=0.25) sum to 1.0, ensuring balanced influence without one metric dominating due to measurement units.',
    },
    {
      q: '6. What is "Starvation" and how does the aging mechanism prevent it?',
      a: 'Starvation occurs when a secondary road with low vehicle volume is continuously skipped because heavy arterial roads constantly generate higher base scores. To prevent starvation, our system tracks elapsed wait time and skipped cycles: if an approach waits longer than the starvation threshold (e.g., 80 seconds) or is skipped for 3 consecutive cycles, an Aging Bonus (+0.25) is added to elevate its priority and guarantee green service.',
    },
    {
      q: '7. How is the dynamic green-light duration calculated?',
      a: 'Dynamic green time is computed as: GreenDuration = clamp(G_min + (1.8 · Queue) + (0.4 · PredictedDemand), G_min, G_max). If a road has a large queue, it receives longer green time (up to G_max = 50s); if the queue clears quickly, green time is minimized (down to G_min = 10s) to allow waiting cross-traffic to move.',
    },
    {
      q: '8. Why did you choose Random Forest Regressor over Linear Regression or Neural Networks?',
      a: 'Random Forest Regressor is an ensemble of decision trees that handles non-linear diurnal patterns (such as morning and evening peak curves) and multi-feature interactions without requiring feature scaling. It is robust to outliers, avoids overfitting through bootstrap aggregation, and provides transparent feature importance rankings suitable for an academic presentation.',
    },
    {
      q: '9. Why must time-series data be split chronologically rather than with random train_test_split?',
      a: 'Random splitting mixes future observations into the training set, causing "lookahead data leakage" where the model memorizes future trends. A chronological split (first 80% train, last 20% test) strictly evaluates the model on unseen future periods, replicating real-world operational deployment.',
    },
    {
      q: '10. Why is the term "accuracy" incorrect for evaluating regression models?',
      a: 'Accuracy is a classification metric measuring the proportion of correct categorical labels (e.g., Cat vs. Dog). For regression tasks predicting continuous numeric values (like vehicle count), we evaluate error distances: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and the Coefficient of Determination (R²).',
    },
    {
      q: '11. What is the difference between MAE and RMSE?',
      a: 'MAE (Mean Absolute Error) is the average absolute difference between predicted and actual vehicle counts, weighting all errors equally. RMSE (Root Mean Squared Error) squares the errors before averaging and taking the root, which heavily penalizes large errors or extreme forecast outliers.',
    },
    {
      q: '12. What does an R² score of 0.88 mean in simple terms?',
      a: 'An R² of 0.88 means that 88% of the variance in traffic demand is explained by the independent variables in the model (hour of day, day of week, lag counts, and road direction). Only 12% is unexplained variance or stochastic noise.',
    },
    {
      q: '13. How do you ensure the comparison between Fixed-Time and Adaptive control is fair?',
      a: 'Both controllers are simulated across the exact same simulation duration with the EXACT SAME pre-generated vehicle arrival schedule, identical random seed (seed=42), and the same vehicle discharge rate (~0.45 vehicles/second). Neither controller has an artificial advantage in traffic volume.',
    },
    {
      q: '14. What service rate assumption is used in the simulation?',
      a: 'Vehicles do not disappear instantaneously when a signal turns green. We model a realistic physical discharge rate of 0.45 vehicles per second (approximately 1 vehicle discharged every 2.2 seconds during green), reflecting vehicle startup inertia and reaction time.',
    },
    {
      q: '15. What are the key limitations of this project?',
      a: 'The system is evaluated in software simulation rather than a physical road network. It assumes standard vehicle headway without modeling pedestrians, emergency vehicle preemption, bad weather traction loss, or illegal intersection blockages. However, its modular architecture allows integration with IoT inductive loop sensors in future work.',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Actions */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Project Documentation & University Viva Defense</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
              ACADEMIC SPECIFICATION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete architectural methodology, mathematical formulations, data structures, and 15 viva defense questions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print Summary
          </button>
          <button
            onClick={handleDownloadJSONReport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating Report...' : 'Export Academic JSON Report'}</span>
          </button>
        </div>
      </div>

      {/* System Architecture Block Diagram */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          End-to-End System Architecture Pipeline
        </h4>

        {/* Visual Pipeline flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
            <div className="w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-bold mx-auto flex items-center justify-center font-mono">
              1
            </div>
            <strong className="text-white block">Traffic Data Ingestion</strong>
            <p className="text-[11px] text-slate-400">30-day observations or CSV upload with schema validation</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
            <div className="w-6 h-6 rounded-full bg-purple-950 text-purple-400 font-bold mx-auto flex items-center justify-center font-mono">
              2
            </div>
            <strong className="text-white block">Feature Engineering</strong>
            <p className="text-[11px] text-slate-400">Lags (t-1, t-2), hour of day, day of week, directional encoding</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
            <div className="w-6 h-6 rounded-full bg-indigo-950 text-indigo-400 font-bold mx-auto flex items-center justify-center font-mono">
              3
            </div>
            <strong className="text-white block">Machine Learning</strong>
            <p className="text-[11px] text-slate-400">RandomForestRegressor predicting demand per approach</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
            <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 font-bold mx-auto flex items-center justify-center font-mono">
              4
            </div>
            <strong className="text-white block">Priority Queue Scheduler</strong>
            <p className="text-[11px] text-slate-400">Heapq max-heap with starvation aging safeguard</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
            <div className="w-6 h-6 rounded-full bg-amber-950 text-amber-400 font-bold mx-auto flex items-center justify-center font-mono">
              5
            </div>
            <strong className="text-white block">Simulation & Benchmark</strong>
            <p className="text-[11px] text-slate-400">Adaptive vs Fixed-Time comparison on identical arrivals</p>
          </div>
        </div>
      </div>

      {/* Project Academic Abstract & Methodology */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3 text-xs leading-relaxed">
          <h4 className="text-sm font-bold text-white">Project Abstract & Objectives</h4>
          <p className="text-slate-300">
            Urban traffic congestion produces significant economic loss and increased vehicle emissions. This project implements an intelligent, software-driven <strong>Adaptive Traffic Signal Optimizer</strong> for a four-way intersection (North, South, East, West).
          </p>
          <p className="text-slate-300">
            By analyzing 30 days of historical interval observations, the system leverages a Scikit-learn Random Forest regression model to anticipate approaching traffic volume. Individual waiting vehicles are modeled with <strong>FIFO Queues</strong>, and scheduling decisions are governed by a <strong>Priority Queue</strong> with starvation safeguards to dynamically allocate green times between configured minimum and maximum bounds.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3 text-xs leading-relaxed">
          <h4 className="text-sm font-bold text-white">Core Algorithms & Data Structures</h4>
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-blue-400 font-mono">FIFO Queue:</strong> First-In, First-Out queue (<code className="text-slate-300">collections.deque</code>) representing vehicles stopped at intersection stop lines.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-emerald-400 font-mono">Heapq Max-Heap:</strong> Evaluates composite priority score in O(log N) time to select the road in greatest need of green service.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <strong className="text-purple-400 font-mono">RandomForestRegressor:</strong> Forecasts continuous vehicle counts from temporal patterns and lag observations without lookahead leakage.
            </div>
          </div>
        </div>
      </div>

      {/* 15 University Viva Q&A Accordion */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            University Viva Voce Defense Guide (15 Key Questions & Answers)
          </h4>
          <span className="text-xs text-slate-400">Click question to reveal model answer</span>
        </div>

        <div className="space-y-2">
          {vivaQuestions.map((item, idx) => {
            const isOpen = openVivaIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenVivaIndex(isOpen ? null : idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-900/60 transition-colors"
                >
                  <span className="leading-snug">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-3.5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-900/30">
                    <p className="mt-2 text-slate-300 font-sans">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

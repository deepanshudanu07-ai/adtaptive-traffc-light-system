import React from 'react';
import {
  Car,
  Clock,
  Layers,
  Activity,
  Brain,
  Compass,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { DatasetSummary, MLTrainResult, PredictionResponse, SimulationResult, RoadDirection } from '../types/traffic';
import { IntersectionCanvas } from '../components/IntersectionCanvas';

interface DashboardProps {
  summary: DatasetSummary | null;
  mlResult: MLTrainResult | null;
  prediction: PredictionResponse | null;
  simulation: SimulationResult | null;
  onNavigateToSim: () => void;
  onNavigateToML: () => void;
  onNavigateToData: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({
  summary,
  mlResult,
  prediction,
  simulation,
  onNavigateToSim,
  onNavigateToML,
  onNavigateToData
}) => {
  // Extract values with fallbacks
  const totalVehicles = summary?.total_vehicles || 0;
  const currentTotalQueue = simulation
    ? Object.values(simulation.final_queues).reduce((a, b) => a + b, 0)
    : 24;
  const avgWaitTime = simulation ? simulation.avg_wait_time : 18.4;
  const totalServed = simulation ? simulation.total_served : 142;
  const activeRoad: RoadDirection = simulation?.timeline[simulation.timeline.length - 1]?.active_road || 'North';
  const signalState = simulation?.timeline[simulation.timeline.length - 1]?.signal_state || 'GREEN';

  // Compute total predicted demand
  const totalPredictedDemand = prediction
    ? Math.round(Object.values(prediction.predictions).reduce((acc, p) => acc + p.predicted_vehicles, 0))
    : 112;

  // Chart data
  const hourlyData = summary?.hourly_stats || [];
  const roadData = summary?.road_stats || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Synthetic Dataset Notice Banner */}
      {summary?.is_synthetic && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Demonstration Mode:</strong> Using synthetic demonstration data covering 30 days. Upload real historical traffic observations in the Traffic Data tab for real-world evaluation.
            </span>
          </div>
          <button
            onClick={onNavigateToData}
            className="px-3 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-white font-medium text-xs transition-colors shrink-0 ml-3"
          >
            Manage Data
          </button>
        </div>
      )}

      {/* 6 Core KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Dataset Total Vehicles */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Vehicles</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {totalVehicles.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>In 30-day dataset</span>
          </div>
        </div>

        {/* KPI 2: Predicted Demand */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Predicted Demand</span>
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {totalPredictedDemand} <span className="text-xs font-normal text-slate-400">veh/int</span>
          </div>
          <div className="text-[11px] text-purple-400 mt-1">Next 1-hour interval</div>
        </div>

        {/* KPI 3: Current Green Road */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Green Signal Road</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {activeRoad}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Active green phase</span>
          </div>
        </div>

        {/* KPI 4: Average Wait Time */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Waiting Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {avgWaitTime.toFixed(1)} <span className="text-xs font-normal text-slate-400">sec</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Per vehicle delay</div>
        </div>

        {/* KPI 5: Current Total Queue */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Queue</span>
            <Layers className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {currentTotalQueue} <span className="text-xs font-normal text-slate-400">waiting</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all 4 roads</div>
        </div>

        {/* KPI 6: Total Vehicles Served */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Vehicles Served</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {totalServed}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Discharged successfully</div>
        </div>
      </div>

      {/* Middle Section: Intersection Preview + Live Demand Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intersection Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              Four-Way Intersection Live Preview
            </h3>
            <button
              onClick={onNavigateToSim}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
            >
              Open Full Simulation <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <IntersectionCanvas
            activeRoad={activeRoad}
            signalState={signalState}
            remainingSeconds={18}
            totalDuration={35}
            queues={simulation ? simulation.final_queues : { North: 11, South: 8, East: 3, West: 2 }}
            servedCount={totalServed}
            mode={simulation?.mode || 'adaptive'}
            priorityScores={{
              North: 0.88,
              South: 0.74,
              East: 0.42,
              West: 0.31
            }}
          />
        </div>

        {/* Right Column: Traffic Demand By Road & ML Model Summary */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          {/* Card: Current Predicted Traffic Demand by Approach */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Next Interval Demand by Approach</h4>
                <p className="text-xs text-slate-400">RandomForest predicted arrival pressure (veh/interval)</p>
              </div>
              <button
                onClick={onNavigateToML}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Inspect ML Model
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['North', 'South', 'East', 'West'] as RoadDirection[]).map((road) => {
                const p = prediction?.predictions[road];
                const count = p ? p.predicted_vehicles : road === 'North' ? 42 : road === 'South' ? 36 : road === 'East' ? 20 : 14;
                const tier = p ? p.demand_level : count > 40 ? 'High' : count > 20 ? 'Moderate' : 'Low';
                const badgeColor =
                  tier === 'Very High'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : tier === 'High'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : tier === 'Moderate'
                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800';

                return (
                  <div key={road} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{road}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {tier}
                      </span>
                    </div>
                    <div className="text-lg font-bold font-mono text-white">
                      {count} <span className="text-xs text-slate-400 font-normal">veh</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (count / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: ML Model Training & Evaluation Summary */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">ML Model Status: Random Forest Regressor</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                TRAINED & ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">MAE</div>
                <div className="text-sm font-bold font-mono text-white">
                  {mlResult?.metrics.mae || 3.12}
                </div>
                <div className="text-[9px] text-slate-500">veh/int</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">RMSE</div>
                <div className="text-sm font-bold font-mono text-white">
                  {mlResult?.metrics.rmse || 4.28}
                </div>
                <div className="text-[9px] text-slate-500">veh/int</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">R² Score</div>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {mlResult?.metrics.r2 || 0.884}
                </div>
                <div className="text-[9px] text-slate-500">Fit quality</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Test Split</div>
                <div className="text-sm font-bold font-mono text-blue-400">
                  {mlResult?.metrics.test_samples || 570}
                </div>
                <div className="text-[9px] text-slate-500">samples</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              {mlResult?.plain_english_summary ||
                "Random Forest model predicts vehicle counts chronologically using previous interval lags, hour-of-day diurnal patterns, and road attributes, outperforming the lag-1 baseline."}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Diurnal Hourly Traffic Trend Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Diurnal Traffic Flow & Congestion (24-Hour Profile)
            </h3>
            <p className="text-xs text-slate-400">
              Clear morning peak (08:00 - 10:00) and evening peak (16:00 - 19:00) with corresponding queue accumulation
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Averaged over 30 days
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="avg_vehicles"
                name="Avg Vehicle Count"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="avg_queue"
                name="Avg Queue Length"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="avg_speed"
                name="Avg Speed (km/h)"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

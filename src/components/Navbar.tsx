import React from 'react';
import { Menu, Play, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { NavTab } from './Sidebar';

interface NavbarProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onQuickSimulate?: () => void;
  onTrainML?: () => void;
  isMLTrained?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onQuickSimulate,
  onTrainML,
  isMLTrained = false,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Traffic System Overview',
      subtitle: 'Real-time intersection KPIs, road demand, and operational status',
    },
    simulation: {
      title: 'Four-Way Intersection Simulation',
      subtitle: 'Dynamic priority queue signal control vs. fixed cycle comparison',
    },
    data: {
      title: 'Traffic Dataset Management',
      subtitle: '30-day historical observations, CSV ingestion, and EDA profiling',
    },
    ml: {
      title: 'Machine Learning Engine',
      subtitle: 'Chronological lag-feature RandomForestRegressor for demand forecasting',
    },
    optimization: {
      title: 'Signal Optimization & Heapq Scheduler',
      subtitle: 'Priority formulation, starvation aging safeguards, and dynamic green allocation',
    },
    comparison: {
      title: 'Performance Benchmark: Fixed-Time vs. Adaptive',
      subtitle: 'Identical arrival stream evaluation of waiting times and vehicle throughput',
    },
    docs: {
      title: 'Academic Documentation & Viva Defense',
      subtitle: 'System architecture, formulations, code logic, and 15+ student viva Q&As',
    },
  };

  const current = titles[activeTab] || titles.dashboard;

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{current.title}</h2>
          <p className="text-xs text-slate-400 hidden sm:block">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isMLTrained ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Random Forest Trained</span>
          </div>
        ) : (
          onTrainML && (
            <button
              onClick={onTrainML}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Train Model</span>
            </button>
          )
        )}

        {onQuickSimulate && (
          <button
            onClick={onQuickSimulate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run Simulation</span>
          </button>
        )}
      </div>
    </header>
  );
};

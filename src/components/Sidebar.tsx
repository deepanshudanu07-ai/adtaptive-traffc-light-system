import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Database,
  BrainCircuit,
  Sliders,
  Scale,
  FileText,
  TrafficCone
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'simulation'
  | 'data'
  | 'ml'
  | 'optimization'
  | 'comparison'
  | 'docs';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'simulation' as NavTab, label: 'Live Simulation', icon: Cpu, badge: 'Interactive' },
    { id: 'data' as NavTab, label: 'Traffic Data', icon: Database, badge: '30 Days' },
    { id: 'ml' as NavTab, label: 'Machine Learning', icon: BrainCircuit, badge: 'RandomForest' },
    { id: 'optimization' as NavTab, label: 'Signal Optimization', icon: Sliders, badge: 'Priority Q' },
    { id: 'comparison' as NavTab, label: 'Performance Comparison', icon: Scale, badge: 'Benchmark' },
    { id: 'docs' as NavTab, label: 'Reports & Viva Docs', icon: FileText, badge: 'Academic' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Title & Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <TrafficCone className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-snug">
              Adaptive Traffic Signal
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">BCA AI & DS Final Project</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Academic Details Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Stack:</span>
              <span className="text-white font-mono font-semibold">Python 3 + React</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>ML Algorithm:</span>
              <span className="text-blue-400 font-mono">Random Forest</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Structures:</span>
              <span className="text-emerald-400 font-mono">FIFO Q + Heapq</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

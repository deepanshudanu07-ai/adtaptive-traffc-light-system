import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  BarChart3,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { DatasetSummary, TrafficRecord, RoadDirection } from '../types/traffic';
import {
  fetchDatasetSummary,
  fetchDatasetTable,
  generateDataset,
  uploadDataset
} from '../services/api';

interface TrafficDataPageProps {
  summary: DatasetSummary | null;
  onSummaryUpdated: (s: DatasetSummary) => void;
}

export const TrafficDataPage: React.FC<TrafficDataPageProps> = ({
  summary,
  onSummaryUpdated
}) => {
  // Table view state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedRoadFilter, setSelectedRoadFilter] = useState<RoadDirection | 'All'>('All');
  const [tableData, setTableData] = useState<{
    page: number;
    pageSize: number;
    total_pages: number;
    total_rows: number;
    records: TrafficRecord[];
  } | null>(null);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    details?: any;
  }>({ type: null, message: '' });

  // Generator settings
  const [synthDays, setSynthDays] = useState<number>(30);
  const [synthSeed, setSynthSeed] = useState<number>(42);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Load paginated table records
  const loadTableData = async () => {
    setIsTableLoading(true);
    try {
      const road = selectedRoadFilter === 'All' ? undefined : selectedRoadFilter;
      const res = await fetchDatasetTable(page, pageSize, road);
      setTableData(res);
    } catch (err: any) {
      console.error('Error loading table page:', err);
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    loadTableData();
  }, [page, pageSize, selectedRoadFilter]);

  // Handle file drop / upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const content = await file.text();
      const res = await uploadDataset(content, file.name);

      if (res.success) {
        setUploadStatus({
          type: 'success',
          message: res.message || 'Dataset uploaded, validated, and cleaned successfully.',
          details: res.stats?.clean_report,
        });
        if (res.stats) {
          onSummaryUpdated(res.stats);
        }
        setPage(1);
        loadTableData();
      } else {
        setUploadStatus({
          type: 'error',
          message: res.error || 'Failed to parse and validate CSV.',
          details: res,
        });
      }
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Error reading CSV file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Re-generate synthetic dataset
  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const newSummary = await generateDataset(synthDays, synthSeed);
      onSummaryUpdated(newSummary);
      setPage(1);
      loadTableData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const roadStats = summary?.road_stats || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Current Active Dataset:</h3>
              <span className="font-mono text-xs text-blue-300 font-semibold">
                {summary?.dataset_name || 'sample_traffic.csv'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${summary?.is_synthetic ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                {summary?.is_synthetic ? 'Synthetic Demo' : 'Real Ingested'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {summary?.notice || 'Covering 30 days of interval observations for North, South, East, and West.'}
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/dataset/sample-template"
            download="traffic_sample_template.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Sample Template
          </a>
          <a
            href="/api/dataset/download"
            download="current_traffic_dataset.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Download Active CSV
          </a>
        </div>
      </div>

      {/* Upload and Synthetic Generator Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Custom CSV Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Upload Real Historical CSV
            </h4>
            <span className="text-[11px] text-slate-400">Schema validated</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your own traffic observations. Required fields: <code className="text-blue-300 font-mono">timestamp</code>, <code className="text-blue-300 font-mono">road</code>, <code className="text-blue-300 font-mono">vehicle_count</code>, <code className="text-blue-300 font-mono">average_speed</code>, <code className="text-blue-300 font-mono">queue_length</code>.
          </p>

          <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/40 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-medium text-slate-200">
              {uploadedFile ? uploadedFile.name : 'Click to select or drag CSV file'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">UTF-8 encoded .csv format</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {uploadStatus.type && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                uploadStatus.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-200'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{uploadStatus.message}</p>
                {uploadStatus.details && uploadStatus.details.duplicates_removed !== undefined && (
                  <p className="text-[11px] opacity-80">
                    Cleaned: {uploadStatus.details.duplicates_removed} duplicates removed, {uploadStatus.details.missing_values_imputed} missing fields imputed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Synthetic Demonstration Generator Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Synthetic Dataset Generator
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Seed reproducible</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Re-generate approximately 30 days of hourly observations with realistic diurnal morning & evening peaks, weekend reductions, and directional traffic variation.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Time Horizon (Days)</label>
              <input
                type="number"
                min="7"
                max="60"
                value={synthDays}
                onChange={(e) => setSynthDays(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Random Seed</label>
              <input
                type="number"
                value={synthSeed}
                onChange={(e) => setSynthSeed(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generate Fresh Synthetic Data</span>
          </button>
        </div>
      </div>

      {/* EDA Breakdown Charts: Traffic & Queue by Road */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Exploratory Data Analysis: Directional Traffic Distribution
            </h4>
            <p className="text-xs text-slate-400">
              North and South corridors carry higher commuter volume than East and West cross-streets
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roadStats} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="road" stroke="#64748b" fontSize={11} />
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
              <Bar dataKey="avg_vehicles" name="Avg Vehicles / Interval" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg_queue" name="Avg Queue Length" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg_speed" name="Avg Speed (km/h)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Paginated Dataset Records Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-slate-400" />
            <h4 className="text-sm font-bold text-white">Dataset Records Inspector</h4>
            <span className="text-xs font-mono text-slate-400">
              ({tableData?.total_rows || 0} total observations)
            </span>
          </div>

          {/* Road Filter & Page Size */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['All', 'North', 'South', 'East', 'West'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRoadFilter(r);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedRoadFilter === r
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">Day</th>
                <th className="px-3 py-2.5">Road</th>
                <th className="px-3 py-2.5 text-right">Vehicles</th>
                <th className="px-3 py-2.5 text-right">Queue</th>
                <th className="px-3 py-2.5 text-right">Speed (km/h)</th>
                <th className="px-3 py-2.5">Lane</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tableData?.records && tableData.records.length > 0 ? (
                tableData.records.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 text-slate-300">{row.timestamp}</td>
                    <td className="px-3 py-2 text-slate-400">{row.time}</td>
                    <td className="px-3 py-2 text-slate-400 font-sans">{row.day}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-white">{row.road}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-blue-400">
                      {row.vehicle_count}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-400">
                      {row.queue_length}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-400">
                      {row.average_speed}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{row.lane}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {isTableLoading ? 'Loading records...' : 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{tableData?.total_pages || 1}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(tableData?.total_pages || 1, p + 1))}
              disabled={page >= (tableData?.total_pages || 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

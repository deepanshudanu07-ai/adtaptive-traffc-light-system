import {
  DatasetSummary,
  MLTrainResult,
  PredictionResponse,
  SimulationResult,
  ComparisonResult,
  RoadDirection,
  TrafficRecord
} from '../types/traffic';

export async function fetchDatasetSummary(): Promise<DatasetSummary> {
  const res = await fetch('/api/dataset/summary');
  if (!res.ok) throw new Error('Failed to fetch dataset summary');
  const data = await res.json();
  return data.stats;
}

export async function fetchDatasetTable(
  page: number = 1,
  pageSize: number = 20,
  road?: RoadDirection
): Promise<{
  page: number;
  pageSize: number;
  total_pages: number;
  total_rows: number;
  records: TrafficRecord[];
}> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (road) params.set('road', road);
  const res = await fetch(`/api/dataset/table?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch dataset records');
  return res.json();
}

export async function generateDataset(days: number = 30, seed: number = 42): Promise<DatasetSummary> {
  const res = await fetch('/api/dataset/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, seed }),
  });
  if (!res.ok) throw new Error('Failed to generate dataset');
  const data = await res.json();
  return data.stats;
}

export async function uploadDataset(
  content: string,
  filename: string,
  columnMapping?: Record<string, string>
): Promise<{ success: boolean; error?: string; message?: string; stats?: DatasetSummary }> {
  const res = await fetch('/api/dataset/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename, column_mapping: columnMapping }),
  });
  return res.json();
}

export async function trainMLModel(): Promise<MLTrainResult> {
  const res = await fetch('/api/ml/train', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to train model');
  return res.json();
}

export async function predictTraffic(
  hour: number = 8,
  dayOfWeek: number = 2,
  recentTraffic?: any
): Promise<PredictionResponse> {
  const res = await fetch('/api/ml/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hour, day_of_week: dayOfWeek, recent_traffic: recentTraffic }),
  });
  if (!res.ok) throw new Error('Failed to generate traffic predictions');
  return res.json();
}

export async function runSimulation(params: {
  mode: 'adaptive' | 'fixed';
  duration?: number;
  fixed_green?: number;
  min_green?: number;
  max_green?: number;
  discharge_rate?: number;
  seed?: number;
  weights?: { w1: number; w2: number; w3: number };
  predicted_demands?: Record<string, number>;
}): Promise<SimulationResult> {
  const res = await fetch('/api/simulation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Simulation failed to run');
  return res.json();
}

export async function runComparison(params: {
  duration?: number;
  seed?: number;
  weights?: { w1: number; w2: number; w3: number };
  arrival_rates?: Record<string, number>;
}): Promise<ComparisonResult> {
  const res = await fetch('/api/simulation/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Simulation comparison failed');
  return res.json();
}

export async function fetchFullReport(): Promise<any> {
  const res = await fetch('/api/reports/full');
  if (!res.ok) throw new Error('Failed to fetch full report');
  return res.json();
}

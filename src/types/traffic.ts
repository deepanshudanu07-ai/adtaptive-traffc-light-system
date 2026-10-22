export type RoadDirection = 'North' | 'South' | 'East' | 'West';
export type SignalState = 'GREEN' | 'AMBER' | 'CLEARANCE' | 'RED';

export interface RoadSummary {
  road: RoadDirection;
  total_vehicles: number;
  avg_vehicles: number;
  avg_queue: number;
  max_queue: number;
  avg_speed: number;
}

export interface HourlyStat {
  hour: number;
  label: string;
  avg_vehicles: number;
  avg_queue: number;
  avg_speed: number;
}

export interface WeekdayStats {
  weekday_avg_vehicles: number;
  weekend_avg_vehicles: number;
  weekday_avg_queue: number;
  weekend_avg_queue: number;
}

export interface DatasetSummary {
  total_records: number;
  total_vehicles: number;
  avg_speed: number;
  avg_queue: number;
  max_queue: number;
  is_synthetic: boolean;
  dataset_name: string;
  notice: string;
  road_stats: RoadSummary[];
  hourly_stats: HourlyStat[];
  weekday_stats: WeekdayStats;
  clean_report: Record<string, any>;
}

export interface TrafficRecord {
  timestamp: string;
  time: string;
  day: string;
  road: RoadDirection;
  vehicle_count: number;
  average_speed: number;
  queue_length: number;
  lane: string;
}

export interface MLMetrics {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
  train_samples: number;
  test_samples: number;
  model_type: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface SamplePredictionPoint {
  index: number;
  actual: number;
  predicted: number;
  baseline: number;
}

export interface MLTrainResult {
  success: boolean;
  message: string;
  metrics: MLMetrics;
  baseline_metrics: MLMetrics;
  feature_importances: FeatureImportance[];
  sample_test_predictions: SamplePredictionPoint[];
  plain_english_summary: string;
}

export interface RoadPrediction {
  road: RoadDirection;
  predicted_vehicles: number;
  demand_level: 'Low' | 'Moderate' | 'High' | 'Very High';
  color_badge: string;
  input_lag1: number;
  input_queue: number;
}

export interface PredictionResponse {
  hour: number;
  day_of_week: number;
  is_weekend: boolean;
  model_trained: boolean;
  predictions: Record<RoadDirection, RoadPrediction>;
}

export interface TimelineEntry {
  time: number;
  active_road: RoadDirection;
  signal_state: SignalState;
  total_queue: number;
  north_queue: number;
  south_queue: number;
  east_queue: number;
  west_queue: number;
}

export interface PhaseTransition {
  time: number;
  road: RoadDirection;
  state: SignalState;
  duration: number;
  reason?: string;
  rankings?: any[];
}

export interface SimulationResult {
  mode: 'adaptive' | 'fixed';
  duration_seconds: number;
  total_served: number;
  unserved_vehicles: number;
  avg_wait_time: number;
  overall_avg_wait_time: number;
  total_waiting_time: number;
  avg_queue_length: number;
  max_queue_length: number;
  throughput_vpm: number;
  road_breakdowns: Record<RoadDirection, {
    served: number;
    remaining_queue: number;
    avg_wait_time: number;
    total_wait_time: number;
  }>;
  timeline: TimelineEntry[];
  phase_transitions: PhaseTransition[];
  final_queues: Record<RoadDirection, number>;
}

export interface ComparisonResult {
  success: boolean;
  duration_seconds: number;
  seed: number;
  fixed_results: SimulationResult;
  adaptive_results: SimulationResult;
  comparisons: {
    avg_wait_time: { diff: number; pct: number; improved: boolean };
    avg_queue_length: { diff: number; pct: number; improved: boolean };
    total_served: { diff: number; pct: number; improved: boolean };
    throughput_vpm: { diff: number; pct: number; improved: boolean };
  };
  merged_timeline: any[];
  summary_text: string;
  disclaimer: string;
}

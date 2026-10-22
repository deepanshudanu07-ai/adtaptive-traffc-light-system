"""
Data Manager Module for Adaptive Traffic Signal Optimizer
Handles:
1. Synthetic 30-day realistic historical dataset generation
2. CSV loading, schema validation, column mapping
3. Missing value & duplicate detection and remediation
4. Exploratory data analysis (EDA) summaries & aggregations
5. Dataset filtering & export
"""

import os
import io
import math
import random
import datetime
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class DataManager:
    ROADS = ["North", "South", "East", "West"]
    REQUIRED_COLUMNS = ["timestamp", "road", "vehicle_count", "average_speed", "queue_length"]

    def __init__(self, data_dir: str = "/data"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.current_df: Optional[pd.DataFrame] = None
        self.is_synthetic: bool = True
        self.dataset_name: str = "demo_30days_traffic.csv"
        self.last_clean_report: Dict[str, Any] = {}

    def generate_synthetic_dataset(
        self,
        days: int = 30,
        interval_minutes: int = 60,
        seed: int = 42
    ) -> pd.DataFrame:
        """
        Generates realistic 30-day traffic data with:
        - Morning peak (07:30 - 09:30) and Evening peak (17:00 - 19:30)
        - Arterial roads (North, South) with higher traffic than cross streets (East, West)
        - Weekend reduction (~35% lower volume)
        - Speed inversely correlated with vehicle count and queue length
        - Reproducible random seed
        """
        random.seed(seed)
        np.random.seed(seed)

        start_date = datetime.datetime(2026, 9, 1, 0, 0, 0)
        total_intervals = int((days * 24 * 60) / interval_minutes)

        records = []
        road_factors = {
            "North": 1.25,   # Major Northbound commuter corridor
            "South": 1.15,   # Major Southbound corridor
            "East": 0.85,    # Secondary cross street
            "West": 0.75     # Secondary cross street
        }

        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for i in range(total_intervals):
            curr_dt = start_date + datetime.timedelta(minutes=i * interval_minutes)
            hour = curr_dt.hour
            minute = curr_dt.minute
            day_name = days_of_week[curr_dt.weekday()]
            is_weekend = curr_dt.weekday() >= 5

            # Diurnal hourly profile (normalized 0 to 1)
            # Peaks at 8:00 and 18:00
            morning_peak = math.exp(-((hour + minute / 60.0 - 8.5) ** 2) / (2 * 1.5 ** 2))
            evening_peak = math.exp(-((hour + minute / 60.0 - 18.0) ** 2) / (2 * 1.8 ** 2))
            midday_flow = 0.45 if 10 <= hour <= 16 else 0.15
            night_dip = 0.08 if hour < 6 or hour >= 22 else 0.2

            base_intensity = max(night_dip, (0.85 * morning_peak) + (0.95 * evening_peak) + midday_flow)

            # Weekend adjustment
            if is_weekend:
                # Weekend has later morning rise and smoother peak
                base_intensity = max(0.12, base_intensity * 0.65 + 0.15 * math.exp(-((hour - 14) ** 2) / 16))

            for road in self.ROADS:
                mult = road_factors[road]
                noise = np.random.normal(0, 3.5)

                # Base vehicle count
                mean_vehicles = (base_intensity * 55.0 * mult) + noise
                vehicle_count = max(2, int(round(mean_vehicles)))

                # Congestion and queue relationship
                # As vehicles exceed road threshold, queues grow nonlinearly
                capacity_threshold = 35.0 * mult
                if vehicle_count > capacity_threshold:
                    excess = vehicle_count - capacity_threshold
                    mean_queue = (excess * 0.75) + (vehicle_count * 0.2) + np.random.normal(0, 1.5)
                else:
                    mean_queue = (vehicle_count * 0.15) + np.random.normal(0, 1.0)
                queue_length = max(0, int(round(mean_queue)))

                # Speed inversely related to density
                # Free flow speed ~ 55 km/h, dropping to 18 km/h during heavy congestion
                congestion_ratio = min(1.0, vehicle_count / 75.0)
                speed = 52.0 - (congestion_ratio * 30.0) + np.random.normal(0, 2.5)
                avg_speed = max(12.0, min(65.0, round(speed, 1)))

                lane = f"{road}-L1" if vehicle_count < 30 else f"{road}-L2"

                records.append({
                    "timestamp": curr_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "time": curr_dt.strftime("%H:%M"),
                    "day": day_name,
                    "road": road,
                    "vehicle_count": vehicle_count,
                    "average_speed": avg_speed,
                    "queue_length": queue_length,
                    "lane": lane
                })

        df = pd.DataFrame(records)
        self.current_df = df
        self.is_synthetic = True
        self.dataset_name = "demo_30days_traffic.csv"

        # Save default CSV
        csv_path = os.path.join(self.data_dir, "sample_traffic.csv")
        df.to_csv(csv_path, index=False)

        return df

    def get_or_create_default_dataset(self) -> pd.DataFrame:
        """Loads cached demo dataset or creates fresh one."""
        csv_path = os.path.join(self.data_dir, "sample_traffic.csv")
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                self.current_df = df
                self.is_synthetic = True
                return df
            except Exception:
                pass
        return self.generate_synthetic_dataset()

    def load_and_validate_csv(
        self,
        file_content: str,
        filename: str = "uploaded_traffic.csv",
        column_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Parses CSV, validates schema, applies column mapping, handles missing/invalid values.
        """
        try:
            df = pd.read_csv(io.StringIO(file_content))
        except Exception as e:
            return {"success": False, "error": f"Failed to parse CSV file: {str(e)}"}

        original_rows = len(df)
        if original_rows == 0:
            return {"success": False, "error": "CSV file contains zero rows."}

        # Apply column mapping if provided
        if column_mapping:
            df.rename(columns=column_mapping, inplace=True)

        # Standardize column names (lowercase, stripped)
        clean_cols = {c: c.strip().lower().replace(" ", "_") for c in df.columns}
        df.rename(columns=clean_cols, inplace=True)

        # Validate minimum columns
        missing_required = []
        for req in self.REQUIRED_COLUMNS:
            if req not in df.columns:
                missing_required.append(req)

        if missing_required:
            return {
                "success": False,
                "error": f"Missing required columns: {', '.join(missing_required)}. Found columns: {list(df.columns)}",
                "found_columns": list(df.columns),
                "required_columns": self.REQUIRED_COLUMNS
            }

        # Cleaning steps
        report = {
            "original_rows": original_rows,
            "missing_values_imputed": 0,
            "invalid_rows_fixed": 0,
            "duplicates_removed": 0,
        }

        # Handle duplicates
        init_len = len(df)
        df.drop_duplicates(subset=["timestamp", "road"], keep="first", inplace=True)
        report["duplicates_removed"] = init_len - len(df)

        # Parse timestamp
        try:
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        except Exception as e:
            return {"success": False, "error": f"Error converting timestamp column: {str(e)}"}

        # Drop rows where timestamp is unparseable
        nat_count = df['timestamp'].isna().sum()
        if nat_count > 0:
            report["invalid_rows_fixed"] += int(nat_count)
            df.dropna(subset=['timestamp'], inplace=True)

        # Standardize road names
        df['road'] = df['road'].astype(str).str.capitalize()
        # Filter only valid roads or map them
        valid_roads = set(self.ROADS)
        df = df[df['road'].isin(valid_roads)]

        # Numeric conversions and non-negative assertions
        for num_col in ['vehicle_count', 'average_speed', 'queue_length']:
            df[num_col] = pd.to_numeric(df[num_col], errors='coerce')
            missing = df[num_col].isna().sum()
            if missing > 0:
                report["missing_values_imputed"] += int(missing)
                median_val = df[num_col].median()
                if pd.isna(median_val):
                    median_val = 10.0 if num_col == 'vehicle_count' else 5.0
                df[num_col].fillna(median_val, inplace=True)

            # Clamp negatives to 0
            neg_mask = df[num_col] < 0
            if neg_mask.sum() > 0:
                report["invalid_rows_fixed"] += int(neg_mask.sum())
                df.loc[neg_mask, num_col] = 0

        # Extract supplemental temporal columns if absent
        if 'time' not in df.columns:
            df['time'] = df['timestamp'].dt.strftime("%H:%M")
        if 'day' not in df.columns:
            df['day'] = df['timestamp'].dt.day_name()
        if 'lane' not in df.columns:
            df['lane'] = df['road'] + "-L1"

        # Chronological sort
        df.sort_values(by=['timestamp', 'road'], inplace=True)
        df.reset_index(drop=True, inplace=True)

        self.current_df = df
        self.is_synthetic = False
        self.dataset_name = filename
        self.last_clean_report = report

        return {
            "success": True,
            "message": f"Successfully parsed and cleaned {len(df)} records.",
            "report": report,
            "total_rows": len(df),
            "roads_present": sorted(df['road'].unique().tolist()),
            "start_date": str(df['timestamp'].min()),
            "end_date": str(df['timestamp'].max())
        }

    def get_summary_statistics(self) -> Dict[str, Any]:
        """Provides high-level metrics, aggregations, and hourly/road distributions for charts."""
        if self.current_df is None or len(self.current_df) == 0:
            self.get_or_create_default_dataset()

        df = self.current_df.copy()
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour

        # Total counts
        total_records = len(df)
        total_vehicles = int(df['vehicle_count'].sum())
        avg_speed = round(float(df['average_speed'].mean()), 1)
        avg_queue = round(float(df['queue_length'].mean()), 1)
        max_queue = int(df['queue_length'].max())

        # Group by road
        road_stats = []
        for road in self.ROADS:
            sub = df[df['road'] == road]
            if len(sub) > 0:
                road_stats.append({
                    "road": road,
                    "total_vehicles": int(sub['vehicle_count'].sum()),
                    "avg_vehicles": round(float(sub['vehicle_count'].mean()), 1),
                    "avg_queue": round(float(sub['queue_length'].mean()), 1),
                    "max_queue": int(sub['queue_length'].max()),
                    "avg_speed": round(float(sub['average_speed'].mean()), 1),
                })

        # Group by hour (0 to 23)
        hourly_stats = []
        hourly_grp = df.groupby('hour').agg({
            'vehicle_count': 'mean',
            'queue_length': 'mean',
            'average_speed': 'mean'
        }).reset_index()

        for _, row in hourly_grp.iterrows():
            hourly_stats.append({
                "hour": int(row['hour']),
                "label": f"{int(row['hour']):02d}:00",
                "avg_vehicles": round(float(row['vehicle_count']), 1),
                "avg_queue": round(float(row['queue_length']), 1),
                "avg_speed": round(float(row['average_speed']), 1),
            })

        # Weekday vs Weekend
        df['is_weekend'] = pd.to_datetime(df['timestamp']).dt.weekday >= 5
        weekday_stats = {
            "weekday_avg_vehicles": round(float(df[~df['is_weekend']]['vehicle_count'].mean()), 1),
            "weekend_avg_vehicles": round(float(df[df['is_weekend']]['vehicle_count'].mean()), 1),
            "weekday_avg_queue": round(float(df[~df['is_weekend']]['queue_length'].mean()), 1),
            "weekend_avg_queue": round(float(df[df['is_weekend']]['queue_length'].mean()), 1),
        }

        return {
            "total_records": total_records,
            "total_vehicles": total_vehicles,
            "avg_speed": avg_speed,
            "avg_queue": avg_queue,
            "max_queue": max_queue,
            "is_synthetic": self.is_synthetic,
            "dataset_name": self.dataset_name,
            "notice": "Using synthetic demonstration data. Upload real historical traffic observations for real-data evaluation." if self.is_synthetic else "Using uploaded user dataset.",
            "road_stats": road_stats,
            "hourly_stats": hourly_stats,
            "weekday_stats": weekday_stats,
            "clean_report": self.last_clean_report
        }

    def get_table_page(
        self,
        page: int = 1,
        page_size: int = 20,
        road_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Paginated view for dataset inspector."""
        if self.current_df is None:
            self.get_or_create_default_dataset()

        df = self.current_df
        if road_filter and road_filter in self.ROADS:
            df = df[df['road'] == road_filter]

        total_rows = len(df)
        total_pages = max(1, math.ceil(total_rows / page_size))
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        page_records = df.iloc[start_idx:end_idx].copy()
        # Convert timestamp to string
        page_records['timestamp'] = page_records['timestamp'].astype(str)

        return {
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_rows": total_rows,
            "records": page_records.to_dict(orient="records")
        }

    def export_csv(self) -> str:
        """Exports current dataset as CSV text."""
        if self.current_df is None:
            self.get_or_create_default_dataset()
        return self.current_df.to_csv(index=False)

"""
CLI Runner for Adaptive Traffic Signal Optimizer
Provides a standardized JSON CLI interface for backend operations.
Can be invoked from shell, scripts, or Node.js server.
"""

import sys
import json
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.data_manager import DataManager
from backend.ml_engine import TrafficMLEngine
from backend.simulation_engine import TrafficSimulation

# Global singletons for persistent CLI session cache if needed
data_mgr = DataManager()
ml_engine = TrafficMLEngine()

def handle_generate_data(payload):
    days = int(payload.get("days", 30))
    seed = int(payload.get("seed", 42))
    df = data_mgr.generate_synthetic_dataset(days=days, seed=seed)
    stats = data_mgr.get_summary_statistics()
    return {"status": "ok", "stats": stats, "records_generated": len(df)}

def handle_get_summary(payload):
    stats = data_mgr.get_summary_statistics()
    return {"status": "ok", "stats": stats}

def handle_get_table_page(payload):
    page = int(payload.get("page", 1))
    page_size = int(payload.get("page_size", 20))
    road_filter = payload.get("road_filter")
    result = data_mgr.get_table_page(page=page, page_size=page_size, road_filter=road_filter)
    return {"status": "ok", **result}

def handle_upload_csv(payload):
    content = payload.get("content", "")
    filename = payload.get("filename", "uploaded_traffic.csv")
    mapping = payload.get("column_mapping")
    res = data_mgr.load_and_validate_csv(content, filename=filename, column_mapping=mapping)
    if res.get("success"):
        stats = data_mgr.get_summary_statistics()
        return {"status": "ok", "validation": res, "stats": stats}
    return {"status": "error", "validation": res}

def handle_train_model(payload):
    df = data_mgr.get_or_create_default_dataset()
    res = ml_engine.train_model(df)
    return {"status": "ok" if res.get("success") else "error", **res}

def handle_predict(payload):
    # Ensure model is trained on current dataset if not yet trained
    if not ml_engine.is_trained:
        df = data_mgr.get_or_create_default_dataset()
        ml_engine.train_model(df)

    hour = int(payload.get("hour", 8))
    day_of_week = int(payload.get("day_of_week", 2))
    recent = payload.get("recent_traffic")
    preds = ml_engine.predict_next_interval(hour=hour, day_of_week=day_of_week, recent_traffic=recent)
    return {"status": "ok", **preds}

def handle_run_simulation(payload):
    duration = int(payload.get("duration", 300))
    mode = payload.get("mode", "adaptive")
    fixed_green = int(payload.get("fixed_green", 30))
    min_green = int(payload.get("min_green", 10))
    max_green = int(payload.get("max_green", 50))
    discharge_rate = float(payload.get("discharge_rate", 0.45))
    seed = int(payload.get("seed", 42))
    weights = payload.get("weights", {"w1": 0.40, "w2": 0.35, "w3": 0.25})

    # Prepare demands from ML or input
    demands = payload.get("predicted_demands")
    if not demands:
        if not ml_engine.is_trained:
            df = data_mgr.get_or_create_default_dataset()
            ml_engine.train_model(df)
        pred_res = ml_engine.predict_next_interval(hour=8, day_of_week=2)
        demands = {r: pred_res["predictions"][r]["predicted_vehicles"] for r in ml_engine.ROADS}

    sim = TrafficSimulation(
        duration_seconds=duration,
        fixed_green=fixed_green,
        min_green=min_green,
        max_green=max_green,
        discharge_rate=discharge_rate,
        seed=seed
    )
    result = sim.run_simulation(
        mode=mode,
        predicted_demands=demands,
        scheduler_weights=weights
    )
    return {"status": "ok", **result}

def handle_run_comparison(payload):
    duration = int(payload.get("duration", 300))
    seed = int(payload.get("seed", 42))
    weights = payload.get("weights", {"w1": 0.40, "w2": 0.35, "w3": 0.25})
    arrival_rates = payload.get("arrival_rates")

    # Demands from ML
    if not ml_engine.is_trained:
        df = data_mgr.get_or_create_default_dataset()
        ml_engine.train_model(df)
    pred_res = ml_engine.predict_next_interval(hour=8, day_of_week=2)
    demands = {r: pred_res["predictions"][r]["predicted_vehicles"] for r in ml_engine.ROADS}

    sim = TrafficSimulation(
        duration_seconds=duration,
        seed=seed
    )
    result = sim.run_comparison(
        predicted_demands=demands,
        scheduler_weights=weights,
        custom_rates=arrival_rates
    )
    return {"status": "ok", **result}

def handle_export_report(payload):
    # Consolidates complete report
    stats = data_mgr.get_summary_statistics()
    if not ml_engine.is_trained:
        df = data_mgr.get_or_create_default_dataset()
        ml_engine.train_model(df)
    preds = ml_engine.predict_next_interval(hour=8, day_of_week=2)
    sim = TrafficSimulation(duration_seconds=300, seed=42)
    comp = sim.run_comparison(
        predicted_demands={r: preds["predictions"][r]["predicted_vehicles"] for r in ml_engine.ROADS}
    )

    return {
        "status": "ok",
        "title": "Adaptive Traffic Signal Optimizer - Academic Project Summary",
        "dataset_summary": stats,
        "ml_model_metrics": ml_engine.metrics,
        "baseline_metrics": ml_engine.baseline_metrics,
        "feature_importances": ml_engine.feature_importances,
        "predictions": preds,
        "comparison_benchmark": comp
    }

HANDLERS = {
    "generate_data": handle_generate_data,
    "get_summary": handle_get_summary,
    "get_table_page": handle_get_table_page,
    "upload_csv": handle_upload_csv,
    "train_model": handle_train_model,
    "predict": handle_predict,
    "run_simulation": handle_run_simulation,
    "run_comparison": handle_run_comparison,
    "export_report": handle_export_report,
}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No command provided"}))
        sys.exit(1)

    cmd = sys.argv[1]
    payload = {}
    if len(sys.argv) >= 3:
        try:
            payload = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON payload: {str(e)}"}))
            sys.exit(1)

    handler = HANDLERS.get(cmd)
    if not handler:
        print(json.dumps({"status": "error", "message": f"Unknown command: {cmd}"}))
        sys.exit(1)

    try:
        response = handler(payload)
        print(json.dumps(response))
    except Exception as e:
        import traceback
        print(json.dumps({"status": "error", "message": str(e), "trace": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()

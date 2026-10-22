"""
Flask REST API for Adaptive Traffic Signal Optimizer
Provides standard RESTful HTTP endpoints for direct Python usage or backend integration.
"""

from flask import Flask, request, jsonify
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.data_manager import DataManager
from backend.ml_engine import TrafficMLEngine
from backend.simulation_engine import TrafficSimulation

app = Flask(__name__)
data_mgr = DataManager()
ml_engine = TrafficMLEngine()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Adaptive Traffic Signal Optimizer Backend"})

@app.route('/api/dataset/summary', methods=['GET'])
def dataset_summary():
    stats = data_mgr.get_summary_statistics()
    return jsonify({"status": "ok", "stats": stats})

@app.route('/api/dataset/generate', methods=['POST'])
def generate_dataset():
    data = request.get_json() or {}
    days = int(data.get("days", 30))
    seed = int(data.get("seed", 42))
    df = data_mgr.generate_synthetic_dataset(days=days, seed=seed)
    return jsonify({"status": "ok", "records_generated": len(df), "stats": data_mgr.get_summary_statistics()})

@app.route('/api/dataset/table', methods=['GET'])
def dataset_table():
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    road = request.args.get("road")
    result = data_mgr.get_table_page(page=page, page_size=page_size, road_filter=road)
    return jsonify({"status": "ok", **result})

@app.route('/api/dataset/upload', methods=['POST'])
def upload_dataset():
    data = request.get_json() or {}
    content = data.get("content", "")
    filename = data.get("filename", "uploaded.csv")
    mapping = data.get("column_mapping")
    res = data_mgr.load_and_validate_csv(content, filename=filename, column_mapping=mapping)
    return jsonify(res)

@app.route('/api/ml/train', methods=['POST'])
def train_model():
    df = data_mgr.get_or_create_default_dataset()
    res = ml_engine.train_model(df)
    return jsonify(res)

@app.route('/api/ml/predict', methods=['POST'])
def predict_traffic():
    data = request.get_json() or {}
    hour = int(data.get("hour", 8))
    day = int(data.get("day_of_week", 2))
    recent = data.get("recent_traffic")
    if not ml_engine.is_trained:
        df = data_mgr.get_or_create_default_dataset()
        ml_engine.train_model(df)
    res = ml_engine.predict_next_interval(hour=hour, day_of_week=day, recent_traffic=recent)
    return jsonify({"status": "ok", **res})

@app.route('/api/simulation/run', methods=['POST'])
def run_simulation():
    data = request.get_json() or {}
    duration = int(data.get("duration", 300))
    mode = data.get("mode", "adaptive")
    sim = TrafficSimulation(duration_seconds=duration)
    res = sim.run_simulation(mode=mode)
    return jsonify({"status": "ok", **res})

@app.route('/api/simulation/compare', methods=['POST'])
def compare_controllers():
    data = request.get_json() or {}
    duration = int(data.get("duration", 300))
    rates = data.get("arrival_rates")
    weights = data.get("weights")
    sim = TrafficSimulation(duration_seconds=duration)
    res = sim.run_comparison(custom_rates=rates, scheduler_weights=weights)
    return jsonify({"status": "ok", **res})

if __name__ == '__main__':
    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

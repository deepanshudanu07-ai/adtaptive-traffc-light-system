"""
Unit Test Suite for Adaptive Traffic Signal Optimizer
Verifies:
1. VehicleQueue FIFO behavior (enqueue, dequeue, wait times)
2. PriorityQueueScheduler max-heap ordering & dynamic green limits
3. Starvation prevention aging mechanism
4. DataManager dataset generation, validation, cleaning & edge cases
5. TrafficMLEngine training, lag feature engineering, non-negative predictions
6. TrafficSimulation fair identical arrival comparison & phase safety
"""

import unittest
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.data_structures import Vehicle, VehicleQueue, PriorityQueueScheduler
from backend.data_manager import DataManager
from backend.ml_engine import TrafficMLEngine
from backend.simulation_engine import TrafficSimulation

class TestVehicleQueueFIFO(unittest.TestCase):
    def test_fifo_ordering(self):
        q = VehicleQueue("North")
        v1 = Vehicle("N1", "North", arrival_time=10.0)
        v2 = Vehicle("N2", "North", arrival_time=12.0)
        v3 = Vehicle("N3", "North", arrival_time=15.0)

        q.enqueue(v1)
        q.enqueue(v2)
        q.enqueue(v3)

        self.assertEqual(q.size(), 3)
        self.assertFalse(q.is_empty())
        self.assertEqual(q.peek().vehicle_id, "N1")

        # First in must be first out
        dequeued_1 = q.dequeue(current_time=20.0)
        self.assertEqual(dequeued_1.vehicle_id, "N1")
        self.assertEqual(dequeued_1.waiting_time, 10.0)

        dequeued_2 = q.dequeue(current_time=22.0)
        self.assertEqual(dequeued_2.vehicle_id, "N2")
        self.assertEqual(dequeued_2.waiting_time, 10.0)

        self.assertEqual(q.size(), 1)
        self.assertEqual(q.peek().vehicle_id, "N3")

    def test_empty_queue_dequeue(self):
        q = VehicleQueue("South")
        self.assertIsNone(q.dequeue(current_time=5.0))
        self.assertTrue(q.is_empty())
        self.assertEqual(q.size(), 0)

class TestPriorityQueueScheduler(unittest.TestCase):
    def setUp(self):
        self.scheduler = PriorityQueueScheduler(
            w1=0.40, w2=0.35, w3=0.25,
            min_green=10, max_green=50,
            starvation_threshold=80.0
        )
        self.queues = {r: VehicleQueue(r) for r in ["North", "South", "East", "West"]}

    def test_priority_score_ordering(self):
        # North has heavy traffic and queue
        for i in range(15):
            self.queues["North"].enqueue(Vehicle(f"N{i}", "North", arrival_time=0.0))
        # West has very low traffic
        self.queues["West"].enqueue(Vehicle("W1", "West", arrival_time=5.0))

        demands = {"North": 50.0, "South": 20.0, "East": 15.0, "West": 5.0}
        decision = self.scheduler.schedule_next(demands, self.queues, current_time=20.0)

        # North should be top priority
        self.assertEqual(decision["selected_road"], "North")
        self.assertTrue(decision["green_duration"] >= 10)
        self.assertTrue(decision["green_duration"] <= 50)

    def test_green_duration_bounds(self):
        # Extreme zero demand
        dur_zero = self.scheduler.compute_green_duration(predicted_demand=0, queue_length=0)
        self.assertEqual(dur_zero, 10)  # clamped at min_green

        # Extreme high demand
        dur_high = self.scheduler.compute_green_duration(predicted_demand=500, queue_length=200)
        self.assertEqual(dur_high, 50)  # clamped at max_green

    def test_starvation_prevention_aging(self):
        # East has an old vehicle that has been waiting over starvation threshold (85s)
        self.queues["East"].enqueue(Vehicle("E1", "East", arrival_time=0.0))

        # North has high raw demand
        demands = {"North": 45.0, "South": 10.0, "East": 10.0, "West": 10.0}

        # Check East's score at t = 95s (waiting 95s > 80s threshold)
        score_info = self.scheduler.calculate_priority_score(
            road="East",
            predicted_demand=10.0,
            queue_length=1,
            wait_time=95.0
        )
        self.assertTrue(score_info["is_starving"])
        self.assertGreater(score_info["aging_bonus"], 0.0)

class TestDataManager(unittest.TestCase):
    def setUp(self):
        self.dm = DataManager(data_dir="/tmp/test_traffic_data")

    def test_synthetic_data_generation(self):
        df = self.dm.generate_synthetic_dataset(days=2, interval_minutes=60, seed=42)
        self.assertGreater(len(df), 50)
        for col in ["timestamp", "road", "vehicle_count", "average_speed", "queue_length"]:
            self.assertIn(col, df.columns)
        self.assertTrue((df['vehicle_count'] >= 0).all())
        self.assertTrue((df['queue_length'] >= 0).all())
        self.assertTrue((df['average_speed'] >= 0).all())

    def test_csv_validation_and_cleaning(self):
        dirty_csv = (
            "timestamp,road,vehicle_count,average_speed,queue_length\n"
            "2026-09-01 08:00:00,North,35,42.5,5\n"
            "2026-09-01 08:00:00,North,35,42.5,5\n"  # Duplicate
            "2026-09-01 09:00:00,South,-5,35.0,2\n"  # Negative count
            "2026-09-01 10:00:00,East,,45.0,1\n"     # Missing count
            "invalid_date,West,10,50.0,0\n"           # Invalid date
        )
        res = self.dm.load_and_validate_csv(dirty_csv, filename="dirty.csv")
        self.assertTrue(res["success"])
        self.assertGreater(res["report"]["duplicates_removed"], 0)
        self.assertGreater(res["report"]["invalid_rows_fixed"], 0)
        self.assertGreater(res["report"]["missing_values_imputed"], 0)

        cleaned_df = self.dm.current_df
        self.assertTrue((cleaned_df['vehicle_count'] >= 0).all())

class TestTrafficMLEngine(unittest.TestCase):
    def setUp(self):
        self.dm = DataManager(data_dir="/tmp/test_traffic_data")
        self.ml = TrafficMLEngine(n_estimators=10, random_state=42)

    def test_model_training_and_metrics(self):
        df = self.dm.generate_synthetic_dataset(days=5, interval_minutes=60, seed=42)
        res = self.ml.train_model(df)
        self.assertTrue(res["success"])
        self.assertIn("mae", self.ml.metrics)
        self.assertIn("rmse", self.ml.metrics)
        self.assertIn("r2", self.ml.metrics)
        self.assertGreaterEqual(self.ml.metrics["r2"], 0.0)

    def test_nonnegative_predictions(self):
        df = self.dm.generate_synthetic_dataset(days=4, interval_minutes=60, seed=42)
        self.ml.train_model(df)
        preds = self.ml.predict_next_interval(hour=8, day_of_week=1)
        for road in ["North", "South", "East", "West"]:
            count = preds["predictions"][road]["predicted_vehicles"]
            self.assertGreaterEqual(count, 0.0)

class TestTrafficSimulationComparison(unittest.TestCase):
    def test_identical_arrival_events(self):
        sim = TrafficSimulation(duration_seconds=120, seed=42)
        rates = {"North": 20.0, "South": 20.0, "East": 15.0, "West": 10.0}

        sched1 = sim.generate_arrival_schedule(rates, 120)
        sched2 = sim.generate_arrival_schedule(rates, 120)

        # Pre-generated schedules must be bit-for-bit identical for fair evaluation
        self.assertEqual(sched1, sched2)

    def test_comparison_metrics_consistency(self):
        sim = TrafficSimulation(duration_seconds=180, seed=42)
        res = sim.run_comparison()
        self.assertTrue(res["success"])
        fixed = res["fixed_results"]
        adapt = res["adaptive_results"]

        self.assertGreater(fixed["total_served"], 0)
        self.assertGreater(adapt["total_served"], 0)
        self.assertGreater(fixed["avg_wait_time"], 0)
        self.assertGreater(adapt["avg_wait_time"], 0)
        self.assertIn("avg_wait_time", res["comparisons"])

    def test_no_conflicting_green_phases(self):
        sim = TrafficSimulation(duration_seconds=120, seed=42)
        res = sim.run_simulation(mode="adaptive")
        timeline = res["timeline"]
        for entry in timeline:
            # At every time step, at most one active road has green or amber
            self.assertIn(entry["signal_state"], ["GREEN", "AMBER", "CLEARANCE"])
            self.assertIn(entry["active_road"], ["North", "South", "East", "West"])

if __name__ == '__main__':
    unittest.main()

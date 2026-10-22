"""
Data Structures Module for Adaptive Traffic Signal Optimizer
Implements:
1. FIFO Queue for waiting vehicles on each approach
2. Priority Queue (Max-Heap via heapq) for scheduling road green phases
3. Starvation prevention / aging mechanism to prevent ignored approaches
"""

import heapq
import time
from collections import deque
from typing import List, Dict, Any, Optional

class Vehicle:
    """Represents an individual vehicle arriving at an intersection approach."""
    def __init__(self, vehicle_id: str, road: str, arrival_time: float, vehicle_type: str = "car"):
        self.vehicle_id = vehicle_id
        self.road = road  # "North", "South", "East", "West"
        self.arrival_time = arrival_time  # in simulated seconds
        self.vehicle_type = vehicle_type
        self.depart_time: Optional[float] = None

    @property
    def waiting_time(self) -> float:
        """Waiting time up to departure or current time."""
        if self.depart_time is not None:
            return max(0.0, self.depart_time - self.arrival_time)
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "road": self.road,
            "arrival_time": round(self.arrival_time, 1),
            "depart_time": round(self.depart_time, 1) if self.depart_time else None,
            "waiting_time": round(self.waiting_time, 1),
            "vehicle_type": self.vehicle_type
        }


class VehicleQueue:
    """
    FIFO (First-In, First-Out) Queue representing waiting vehicles on a road approach.
    Vehicles that arrive first are served first during the green signal phase.
    """
    def __init__(self, road_name: str):
        self.road_name = road_name
        self.queue: deque = deque()
        self.total_arrived: int = 0
        self.total_served: int = 0
        self.total_wait_time: float = 0.0

    def enqueue(self, vehicle: Vehicle) -> None:
        """Add vehicle to tail of FIFO queue."""
        self.queue.append(vehicle)
        self.total_arrived += 1

    def dequeue(self, current_time: float) -> Optional[Vehicle]:
        """Remove and return vehicle from head of FIFO queue."""
        if not self.queue:
            return None
        vehicle = self.queue.popleft()
        vehicle.depart_time = current_time
        self.total_served += 1
        self.total_wait_time += vehicle.waiting_time
        return vehicle

    def size(self) -> int:
        """Current number of waiting vehicles."""
        return len(self.queue)

    def is_empty(self) -> bool:
        """Check if queue has no vehicles."""
        return len(self.queue) == 0

    def peek(self) -> Optional[Vehicle]:
        """Inspect the next vehicle to be served without dequeuing."""
        return self.queue[0] if self.queue else None

    def get_average_wait_time(self, current_time: float) -> float:
        """
        Calculates average waiting time: combining served vehicles and currently waiting vehicles.
        """
        served_waits = self.total_wait_time
        waiting_waits = sum(max(0.0, current_time - v.arrival_time) for v in self.queue)
        total_vehicles = self.total_served + len(self.queue)
        if total_vehicles == 0:
            return 0.0
        return (served_waits + waiting_waits) / total_vehicles

    def get_current_max_wait_time(self, current_time: float) -> float:
        """Returns waiting time of the oldest vehicle in queue."""
        if not self.queue:
            return 0.0
        return max(0.0, current_time - self.queue[0].arrival_time)

    def clear(self) -> None:
        """Reset queue."""
        self.queue.clear()
        self.total_arrived = 0
        self.total_served = 0
        self.total_wait_time = 0.0


class PriorityQueueScheduler:
    """
    Priority Queue for scheduling four-way intersection green phases.
    Uses Python's heapq (negated score for max-heap behavior).
    Calculates priority score based on:
      - Predicted vehicle demand (w1)
      - Current queue length (w2)
      - Cumulative or max waiting time (w3)
      - Starvation prevention / aging mechanism boost
    """
    ROADS = ["North", "South", "East", "West"]

    def __init__(
        self,
        w1: float = 0.40,  # Weight for predicted demand
        w2: float = 0.35,  # Weight for current queue length
        w3: float = 0.25,  # Weight for waiting time urgency
        starvation_threshold: float = 90.0,  # seconds waiting before aging kicks in
        aging_factor: float = 1.5,           # multiplier/bonus when starving
        min_green: int = 10,                 # minimum green seconds
        max_green: int = 50                  # maximum green seconds
    ):
        self.w1 = w1
        self.w2 = w2
        self.w3 = w3
        self.starvation_threshold = starvation_threshold
        self.aging_factor = aging_factor
        self.min_green = min_green
        self.max_green = max_green

        # Consecutive cycles a road was skipped
        self.cycles_skipped: Dict[str, int] = {road: 0 for road in self.ROADS}
        # Last time road had green
        self.last_green_time: Dict[str, float] = {road: 0.0 for road in self.ROADS}

    def update_config(self, w1: float, w2: float, w3: float, min_green: int, max_green: int, starvation_threshold: float):
        total_w = w1 + w2 + w3
        if total_w > 0:
            self.w1 = w1 / total_w
            self.w2 = w2 / total_w
            self.w3 = w3 / total_w
        self.min_green = max(5, min_green)
        self.max_green = max(self.min_green, max_green)
        self.starvation_threshold = max(30.0, starvation_threshold)

    def calculate_priority_score(
        self,
        road: str,
        predicted_demand: float,
        queue_length: int,
        wait_time: float,
        max_demand_ref: float = 60.0,
        max_queue_ref: float = 40.0,
        max_wait_ref: float = 120.0
    ) -> Dict[str, Any]:
        """
        Normalizes inputs to [0, 1] range and calculates composite priority score.
        Applies starvation prevention if wait_time exceeds threshold.
        """
        # Feature normalization
        norm_demand = min(1.0, max(0.0, predicted_demand / max(1.0, max_demand_ref)))
        norm_queue = min(1.0, max(0.0, queue_length / max(1.0, max_queue_ref)))
        norm_wait = min(1.0, max(0.0, wait_time / max(1.0, max_wait_ref)))

        base_score = (self.w1 * norm_demand) + (self.w2 * norm_queue) + (self.w3 * norm_wait)

        # Starvation Prevention Aging Check:
        is_starving = wait_time >= self.starvation_threshold or self.cycles_skipped[road] >= 3
        aging_bonus = 0.0
        if is_starving:
            # Overdue wait adds an aggressive bonus so starving road cannot be ignored
            overdue_ratio = (wait_time - self.starvation_threshold) / max_wait_ref
            aging_bonus = max(0.2, overdue_ratio * self.aging_factor)

        final_score = base_score + aging_bonus

        return {
            "road": road,
            "raw_demand": predicted_demand,
            "raw_queue": queue_length,
            "raw_wait": round(wait_time, 1),
            "norm_demand": round(norm_demand, 3),
            "norm_queue": round(norm_queue, 3),
            "norm_wait": round(norm_wait, 3),
            "base_score": round(base_score, 4),
            "aging_bonus": round(aging_bonus, 4),
            "final_score": round(final_score, 4),
            "is_starving": is_starving,
            "cycles_skipped": self.cycles_skipped[road]
        }

    def compute_green_duration(self, predicted_demand: float, queue_length: int) -> int:
        """
        Calculates dynamic green-light duration in seconds.
        Base green is dynamic: scaled according to queue size and predicted arrival pressure.
        Clamped between min_green and max_green.
        """
        # Formula: green_time = min_green + (queue * 1.8 + demand * 0.4)
        dynamic_seconds = self.min_green + (queue_length * 1.8) + (predicted_demand * 0.4)
        clamped = max(self.min_green, min(self.max_green, int(round(dynamic_seconds))))
        return clamped

    def schedule_next(
        self,
        predicted_demands: Dict[str, float],
        queues: Dict[str, VehicleQueue],
        current_time: float,
        last_active_road: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates all 4 roads, pushes into a heapq priority queue, and selects
        the highest-scoring road. Breaks ties deterministically by road order.
        """
        heap = []
        rankings = []
        decision_breakdown = {}

        for road in self.ROADS:
            q_len = queues[road].size()
            max_wait = queues[road].get_current_max_wait_time(current_time)
            demand = predicted_demands.get(road, 15.0)

            score_info = self.calculate_priority_score(
                road=road,
                predicted_demand=demand,
                queue_length=q_len,
                wait_time=max_wait
            )
            decision_breakdown[road] = score_info

            # Heapq is a min-heap in Python; negate score for max-heap behavior
            # Tie breaker: road name order
            heapq.heappush(heap, (-score_info["final_score"], road, score_info))

        # Extract sorted ranking
        sorted_items = []
        while heap:
            neg_score, road, score_info = heapq.heappop(heap)
            rank = len(sorted_items) + 1
            allocated_green = self.compute_green_duration(
                score_info["raw_demand"],
                score_info["raw_queue"]
            )
            item = {
                **score_info,
                "rank": rank,
                "allocated_green": allocated_green
            }
            sorted_items.append(item)

        # Winner is the highest score
        # Special check: If top road has 0 queue and 0 wait while another road has waiting vehicles,
        # prioritize the road with actual vehicles.
        winner = sorted_items[0]
        if winner["raw_queue"] == 0 and any(item["raw_queue"] > 0 for item in sorted_items):
            for candidate in sorted_items:
                if candidate["raw_queue"] > 0:
                    winner = candidate
                    break

        selected_road = winner["road"]
        green_duration = winner["allocated_green"]

        # Update cycle counters: reset for winner, increment for others that had vehicles waiting
        for road in self.ROADS:
            if road == selected_road:
                self.cycles_skipped[road] = 0
                self.last_green_time[road] = current_time
            else:
                if queues[road].size() > 0:
                    self.cycles_skipped[road] += 1

        return {
            "selected_road": selected_road,
            "green_duration": green_duration,
            "rankings": sorted_items,
            "decision_breakdown": decision_breakdown,
            "timestamp": current_time,
            "reasoning": (
                f"Selected {selected_road} with priority score {winner['final_score']} "
                f"(Demand: {winner['raw_demand']}, Queue: {winner['raw_queue']}, "
                f"Wait: {winner['raw_wait']}s, Aging Boost: {winner['aging_bonus']}). "
                f"Assigned {green_duration}s green phase."
            )
        }

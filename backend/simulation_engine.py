"""
Simulation Engine Module for Adaptive Traffic Signal Optimizer
Implements:
1. Four-way intersection traffic simulator (North, South, East, West)
2. Realistic vehicle arrival generator using Poisson process with reproducible seed
3. Realistic discharge rate (~1 vehicle every 2.2 seconds during green)
4. Controllers:
   - Fixed-Time (Cycle North -> South -> East -> West with fixed green duration)
   - Adaptive Controller (ML demand prediction, Priority Queue, Dynamic Green, Aging Safeguard)
5. Head-to-head fair benchmark running BOTH controllers on the IDENTICAL vehicle arrival sequence
"""

import math
import random
from typing import Dict, Any, List, Optional, Tuple
from backend.data_structures import Vehicle, VehicleQueue, PriorityQueueScheduler

class TrafficSimulation:
    ROADS = ["North", "South", "East", "West"]

    def __init__(
        self,
        duration_seconds: int = 300,
        time_step: float = 1.0,
        fixed_green: int = 30,
        amber_time: int = 3,
        clearance_time: int = 2,
        min_green: int = 10,
        max_green: int = 50,
        discharge_rate: float = 0.45,  # vehicles per second (~1 vehicle every 2.2s)
        seed: int = 42
    ):
        self.duration_seconds = duration_seconds
        self.time_step = time_step
        self.fixed_green = fixed_green
        self.amber_time = amber_time
        self.clearance_time = clearance_time
        self.min_green = min_green
        self.max_green = max_green
        self.discharge_rate = discharge_rate
        self.seed = seed

    def generate_arrival_schedule(
        self,
        arrival_rates_per_min: Dict[str, float],
        duration: int
    ) -> Dict[str, List[float]]:
        """
        Pre-generates deterministic timestamped arrival events for each road.
        Ensures Fixed-Time and Adaptive controllers encounter the EXACT SAME vehicle arrivals.
        """
        rng = random.Random(self.seed)
        schedule: Dict[str, List[float]] = {r: [] for r in self.ROADS}

        for road in self.ROADS:
            rate_per_sec = arrival_rates_per_min.get(road, 15.0) / 60.0
            t = 0.0
            while t < duration:
                # Exponential inter-arrival time (Poisson process)
                if rate_per_sec <= 0:
                    break
                inter_arrival = rng.expovariate(rate_per_sec)
                t += inter_arrival
                if t < duration:
                    schedule[road].append(round(t, 2))

        return schedule

    def run_simulation(
        self,
        mode: str = "adaptive",  # "adaptive" or "fixed"
        arrival_schedule: Optional[Dict[str, List[float]]] = None,
        predicted_demands: Optional[Dict[str, float]] = None,
        scheduler_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Runs complete simulation for the specified controller.
        Tracks second-by-second signal state, queue lengths, vehicle discharges, and wait times.
        """
        # If no arrival schedule provided, generate standard one
        if arrival_schedule is None:
            default_rates = {"North": 22.0, "South": 20.0, "East": 14.0, "West": 10.0}
            arrival_schedule = self.generate_arrival_schedule(default_rates, self.duration_seconds)

        demands = predicted_demands or {"North": 22.0, "South": 20.0, "East": 14.0, "West": 10.0}

        # Initialize FIFO queues for each road
        queues: Dict[str, VehicleQueue] = {r: VehicleQueue(r) for r in self.ROADS}

        # Prepare scheduler for adaptive mode
        weights = scheduler_weights or {"w1": 0.40, "w2": 0.35, "w3": 0.25}
        adaptive_scheduler = PriorityQueueScheduler(
            w1=weights.get("w1", 0.40),
            w2=weights.get("w2", 0.35),
            w3=weights.get("w3", 0.25),
            min_green=self.min_green,
            max_green=self.max_green,
            starvation_threshold=80.0
        )

        # Simulation state
        current_time = 0.0
        active_road = "North"
        signal_state = "GREEN"  # "GREEN", "AMBER", "CLEARANCE"
        phase_time_remaining = self.fixed_green if mode == "fixed" else self.min_green
        current_green_duration = phase_time_remaining

        fixed_road_index = 0
        fixed_sequence = ["North", "South", "East", "West"]

        # If adaptive, make initial scheduling choice
        if mode == "adaptive":
            decision = adaptive_scheduler.schedule_next(demands, queues, current_time)
            active_road = decision["selected_road"]
            current_green_duration = decision["green_duration"]
            phase_time_remaining = current_green_duration

        # Metrics recording
        timeline: List[Dict[str, Any]] = []
        phase_transitions: List[Dict[str, Any]] = []
        discharge_accumulator = 0.0

        served_vehicles: List[Vehicle] = []
        queue_samples: List[Dict[str, int]] = []

        # Convert schedule into vehicle objects waiting to arrive
        arrival_pointers = {r: 0 for r in self.ROADS}

        while current_time <= self.duration_seconds:
            # 1. Enqueue new arrivals for this time step
            for road in self.ROADS:
                times = arrival_schedule[road]
                ptr = arrival_pointers[road]
                while ptr < len(times) and times[ptr] <= current_time:
                    veh = Vehicle(
                        vehicle_id=f"{road}-{ptr+1}",
                        road=road,
                        arrival_time=times[ptr]
                    )
                    queues[road].enqueue(veh)
                    ptr += 1
                arrival_pointers[road] = ptr

            # 2. Discharge vehicles from the active road if signal is GREEN
            if signal_state == "GREEN":
                discharge_accumulator += self.discharge_rate * self.time_step
                while discharge_accumulator >= 1.0 and not queues[active_road].is_empty():
                    discharged = queues[active_road].dequeue(current_time)
                    if discharged:
                        served_vehicles.append(discharged)
                    discharge_accumulator -= 1.0

            # 3. Advance phase timer
            phase_time_remaining -= self.time_step

            # 4. Handle Phase Transitions
            if phase_time_remaining <= 0:
                discharge_accumulator = 0.0  # reset partial vehicle accumulation

                if signal_state == "GREEN":
                    # Transition to AMBER
                    signal_state = "AMBER"
                    phase_time_remaining = self.amber_time
                    phase_transitions.append({
                        "time": round(current_time, 1),
                        "road": active_road,
                        "state": "AMBER",
                        "duration": self.amber_time
                    })

                elif signal_state == "AMBER":
                    # Transition to ALL-RED CLEARANCE
                    signal_state = "CLEARANCE"
                    phase_time_remaining = self.clearance_time
                    phase_transitions.append({
                        "time": round(current_time, 1),
                        "road": active_road,
                        "state": "CLEARANCE",
                        "duration": self.clearance_time
                    })

                elif signal_state == "CLEARANCE":
                    # Select next road!
                    if mode == "fixed":
                        fixed_road_index = (fixed_road_index + 1) % len(fixed_sequence)
                        active_road = fixed_sequence[fixed_road_index]
                        current_green_duration = self.fixed_green
                        phase_time_remaining = current_green_duration
                        signal_state = "GREEN"
                        phase_transitions.append({
                            "time": round(current_time, 1),
                            "road": active_road,
                            "state": "GREEN",
                            "duration": current_green_duration,
                            "reason": "Round-robin fixed schedule"
                        })
                    else:
                        # Adaptive Controller Decision
                        decision = adaptive_scheduler.schedule_next(
                            predicted_demands=demands,
                            queues=queues,
                            current_time=current_time,
                            last_active_road=active_road
                        )
                        active_road = decision["selected_road"]
                        current_green_duration = decision["green_duration"]
                        phase_time_remaining = current_green_duration
                        signal_state = "GREEN"
                        phase_transitions.append({
                            "time": round(current_time, 1),
                            "road": active_road,
                            "state": "GREEN",
                            "duration": current_green_duration,
                            "reason": decision["reasoning"],
                            "rankings": decision["rankings"]
                        })

            # 5. Record periodic timeline state (every 5 seconds for chart efficiency)
            if int(current_time) % 5 == 0 or current_time == self.duration_seconds:
                current_total_queue = sum(queues[r].size() for r in self.ROADS)
                q_dict = {f"{r.lower()}_queue": queues[r].size() for r in self.ROADS}
                q_dict["total_queue"] = current_total_queue
                q_dict["time"] = int(current_time)
                q_dict["active_road"] = active_road
                q_dict["signal_state"] = signal_state
                timeline.append(q_dict)

            current_time += self.time_step

        # Final summary metrics calculation
        total_served = len(served_vehicles)
        total_waiting_time = sum(v.waiting_time for v in served_vehicles)
        avg_wait_time = (total_waiting_time / total_served) if total_served > 0 else 0.0

        # Include unserved vehicles waiting in queues
        unserved_count = sum(queues[r].size() for r in self.ROADS)
        unserved_wait = 0.0
        for road in self.ROADS:
            unserved_wait += sum(max(0.0, self.duration_seconds - v.arrival_time) for v in queues[road].queue)

        grand_total_vehicles = total_served + unserved_count
        grand_total_wait = total_waiting_time + unserved_wait
        overall_avg_wait_time = (grand_total_wait / grand_total_vehicles) if grand_total_vehicles > 0 else 0.0

        # Queue length metrics from timeline
        all_queues = [t["total_queue"] for t in timeline]
        avg_queue_len = sum(all_queues) / len(all_queues) if all_queues else 0.0
        max_queue_len = max(all_queues) if all_queues else 0

        # Throughput: vehicles served per minute
        sim_minutes = self.duration_seconds / 60.0
        throughput_vpm = total_served / sim_minutes if sim_minutes > 0 else 0.0

        # Per road metrics
        road_breakdowns = {}
        for road in self.ROADS:
            road_served = [v for v in served_vehicles if v.road == road]
            r_served_count = len(road_served)
            r_served_wait = sum(v.waiting_time for v in road_served)
            r_avg_wait = (r_served_wait / r_served_count) if r_served_count > 0 else 0.0
            road_breakdowns[road] = {
                "served": r_served_count,
                "remaining_queue": queues[road].size(),
                "avg_wait_time": round(r_avg_wait, 1),
                "total_wait_time": round(r_served_wait, 1)
            }

        return {
            "mode": mode,
            "duration_seconds": self.duration_seconds,
            "total_served": total_served,
            "unserved_vehicles": unserved_count,
            "avg_wait_time": round(avg_wait_time, 2),
            "overall_avg_wait_time": round(overall_avg_wait_time, 2),
            "total_waiting_time": round(total_waiting_time, 1),
            "avg_queue_length": round(avg_queue_len, 2),
            "max_queue_length": int(max_queue_len),
            "throughput_vpm": round(throughput_vpm, 2),
            "road_breakdowns": road_breakdowns,
            "timeline": timeline,
            "phase_transitions": phase_transitions,
            "final_queues": {r: queues[r].size() for r in self.ROADS}
        }

    def run_comparison(
        self,
        predicted_demands: Optional[Dict[str, float]] = None,
        scheduler_weights: Optional[Dict[str, float]] = None,
        custom_rates: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Executes BOTH Fixed-Time and Adaptive controllers on the EXACT SAME pre-generated arrival sequence.
        Calculates honest differences and percentage improvements relative to Fixed-Time.
        """
        rates = custom_rates or {"North": 24.0, "South": 22.0, "East": 15.0, "West": 11.0}
        schedule = self.generate_arrival_schedule(rates, self.duration_seconds)

        # 1. Run Fixed-Time
        fixed_result = self.run_simulation(
            mode="fixed",
            arrival_schedule=schedule,
            predicted_demands=predicted_demands,
            scheduler_weights=scheduler_weights
        )

        # 2. Run Adaptive
        adaptive_result = self.run_simulation(
            mode="adaptive",
            arrival_schedule=schedule,
            predicted_demands=predicted_demands,
            scheduler_weights=scheduler_weights
        )

        # Calculate percentage differences (Fixed = baseline)
        def calc_pct_change(fixed_val: float, adapt_val: float, lower_is_better: bool = True) -> Dict[str, Any]:
            if fixed_val == 0:
                diff = adapt_val - fixed_val
                return {"diff": diff, "pct": 0.0, "improved": diff < 0 if lower_is_better else diff > 0}
            pct = ((adapt_val - fixed_val) / fixed_val) * 100.0
            # For wait time or queue: lower is better (negative pct change is improvement)
            improved = (pct < 0) if lower_is_better else (pct > 0)
            return {
                "diff": round(adapt_val - fixed_val, 2),
                "pct": round(pct, 1),
                "improved": improved
            }

        wait_comp = calc_pct_change(fixed_result["avg_wait_time"], adaptive_result["avg_wait_time"], lower_is_better=True)
        queue_comp = calc_pct_change(fixed_result["avg_queue_length"], adaptive_result["avg_queue_length"], lower_is_better=True)
        served_comp = calc_pct_change(fixed_result["total_served"], adaptive_result["total_served"], lower_is_better=False)
        throughput_comp = calc_pct_change(fixed_result["throughput_vpm"], adaptive_result["throughput_vpm"], lower_is_better=False)

        # Merge timelines for comparison chart
        merged_timeline = []
        max_len = min(len(fixed_result["timeline"]), len(adaptive_result["timeline"]))
        for i in range(max_len):
            f_point = fixed_result["timeline"][i]
            a_point = adaptive_result["timeline"][i]
            merged_timeline.append({
                "time": f_point["time"],
                "fixed_total_queue": f_point["total_queue"],
                "adaptive_total_queue": a_point["total_queue"],
                "fixed_north": f_point["north_queue"],
                "adaptive_north": a_point["north_queue"],
                "fixed_south": f_point["south_queue"],
                "adaptive_south": a_point["south_queue"],
                "fixed_east": f_point["east_queue"],
                "adaptive_east": a_point["east_queue"],
                "fixed_west": f_point["west_queue"],
                "adaptive_west": a_point["west_queue"],
            })

        summary_text = (
            f"The adaptive controller served {adaptive_result['total_served']} vehicles, "
            f"compared with {fixed_result['total_served']} for the fixed-time controller. "
            f"Average waiting time changed by {wait_comp['pct']}% ({adaptive_result['avg_wait_time']}s vs {fixed_result['avg_wait_time']}s), "
            f"and average queue length changed by {queue_comp['pct']}% under the tested simulation conditions ({self.duration_seconds}s run, identical arrival sequence)."
        )

        return {
            "success": True,
            "duration_seconds": self.duration_seconds,
            "seed": self.seed,
            "arrival_rates": rates,
            "fixed_results": fixed_result,
            "adaptive_results": adaptive_result,
            "comparisons": {
                "avg_wait_time": wait_comp,
                "avg_queue_length": queue_comp,
                "total_served": served_comp,
                "throughput_vpm": throughput_comp
            },
            "merged_timeline": merged_timeline,
            "summary_text": summary_text,
            "disclaimer": "Simulation results generated under standardized arrival conditions; real-world field improvements depend on actual traffic geometry and driver compliance."
        }

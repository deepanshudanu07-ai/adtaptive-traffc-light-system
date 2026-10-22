# Adaptive Traffic Signal Optimizer
## Academic Full-Stack University Project (BCA AI & Data Science)

The **Adaptive Traffic Signal Optimizer** is an academic software system designed to eliminate unnecessary delays at a four-way intersection (North, South, East, West). Instead of cycling through fixed green durations, the system uses **historical interval observations**, **Scikit-learn machine learning regression**, and **Queue / Priority Queue data structures** to dynamically calculate green-light durations and grant priority to approaches with high demand while preventing starvation.

---

## 1. Key Features

- **30-Day Historical Traffic Dataset**: Synthetically generated or real CSV uploaded observations covering morning/evening peaks, weekend drops, speed-congestion curves, and directional variations.
- **Machine Learning Demand Prediction**: Trainable Scikit-learn `RandomForestRegressor` with chronological train/test split (no lookahead data leakage), lag features, and regression evaluation (MAE, MSE, RMSE, R²).
- **FIFO Queues**: Individual First-In, First-Out queues for each road approach using `collections.deque`.
- **Heapq Priority Queue Scheduler**: Max-heap ranking based on normalized demand, queue length, and waiting urgency:
  $$\text{Priority Score} = w_1 \cdot \text{Demand} + w_2 \cdot \text{Queue} + w_3 \cdot \text{Wait} + \text{Aging}$$
- **Starvation Prevention (Aging)**: Safeguard boost ensures low-volume roads are never ignored indefinitely when waiting exceeds threshold.
- **Dynamic Green-Light Duration**: Dynamically bounded between configured minimum (e.g., 10s) and maximum (e.g., 50s) limits.
- **Four-Way Intersection Simulation**: Interactive top-down animated intersection with lane markings, stop lines, traffic lights, and vehicles discharging at a realistic physical service rate (~0.45 veh/sec).
- **Fair Head-to-Head Comparison**: Compares Fixed-Time vs. Adaptive controllers under the **identical vehicle arrival sequence and seed**, displaying percentage change in waiting times, queue lengths, and throughput.
- **University Viva Support**: 15+ student-friendly viva questions and answers covering algorithms, metrics, and limitations.

---

## 2. System Architecture

```
Historical Traffic Data (CSV / Demo 30 Days)
   ↓
Data Preprocessing & Cleaning (Pandas, Missing Imputation, Duplicates)
   ↓
Chronological Feature Engineering (Lags, Hour, Day, Road One-Hot)
   ↓
Machine Learning Model (Scikit-learn RandomForestRegressor)
   ↓
Predicted Traffic Demand (North, South, East, West)
   ↓
Priority Queue Scheduler (heapq Max-Heap + Aging Safeguard)
   ↓
Dynamic Green-Time Calculation [G_min, G_max]
   ↓
Four-Way Traffic Simulation (FIFO Vehicle Queues, Physical Discharge Rate)
   ↓
Performance Evaluation & Comparison (vs. Fixed-Time Baseline on Identical Arrivals)
   ↓
Interactive Dashboard, Recharts Visualizations, and Export Reports
```

---

## 3. Technology Stack

- **Machine Learning & Simulation Backend**: Python 3, Pandas, NumPy, Scikit-learn, heapq, Flask
- **Full-Stack Server**: Node.js, Express, tsx, child_process
- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Academic Tools**: Jupyter Notebook (`notebooks/traffic_analysis.ipynb`)

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js (v18+)
- Python 3.10+ with `pandas`, `numpy`, `scikit-learn`, `flask`

### Run Application in Current Environment
```bash
# Start full-stack application (Express + Vite on Port 3000)
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Run Python Unit Tests
```bash
python3 -m unittest tests/test_traffic.py
```

### Standalone Python Flask Backend (Optional)
```bash
python3 backend/api.py
```

---

## 5. How to Demonstrate the Project in Viva

1. **Dataset**: Navigate to **Traffic Data**, review the 30-day hourly observations and EDA charts showing commuter peaks. Download sample CSV template or upload your own.
2. **Train Model**: Navigate to **Machine Learning**, click **Train Model**, review the chronological train/test split, MAE, RMSE, and R² metrics, and observe feature importance rankings.
3. **Inspect Priority Formula**: Navigate to **Signal Optimization**, adjust weight sliders ($w_1, w_2, w_3$), and view the aging safeguard promoting neglected roads.
4. **Run Live Simulation**: Navigate to **Live Simulation**, press **Start**, toggle between Adaptive and Fixed-Time, and observe queues discharging in FIFO order.
5. **Demonstrate Benchmark**: Open **Performance Comparison**, run the head-to-head evaluation, and explain how the adaptive controller reduced average waiting times under the identical vehicle arrival stream.
6. **Viva Q&A**: Open **Reports & Viva Docs** for the 15 questions and answers and download the full academic JSON report.

---

## 6. Assumptions & Limitations

- Evaluated in software simulation rather than physical hardware.
- Assumes standard driver headway and clearance intervals without pedestrian crossing buttons or emergency preemption sirens.
- Designed as an academic software demonstration for university submission.

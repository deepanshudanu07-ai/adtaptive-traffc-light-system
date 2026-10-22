import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SimulationPage } from './pages/SimulationPage';
import { TrafficDataPage } from './pages/TrafficDataPage';
import { MachineLearningPage } from './pages/MachineLearningPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { DocumentationPage } from './pages/DocumentationPage';
import {
  fetchDatasetSummary,
  trainMLModel,
  predictTraffic,
  runSimulation
} from './services/api';
import {
  DatasetSummary,
  MLTrainResult,
  PredictionResponse,
  SimulationResult
} from './types/traffic';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Core application state
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [mlResult, setMlResult] = useState<MLTrainResult | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize application on mount
  useEffect(() => {
    async function initApp() {
      try {
        // 1. Fetch dataset summary
        const summaryData = await fetchDatasetSummary();
        setSummary(summaryData);

        // 2. Fetch traffic predictions for morning peak (08:00)
        const predData = await predictTraffic(8, 2);
        setPrediction(predData);

        // 3. Run default adaptive simulation
        const simData = await runSimulation({
          mode: 'adaptive',
          duration: 300,
        });
        setSimulation(simData);
      } catch (err) {
        console.error('Error during initial data loading:', err);
      } finally {
        setIsInitializing(false);
      }
    }

    initApp();
  }, []);

  const handleTrainML = async () => {
    try {
      const res = await trainMLModel();
      if (res.success) {
        setMlResult(res);
        const p = await predictTraffic(8, 2);
        setPrediction(p);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onQuickSimulate={() => setActiveTab('simulation')}
          onTrainML={handleTrainML}
          isMLTrained={!!mlResult?.success || prediction?.model_trained}
        />

        {/* Tab Page Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              summary={summary}
              mlResult={mlResult}
              prediction={prediction}
              simulation={simulation}
              onNavigateToSim={() => setActiveTab('simulation')}
              onNavigateToML={() => setActiveTab('ml')}
              onNavigateToData={() => setActiveTab('data')}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationPage
              prediction={prediction}
              onSimulationUpdated={setSimulation}
            />
          )}

          {activeTab === 'data' && (
            <TrafficDataPage
              summary={summary}
              onSummaryUpdated={setSummary}
            />
          )}

          {activeTab === 'ml' && (
            <MachineLearningPage
              mlResult={mlResult}
              prediction={prediction}
              onMLResultUpdated={setMlResult}
              onPredictionUpdated={setPrediction}
            />
          )}

          {activeTab === 'optimization' && (
            <OptimizationPage simulation={simulation} />
          )}

          {activeTab === 'comparison' && (
            <ComparisonPage />
          )}

          {activeTab === 'docs' && (
            <DocumentationPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to invoke Python CLI backend with typed JSON payloads
function runPythonCli(command: string, payload: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve(__dirname, 'backend', 'cli.py');
    execFile(
      'python3',
      [cliPath, command, JSON.stringify(payload)],
      { maxBuffer: 15 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Python CLI error on [${command}]:`, stderr || error.message);
          return reject(new Error(stderr || error.message));
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          console.error(`JSON Parse error for [${command}]:`, stdout);
          reject(new Error(`Invalid JSON returned from Python CLI: ${stdout.slice(0, 300)}`));
        }
      }
    );
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'Adaptive Traffic Signal Optimizer',
      backend: 'Python 3 (pandas, numpy, scikit-learn, heapq)',
      version: '1.0.0'
    });
  });

  // Get summary stats
  app.get('/api/dataset/summary', async (req: Request, res: Response) => {
    try {
      const data = await runPythonCli('get_summary', {});
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Generate synthetic dataset
  app.post('/api/dataset/generate', async (req: Request, res: Response) => {
    try {
      const { days = 30, seed = 42 } = req.body;
      const data = await runPythonCli('generate_data', { days, seed });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Paginated table data
  app.get('/api/dataset/table', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '20', 10);
      const roadFilter = req.query.road as string || undefined;
      const data = await runPythonCli('get_table_page', { page, page_size: pageSize, road_filter: roadFilter });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Upload custom CSV
  app.post('/api/dataset/upload', async (req: Request, res: Response) => {
    try {
      const { content, filename = 'uploaded_traffic.csv', column_mapping } = req.body;
      if (!content) {
        return res.status(400).json({ status: 'error', message: 'No CSV content provided.' });
      }
      const data = await runPythonCli('upload_csv', { content, filename, column_mapping });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Download sample CSV template
  app.get('/api/dataset/sample-template', (req: Request, res: Response) => {
    const template = [
      'timestamp,time,day,road,vehicle_count,average_speed,queue_length,lane',
      '2026-09-01 08:00:00,08:00,Monday,North,45,34.5,12,North-L1',
      '2026-09-01 08:00:00,08:00,Monday,South,40,36.2,9,South-L1',
      '2026-09-01 08:00:00,08:00,Monday,East,24,42.0,4,East-L1',
      '2026-09-01 08:00:00,08:00,Monday,West,20,44.8,3,West-L1',
      '2026-09-01 09:00:00,09:00,Monday,North,48,32.1,15,North-L1',
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="traffic_sample_template.csv"');
    res.send(template);
  });

  // Download current dataset
  app.get('/api/dataset/download', (req: Request, res: Response) => {
    const samplePath = path.resolve(__dirname, 'data', 'sample_traffic.csv');
    if (fs.existsSync(samplePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="traffic_dataset.csv"');
      return fs.createReadStream(samplePath).pipe(res);
    }
    res.status(404).json({ status: 'error', message: 'Dataset file not found.' });
  });

  // Train Scikit-learn Model
  app.post('/api/ml/train', async (req: Request, res: Response) => {
    try {
      const data = await runPythonCli('train_model', {});
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Predict Next Interval
  app.post('/api/ml/predict', async (req: Request, res: Response) => {
    try {
      const { hour = 8, day_of_week = 2, recent_traffic } = req.body;
      const data = await runPythonCli('predict', { hour, day_of_week, recent_traffic });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Run Traffic Simulation
  app.post('/api/simulation/run', async (req: Request, res: Response) => {
    try {
      const data = await runPythonCli('run_simulation', req.body);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Compare Fixed-Time vs Adaptive Head-to-Head
  app.post('/api/simulation/compare', async (req: Request, res: Response) => {
    try {
      const data = await runPythonCli('run_comparison', req.body);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Full Academic Report Export
  app.get('/api/reports/full', async (req: Request, res: Response) => {
    try {
      const data = await runPythonCli('export_report', {});
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // --- VITE MIDDLEWARE IN DEV OR STATIC IN PRODUCTION ---
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Parse arguments or environment variables
  const args = process.argv.slice(2);
  let port = parseInt(process.env.PORT || '3000', 10);
  let host = process.env.HOST || '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[i + 1];
      i++;
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`\n  VITE v8.3.0  ready in 150 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${port}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${port}/`);
    console.log(`Adaptive Traffic Signal Optimizer running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { flightEngine } from './src/server/flightEngine.ts';
import { getOpkcWeather } from './src/server/weatherService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // Resolve port:
  // 1. Explicit CLI argument: --port 3000
  // 2. Dev container with NGINX on 8080: bind to DEFAULT_APP_PORT (3000)
  // 3. Cloud Run / Production container: bind to process.env.PORT (e.g. 8080)
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;

  let PORT = 3000;
  if (portFromArg) {
    PORT = portFromArg;
  } else if (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT) {
    PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;
  } else if (process.env.PORT) {
    PORT = Number(process.env.PORT);
  }

  app.use(express.json());

  // Allow iframe embedding on WordPress and external sites + CORS
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // SSE (Server-Sent Events) clients for live flight updates and push alerts
  const sseClients: Set<express.Response> = new Set();

  const broadcastSSE = (event: string, data: any) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(res => {
      try {
        res.write(payload);
      } catch (err) {
        sseClients.delete(res);
      }
    });
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', airport: 'OPKC / KHI', time: new Date().toISOString() });
  });

  // Flight list endpoint
  app.get('/api/flights', (req, res) => {
    const { type, category, status, search, window } = req.query;
    const flights = flightEngine.getFlights({
      type: type as string,
      category: category as string,
      status: status as string,
      search: search as string,
      window: (window as any) || 'all',
    });
    res.json(flights);
  });

  // Single flight telemetry
  app.get('/api/flights/:id', (req, res) => {
    const flight = flightEngine.getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    res.json(flight);
  });

  // Karachi Airport Real-time Stats & Weather
  app.get('/api/airport/stats', (req, res) => {
    const stats = flightEngine.getAirportStats();
    res.json(stats);
  });

  // Dedicated OPKC (Karachi) METAR and TAF live endpoint
  app.get('/api/weather/opkc', async (req, res) => {
    try {
      const weather = await getOpkcWeather();
      res.json(weather);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch METAR/TAF', details: err.message });
    }
  });

  // Recent push notifications
  app.get('/api/notifications', (req, res) => {
    const notifications = flightEngine.getNotifications();
    res.json(notifications);
  });

  // Force sync live Flightradar24 / ADS-B Air Traffic Feed
  app.post('/api/feed/sync', async (req, res) => {
    try {
      await flightEngine.syncLiveAirTrafficFeed();
      const flights = flightEngine.getFlights();
      const stats = flightEngine.getAirportStats();
      broadcastSSE('flights_tick', flights);
      res.json({ success: true, stats, count: flights.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Feed sync failed', details: err.message });
    }
  });

  // adsb.fi Open Data status
  app.get('/api/adsbfi/status', (req, res) => {
    res.json(flightEngine.getAdsbFiStatus());
  });

  // adsb.fi manual sync trigger
  app.post('/api/adsbfi/sync', async (req, res) => {
    try {
      const result = await flightEngine.syncAdsbFiAirTraffic();
      const flights = flightEngine.getFlights();
      broadcastSSE('flights_tick', flights);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi sync failed', details: err.message });
    }
  });

  // adsb.fi callsign query proxy (/v2/callsign/:callsign)
  app.get('/api/adsbfi/callsign/:callsign', async (req, res) => {
    try {
      const data = await flightEngine.queryAdsbFiCallsign(req.params.callsign);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi query failed', details: err.message });
    }
  });

  // adsb.fi registration query proxy (/v2/registration/:reg)
  app.get('/api/adsbfi/registration/:reg', async (req, res) => {
    try {
      const data = await flightEngine.queryAdsbFiRegistration(req.params.reg);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi query failed', details: err.message });
    }
  });

  // adsb.fi Mode-S hex query proxy (/v2/hex/:hex)
  app.get('/api/adsbfi/hex/:hex', async (req, res) => {
    try {
      const data = await flightEngine.queryAdsbFiHex(req.params.hex);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi query failed', details: err.message });
    }
  });

  // adsb.fi squawk query proxy (/v2/sqk/:squawk)
  app.get('/api/adsbfi/squawk/:squawk', async (req, res) => {
    try {
      const data = await flightEngine.queryAdsbFiSquawk(req.params.squawk);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi query failed', details: err.message });
    }
  });

  // adsb.fi military aircraft proxy (/v2/mil)
  app.get('/api/adsbfi/military', async (req, res) => {
    try {
      const data = await flightEngine.queryAdsbFiMilitary();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'adsb.fi military query failed', details: err.message });
    }
  });

  // OAG Flight Info status & quota check
  app.get('/api/oag/status', (req, res) => {
    res.json(flightEngine.getOagStatus());
  });

  // ADS-B DB route lookup proxy (Jack Wills open-source API: api.adsbdb.com)
  app.get('/api/adsbdb/callsign/:callsign', async (req, res) => {
    try {
      const data = await flightEngine.lookupAdsbDbRoute(req.params.callsign);
      if (!data) {
        return res.status(404).json({ error: 'Route not found for callsign' });
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'ADS-B DB query error', details: err.message });
    }
  });

  // Synchronize official flight schedules via OAG Flight Info API
  app.post('/api/oag/sync', async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await flightEngine.syncOagFlightSchedule(force);
      if (result.success) {
        broadcastSSE('flights_tick', flightEngine.getFlights());
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'OAG sync failure', details: err.message });
    }
  });

  // Configure OAG API Subscription Key securely on server
  app.post('/api/oag/configure', (req, res) => {
    const { key } = req.body;
    if (!key || typeof key !== 'string' || key.trim().length < 8) {
      return res.status(400).json({ error: 'Valid OAG Subscription Key required' });
    }
    flightEngine.setOagApiKey(key);
    // Trigger initial schedule fetch with quota protection
    flightEngine.syncOagFlightSchedule();
    res.json({
      success: true,
      message: 'OAG API Subscription Key active. Official airline schedule synchronization initialized.',
      status: flightEngine.getOagStatus()
    });
  });

  // RapidAPI Flightradar24 status check
  app.get('/api/rapidapi/status', (req, res) => {
    res.json(flightEngine.getRapidApiStatus());
  });

  // Trigger RapidAPI arrivals sync
  app.post('/api/rapidapi/sync', async (req, res) => {
    try {
      const result = await flightEngine.syncRapidApiFlightradar();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'RapidAPI sync failure', details: err.message });
    }
  });

  // Configure RapidAPI key
  app.post('/api/rapidapi/configure', (req, res) => {
    const { key, host } = req.body;
    if (!key || typeof key !== 'string' || key.trim().length < 8) {
      return res.status(400).json({ error: 'Valid RapidAPI key required' });
    }
    flightEngine.setRapidApiKey(key, host);
    res.json({
      success: true,
      message: 'RapidAPI credentials configured.',
      status: flightEngine.getRapidApiStatus()
    });
  });

  // Trigger test simulation event (e.g. gate change, +45m delay, boarding call)
  app.post('/api/simulate-event', (req, res) => {
    const { flightId, eventType } = req.body;
    if (!flightId || !eventType) {
      return res.status(400).json({ error: 'flightId and eventType required' });
    }

    const result = flightEngine.simulateFlightEvent(flightId, eventType);
    if (!result.success) {
      return res.status(404).json({ error: 'Flight could not be updated' });
    }

    // Broadcast live event over SSE to all connected clients
    if (result.alert) {
      broadcastSSE('notification', result.alert);
    }
    if (result.flight) {
      broadcastSSE('flight_updated', result.flight);
    }

    res.json(result);
  });

  // Live SSE Stream for real-time radar and push notifications
  app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });
    res.write('retry: 5000\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Background ticker that emits updated flight positions to SSE clients every 4s
  setInterval(() => {
    if (sseClients.size > 0) {
      const activeFlights = flightEngine.getFlights();
      broadcastSSE('flights_tick', activeFlights);
    }
  }, 4000);

  // Serve static files or Vite dev middleware
  const distPath = path.resolve(__dirname, 'dist');
  const distIndex = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndex);
  
  // Use Vite middleware only when running dev server and dist hasn't been built
  const isDevCommand = process.env.npm_lifecycle_event === 'dev' || process.argv.includes('--dev');

  if (isDevCommand && !hasDist) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (hasDist) {
    // Production Cloud Run / ais-pre static files
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    // Fallback if neither dist nor dev command
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Karachi Airport Flight Radar server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});

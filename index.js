const http = require('http');
const os = require('os');
const client = require('prom-client');

const PORT = process.env.PORT || 3000;

// ─── PROMETHEUS METRICS ────────────────────────────────
const register = new client.Registry();

// Default metrics (CPU, memory, event loop, GC, etc.)
client.collectDefaultMetrics({ register });

// Custom counter — tracks total HTTP requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

// Custom histogram — tracks request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// ─── SERVER ────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const end = httpRequestDuration.startTimer();

  // Metrics endpoint for Prometheus scraping
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': register.contentType });
    res.end(await register.metrics());
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    end({ method: req.method, path: '/health', status: 200 });
    return;
  }

  // Main endpoint
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    // message: 'Hello from EKS!',
    message: 'Hello from Kubernetes mama I love youuu!',
    hostname: os.hostname(),
    timestamp: new Date().toISOString()
  }));


  httpRequestsTotal.inc({ method: req.method, path: req.url, status: 200 });
  end({ method: req.method, path: req.url, status: 200 });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger for local development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/companies', require('./routes/companies'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/masters', require('./routes/masters'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/crm-upload', require('./routes/crmUpload'));
app.use('/api/duplicate-merger', require('./routes/duplicateMerger'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
    mcpGateway: process.env.MCP_URL ? 'Configured' : 'Not configured',
  });
});

// Serve frontend static files
const path = require('path');
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback for SPA routing (excluding API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.method} ${req.url}' was not found.`,
  });
});

// Process-level resilience against crashes
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`CRM Backend Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
  try {
    const { setupUsersTable } = require('./services/setup_users');
    await setupUsersTable();
  } catch (err) {
    console.error('Failed to setup users table on startup:', err.message);
  }
});

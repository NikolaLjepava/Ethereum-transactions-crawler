// src/app.ts
import express from 'express';
import cors from 'cors';
import transactionsRouter from './routes/transactions';


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', transactionsRouter); // Mount at /api

// Serve static frontend files
app.use(express.static('public'));

// Optional: Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
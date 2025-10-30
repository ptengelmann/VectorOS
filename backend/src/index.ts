import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const app: Express = express();
const port = process.env.BACKEND_URL?.split(':').pop() || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'vectoros-backend',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    message: 'VectorOS API v1',
    version: '0.1.0'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`[VectorOS Backend] Server running on port ${port}`);
  console.log(`[VectorOS Backend] Environment: ${process.env.NODE_ENV}`);
});

export default app;

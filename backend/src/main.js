import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './utils/database.js';
import routes from './routes/index.js';
import { errorMiddleware } from './middleware/index.js';
import logger from './utils/logger.js';
import { UPLOAD_DIR } from './utils/paths.js';


const app = express();

const startServer = async () => {
  await connectDB();

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
  });
    
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });

  // Allowed CORS origins.
  // CORS_ORIGIN may be a comma-separated list so that both the Vite dev server
  // (3002) and the vite preview server (3000) work in development. We also
  // allow the deployed Vercel frontend URL in production.
  const defaultOrigins = [
    'https://skill-match-swart-mu.vercel.app',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const allowedOrigins = [...new Set((process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : defaultOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, '')) // normalize trailing slash differences
  )];

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (curl, server-to-server, health checks).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }));
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from uploads directory
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.use('/', routes());
  app.use(errorMiddleware);

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    logger.info(`🚀 API Server running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});


export default app;
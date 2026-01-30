import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { clerkMiddleware } from '@clerk/express';

import { config } from './config/index.js';
import { loadUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import readerRoutes from './routes/readers.js';
import sessionRoutes from './routes/sessions.js';
import paymentRoutes from './routes/payments.js';
import streamRoutes from './routes/streams.js';
import shopRoutes from './routes/shop.js';
import messageRoutes from './routes/messages.js';
import forumRoutes from './routes/forum.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import notificationRoutes from './routes/notifications.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow same-origin (no origin header), configured frontend, and Vercel preview URLs
      if (!origin || origin === config.frontendUrl || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Stripe webhooks need raw body - must be before express.json()
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Logging
  if (config.env !== 'test') {
    app.use(morgan('combined'));
  }

  // Rate limiting for API routes
  app.use('/api', apiLimiter);

  // Clerk authentication middleware
  app.use(clerkMiddleware());

  // Load user from database
  app.use(loadUser);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/readers', readerRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/streams', streamRoutes);
  app.use('/api/shop', shopRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/notifications', notificationRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

export default createApp;

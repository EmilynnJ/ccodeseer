// Vercel serverless function entry point
// This wraps the Express app for Vercel's serverless runtime
import { createApp } from '../server/dist/app.js';

const app = createApp();

export default app;

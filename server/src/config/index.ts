import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  database: {
    url: process.env.DATABASE_URL!,
  },

  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID!,
  },

  agora: {
    appId: process.env.AGORA_APP_ID!,
    appCertificate: process.env.AGORA_APP_CERTIFICATE!,
  },

  ably: {
    apiKey: process.env.ABLY_API_KEY!,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  },

  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
  },

  payment: {
    platformFeePercent: 30, // 30% platform fee, 70% to reader
    minPayoutAmount: 15, // Minimum $15 for payout
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AGORA_APP_ID',
  'AGORA_APP_CERTIFICATE',
  'ABLY_API_KEY',
];

export function validateEnv(): void {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}

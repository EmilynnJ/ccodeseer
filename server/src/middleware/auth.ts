import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth, getAuth } from '@clerk/express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: 'client' | 'reader' | 'admin';
      dbUser?: typeof users.$inferSelect;
      auth?: { userId: string | null; sessionId: string | null; [key: string]: any };
    }
  }
}

// Middleware to load user from database after Clerk authentication
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return next();
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (user) {
      req.userId = user.id;
      req.userRole = user.role;
      req.dbUser = user;
    }

    next();
  } catch (error) {
    console.error('Error loading user:', error);
    next(error);
  }
}

// Require authenticated user
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  next();
}

// Require specific role(s)
export function requireRole(...roles: Array<'client' | 'reader' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
}

// Require admin role
export const requireAdmin = requireRole('admin');

// Require reader role
export const requireReader = requireRole('reader', 'admin');

// Require client role (or any authenticated user)
export const requireClient = requireRole('client', 'reader', 'admin');

// Optional authentication - doesn't fail if not authenticated
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just continue - loadUser will populate user if authenticated
  next();
}

export { requireAuth };

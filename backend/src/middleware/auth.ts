import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // if (!req.user) {
    //   return res.status(401).json({ error: 'Authentication required' });
    // }

    // if (!roles.includes(req.user.role)) {
    //   return res.status(403).json({ error: 'Insufficient permissions' });
    // }

    return next();
  };
};

export const requireProjectAccess = (accessLevel: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const projectId = req.params.projectId || req.body.projectId;
      
      // if (!projectId) {
      //   return res.status(400).json({ error: 'Project ID required' });
      // }

      // if (!req.user) {
      //   return res.status(401).json({ error: 'Authentication required' });
      // }

      // const projectRole = await prisma.projectRole.findUnique({
      //   where: {
      //     userId_projectId: {
      //       userId: req.user.id,
      //       projectId: projectId
      //     }
      //   }
      // });

      // if (!projectRole) {
      //   return res.status(403).json({ error: 'Project access denied' });
      // }

      // // Check access level
      // const accessLevels = {
      //   'OWNER': 4,
      //   'ADMIN': 3,
      //   'MEMBER': 2,
      //   'VIEWER': 1
      // };

      // if (accessLevels[projectRole.role] < accessLevels[accessLevel]) {
      //   return res.status(403).json({ error: 'Insufficient project permissions' });
      // }

      return next();
    } catch (error) {
      console.error('Project access check error:', error);
      return res.status(500).json({ error: 'Project access verification failed' });
    }
  };
};

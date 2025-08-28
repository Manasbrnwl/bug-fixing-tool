import { Router, Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation middleware
const validateUserUpdate = [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('avatar').optional().trim().isURL()
];

// Get all users (admin only)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedTickets: true,
              createdTickets: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user!.id;

    // Users can only view their own profile unless they're admin/manager
    if (userId !== currentUserId && 
        !['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTickets: true,
            createdTickets: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Fetch user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:id', validateUserUpdate, async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const userId = req.params.id;
    const currentUserId = req.user!.id;
    const updateData = req.body;

    // Users can only update their own profile unless they're admin
    if (userId !== currentUserId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user role (admin only)
router.put('/:id/role', [
  body('role').isIn(['ADMIN', 'MANAGER', 'DEVELOPER', 'TESTER'])
], requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const userId = req.params.id;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has any active projects or tickets
    const userActivity = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            assignedTickets: true,
            createdTickets: true,
            projectRoles: true
          }
        }
      }
    });

    if (!userActivity) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userActivity._count.assignedTickets > 0 ||
        userActivity._count.createdTickets > 0 ||
        userActivity._count.projectRoles > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active projects or tickets. Please reassign or close them first.' 
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user!.id;

    // Users can only view their own stats unless they're admin/manager
    if (userId !== currentUserId && 
        !['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [assignedTickets, createdTickets, projectCount] = await Promise.all([
      prisma.ticket.count({
        where: { assignedTo: userId }
      }),
      prisma.ticket.count({
        where: { createdBy: userId }
      }),
      prisma.projectRole.count({
        where: { userId: userId }
      })
    ]);

    const ticketStats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { assignedTo: userId },
      _count: {
        status: true
      }
    });

    const statusStats = ticketStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      stats: {
        assignedTickets,
        createdTickets,
        projectCount,
        statusBreakdown: statusStats
      }
    });
  } catch (error) {
    console.error('Fetch user stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Search users for project assignment
router.get('/search/project-members', [
  query('projectId').notEmpty(),
  query('search').optional().trim()
], async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { projectId, search } = req.query;
    const userId = req.user!.id;

    // Check if user has access to this project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId as string
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Build where clause
    const where: any = {
      id: {
        not: userId // Exclude current user
      }
    };

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true
      },
      take: 10
    });

    return res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;

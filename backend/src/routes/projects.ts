import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../server';
import { authenticateToken, requireRole, requireProjectAccess } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation middleware
const validateProject = [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
];

// Get all projects for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({ projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;

    // Check if user has access to this project
    const projectRole = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId
        }
      }
    });

    if (!projectRole) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true
              }
            }
          }
        },
        tickets: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project });
  } catch (error) {
    console.error('Fetch project error:', error);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', validateProject, async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { name, description } = req.body;
    const userId = req.user!.id;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        createdBy: userId,
        members: {
          create: {
            userId: userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', validateProject, requireProjectAccess('ADMIN'), async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const projectId = req.params.id;
    const { name, description, status } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        status
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', requireProjectAccess('OWNER'), async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;

    await prisma.project.delete({
      where: { id: projectId }
    });

    return res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add member to project
router.post('/:id/members', [
  body('userId').notEmpty(),
  body('role').isIn(['MEMBER', 'ADMIN', 'VIEWER'])
], requireProjectAccess('ADMIN'), async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const projectId = req.params.id;
    const { userId, role } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    const projectRole = await prisma.projectRole.create({
      data: {
        userId: userId,
        projectId: projectId,
        role: role
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Member added successfully',
      member: projectRole
    });
  } catch (error) {
    console.error('Add member error:', error);
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', requireProjectAccess('ADMIN'), async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;

    // Check if trying to remove the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (project?.createdBy === userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    await prisma.projectRole.delete({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId
        }
      }
    });

    return res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Update member role
router.put('/:id/members/:userId', [
  body('role').isIn(['MEMBER', 'ADMIN', 'VIEWER'])
], requireProjectAccess('ADMIN'), async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const projectId = req.params.id;
    const userId = req.params.userId;
    const { role } = req.body;

    // Check if trying to change owner's role
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (project?.createdBy === userId) {
      return res.status(400).json({ error: 'Cannot change project owner role' });
    }

    const projectRole = await prisma.projectRole.update({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return res.json({
      message: 'Member role updated successfully',
      member: projectRole
    });
  } catch (error) {
    console.error('Update member role error:', error);
    return res.status(500).json({ error: 'Failed to update member role' });
  }
});

export default router;

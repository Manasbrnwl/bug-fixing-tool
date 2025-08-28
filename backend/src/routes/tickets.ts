import { Router, Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { prisma } from '../server';
import { authenticateToken, requireProjectAccess } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation middleware
const validateTicket = [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').trim().isLength({ min: 1, max: 2000 }),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('type').isIn(['BUG', 'FEATURE', 'TASK', 'STORY']),
  body('projectId').notEmpty(),
  body('assignedTo').optional().notEmpty(),
  body('dueDate').optional().isISO8601()
];

// Get tickets with search and filtering
router.get('/', [
  query('projectId').optional().notEmpty(),
  query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'RESOLVED', 'CLOSED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'STORY']),
  query('assignedTo').optional().notEmpty(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const {
      projectId,
      status,
      priority,
      type,
      assignedTo,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user!.id;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    // Project filter
    if (projectId) {
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

      where.projectId = projectId;
    } else {
      // Filter by projects user has access to
      const userProjects = await prisma.projectRole.findMany({
        where: { userId: userId },
        select: { projectId: true }
      });

      where.projectId = {
        in: userProjects.map(p => p.projectId)
      };
    }

    // Other filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get tickets with pagination
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          labels: true,
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.ticket.count({ where })
    ]);

    return res.json({
      tickets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get ticket by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user!.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        labels: true,
        comments: {
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
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user has access to this ticket's project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: ticket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    return res.json({ ticket });
  } catch (error) {
    console.error('Fetch ticket error:', error);
    return res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create new ticket
router.post('/', validateTicket, async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { title, description, priority, type, projectId, assignedTo, dueDate } = req.body;
    const userId = req.user!.id;

    // Check if user has access to this project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority,
        type,
        projectId,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate as string) : null,
        createdBy: userId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
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
      }
    });

    return res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'RESOLVED', 'CLOSED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'STORY']),
  body('assignedTo').optional().notEmpty(),
  body('dueDate').optional().isISO8601()
], async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const ticketId = req.params.id;
    const userId = req.user!.id;
    const updateData = req.body;

    // Get the ticket to check access
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user has access to this ticket's project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: existingTicket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Only allow status changes for certain roles or if assigned
    if (updateData.status && 
        projectAccess.role === 'VIEWER' && 
        existingTicket.assignedTo !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions to change status' });
    }

    // Handle due date
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
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
      }
    });

    return res.json({
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Delete ticket
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user!.id;

    // Get the ticket to check access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user has admin access to this project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: ticket.projectId
        }
      }
    });

    if (!projectAccess || (projectAccess.role !== 'ADMIN' && projectAccess.role !== 'OWNER')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete ticket' });
    }

    await prisma.ticket.delete({
      where: { id: ticketId }
    });

    return res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// Add label to ticket
router.post('/:id/labels', [
  body('labelId').notEmpty()
], async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const ticketId = req.params.id;
    const { labelId } = req.body;
    const userId = req.user!.id;

    // Check ticket access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check project access
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: ticket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Check if label exists
    const label = await prisma.label.findUnique({
      where: { id: labelId }
    });

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Add label to ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        labels: {
          connect: { id: labelId }
        }
      }
    });

    return res.json({ message: 'Label added to ticket successfully' });
  } catch (error) {
    console.error('Add label error:', error);
    return res.status(500).json({ error: 'Failed to add label to ticket' });
  }
});

// Remove label from ticket
router.delete('/:id/labels/:labelId', async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const labelId = req.params.labelId;
    const userId = req.user!.id;

    // Check ticket access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check project access
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: ticket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Remove label from ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        labels: {
          disconnect: { id: labelId }
        }
      }
    });

    return res.json({ message: 'Label removed from ticket successfully' });
  } catch (error) {
    console.error('Remove label error:', error);
    return res.status(500).json({ error: 'Failed to remove label from ticket' });
  }
});

export default router;

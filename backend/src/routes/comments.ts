import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation middleware
const validateComment = [
  body('content').trim().isLength({ min: 1, max: 1000 }),
  body('ticketId').notEmpty()
];

// Get comments for a ticket
router.get('/ticket/:ticketId', async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId;
    const userId = req.user!.id;

    // Check if user has access to this ticket's project
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        projectId: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

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

    const comments = await prisma.comment.findMany({
      where: { ticketId },
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
    });

    return res.json({ comments });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create new comment
router.post('/', validateComment, async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { content, ticketId } = req.body;
    const userId = req.user!.id;

    // Check if user has access to this ticket's project
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        projectId: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

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

    const comment = await prisma.comment.create({
      data: {
        content,
        ticketId,
        userId
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
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update comment
router.put('/:id', [
  body('content').trim().isLength({ min: 1, max: 1000 })
], async (req: Request, res: Response) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const commentId = req.params.id;
    const { content } = req.body;
    const userId = req.user!.id;

    // Get the comment to check ownership and access
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        ticket: {
          select: {
            projectId: true
          }
        }
      }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user has access to this comment's project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: existingComment.ticket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Only allow comment author or project admin to edit
    if (existingComment.userId !== userId && 
        projectAccess.role !== 'ADMIN' && 
        projectAccess.role !== 'OWNER') {
      return res.status(403).json({ error: 'Insufficient permissions to edit comment' });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
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
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.id;

    // Get the comment to check ownership and access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        ticket: {
          select: {
            projectId: true
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user has access to this comment's project
    const projectAccess = await prisma.projectRole.findUnique({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: comment.ticket.projectId
        }
      }
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Only allow comment author or project admin to delete
    if (comment.userId !== userId && 
        projectAccess.role !== 'ADMIN' && 
        projectAccess.role !== 'OWNER') {
      return res.status(403).json({ error: 'Insufficient permissions to delete comment' });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;

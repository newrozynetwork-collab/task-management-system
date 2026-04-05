import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../utils/prisma.js';
import { authenticate, getAccessibleUserIds } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

// GET /task/:taskId - Get comments for a task
router.get('/task/:taskId', authenticate, async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdById: { in: accessibleUserIds } },
          { assignedToId: { in: accessibleUserIds } },
        ],
      },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or not accessible.' });
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { taskId, parentId: null },
        include: {
          user: { select: { id: true, name: true, role: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.comment.count({ where: { taskId, parentId: null } }),
    ]);

    res.json({
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /task/:taskId - Add comment to a task
router.post(
  '/task/:taskId',
  authenticate,
  [body('content').notEmpty().withMessage('Content is required.')],
  validate,
  async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { content, parentId } = req.body;

      const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { createdById: { in: accessibleUserIds } },
            { assignedToId: { in: accessibleUserIds } },
          ],
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found or not accessible.' });
      }

      if (parentId) {
        const parentComment = await prisma.comment.findFirst({
          where: { id: parseInt(parentId), taskId },
        });
        if (!parentComment) {
          return res.status(404).json({ message: 'Parent comment not found.' });
        }
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          taskId,
          userId: req.user.id,
          parentId: parentId ? parseInt(parentId) : null,
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      });

      // Create notifications for task creator and assignee (if not the commenter)
      const notifyUserIds = new Set();
      if (task.createdById !== req.user.id) notifyUserIds.add(task.createdById);
      if (task.assignedToId !== req.user.id) notifyUserIds.add(task.assignedToId);

      if (notifyUserIds.size > 0) {
        await prisma.notification.createMany({
          data: [...notifyUserIds].map((userId) => ({
            type: 'COMMENT',
            message: `${req.user.name} commented on task "${task.title}"`,
            userId,
            taskId,
          })),
        });
      }

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'CREATED',
        entityType: 'COMMENT',
        entityId: comment.id,
        details: { taskId, parentId: parentId || null },
      });

      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// GET /hub - Get all comments across accessible tasks
router.get('/hub', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          task: {
            OR: [
              { createdById: { in: accessibleUserIds } },
              { assignedToId: { in: accessibleUserIds } },
            ],
          },
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.comment.count({
        where: {
          task: {
            OR: [
              { createdById: { in: accessibleUserIds } },
              { assignedToId: { in: accessibleUserIds } },
            ],
          },
        },
      }),
    ]);

    // Group by task
    const grouped = {};
    for (const comment of comments) {
      const key = comment.task.id;
      if (!grouped[key]) {
        grouped[key] = { task: comment.task, comments: [] };
      }
      grouped[key].comments.push(comment);
    }

    res.json({
      groups: Object.values(grouped),
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Update own comment
router.put(
  '/:id',
  authenticate,
  [body('content').notEmpty().withMessage('Content is required.')],
  validate,
  async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.id);

      const comment = await prisma.comment.findUnique({ where: { id: commentId } });

      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      if (comment.userId !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit your own comments.' });
      }

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { content: req.body.content },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:id - Delete own comment (or admin/superadmin in scope)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (comment.userId === req.user.id) {
      await prisma.comment.delete({ where: { id: commentId } });
      return res.json({ message: 'Comment deleted.' });
    }

    // Admin/SuperAdmin can delete comments on tasks in their scope
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
      const taskInScope = accessibleUserIds.includes(comment.task.createdById) ||
        accessibleUserIds.includes(comment.task.assignedToId);

      if (taskInScope) {
        await prisma.comment.delete({ where: { id: commentId } });
        return res.json({ message: 'Comment deleted.' });
      }
    }

    return res.status(403).json({ message: 'Insufficient permissions to delete this comment.' });
  } catch (error) {
    next(error);
  }
});

export default router;

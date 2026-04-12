import { Router } from 'express';
import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { authenticate, authorize, getAccessibleUserIds } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - List tasks with filters
router.get(
  '/',
  [
    query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
    query('assignedTo').optional().isInt().toInt(),
    query('categoryId').optional().isInt().toInt(),
    query('search').optional().isString().trim(),
    query('sortBy').optional().isIn(['deadline', 'createdAt']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        status,
        assignedTo,
        categoryId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = req.query;

      const skip = (page - 1) * limit;
      const where = {};

      // Role-based filtering
      if (req.user.role === 'USER') {
        where.assignedToId = req.user.id;
      } else {
        // SUPER_ADMIN or ADMIN
        const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
        where.OR = [
          { createdById: req.user.id },
          { assignedToId: { in: accessibleUserIds } },
        ];
      }

      // Apply filters
      if (status) {
        where.status = status;
      }
      if (assignedTo) {
        where.assignedToId = assignedTo;
      }
      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (search) {
        where.title = { contains: search, mode: 'insensitive' };
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            assignedTo: { select: { id: true, name: true, username: true } },
            createdBy: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.task.count({ where }),
      ]);

      res.json({
        tasks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST / - Create task (SUPER_ADMIN, ADMIN only)
router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('assignedToId').optional().isInt().toInt(),
    body('deadline').optional().isISO8601().toDate(),
    body('description').optional().isString().trim(),
    body('categoryId').optional().isInt().toInt(),
    body('scheduledStart').optional().isISO8601().toDate(),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, assignedToId, deadline, categoryId, scheduledStart, status } = req.body;

      // Verify assignedToId is within accessible users (if provided)
      if (assignedToId) {
        const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
        if (!accessibleUserIds.includes(assignedToId)) {
          return res.status(403).json({ message: 'You cannot assign tasks to this user.' });
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || 'PENDING',
          deadline: deadline || null,
          scheduledStart: scheduledStart || undefined,
          assignedToId: assignedToId || undefined,
          createdById: req.user.id,
          categoryId: categoryId || undefined,
        },
        include: {
          assignedTo: { select: { id: true, name: true, username: true } },
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });

      // Create notification for assigned user
      if (assignedToId !== req.user.id) {
        await prisma.notification.create({
          data: {
            type: 'TASK_ASSIGNED',
            message: `You have been assigned a new task: ${title}`,
            userId: assignedToId,
            taskId: task.id,
          },
        });
      }

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'CREATED',
        entityType: 'TASK',
        entityId: task.id,
        details: { title },
      });

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// GET /:id - Get single task
router.get(
  '/:id',
  [param('id').isInt().toInt()],
  validate,
  async (req, res, next) => {
    try {
      const taskId = req.params.id;

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignedTo: { select: { id: true, name: true, username: true } },
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          comments: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Verify access: task must be created by or assigned to user, within tenant scope
      if (req.user.role === 'USER') {
        if (task.assignedToId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      } else {
        const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
        const isCreator = task.createdById === req.user.id;
        const isAccessibleAssignee = accessibleUserIds.includes(task.assignedToId);
        if (!isCreator && !isAccessibleAssignee) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      }

      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /:id - Update task
router.put(
  '/:id',
  [
    param('id').isInt().toInt(),
    body('title').optional().notEmpty().trim(),
    body('description').optional().isString().trim(),
    body('assignedToId').optional().isInt().toInt(),
    body('deadline').optional().isISO8601().toDate(),
    body('categoryId').optional().isInt({ allow_leading_zeroes: false }),
    body('scheduledStart').optional().isISO8601().toDate(),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
    body('progress').optional().isInt({ min: 0, max: 100 }).toInt(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const taskId = req.params.id;

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Scope check
      if (req.user.role === 'USER') {
        if (task.assignedToId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      } else {
        const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
        const isCreator = task.createdById === req.user.id;
        const isAccessibleAssignee = accessibleUserIds.includes(task.assignedToId);
        if (!isCreator && !isAccessibleAssignee) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      }

      // Build update data based on role
      let updateData = {};

      if (req.user.role === 'USER') {
        // USER can only update status and progress
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.progress !== undefined) updateData.progress = req.body.progress;
      } else {
        // SUPER_ADMIN/ADMIN can update all fields
        const { title, description, assignedToId, deadline, categoryId, scheduledStart, status, progress } = req.body;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (deadline !== undefined) updateData.deadline = deadline;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (scheduledStart !== undefined) updateData.scheduledStart = scheduledStart;
        if (status !== undefined) updateData.status = status;
        if (progress !== undefined) updateData.progress = progress;

        if (assignedToId !== undefined) {
          const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
          if (!accessibleUserIds.includes(assignedToId)) {
            return res.status(403).json({ message: 'You cannot assign tasks to this user.' });
          }
          updateData.assignedToId = assignedToId;
        }
      }

      // Handle completion
      if (updateData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.timeTaken = Math.round((new Date() - new Date(task.createdAt)) / 60000);
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, username: true } },
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'UPDATED',
        entityType: 'TASK',
        entityId: taskId,
        details: updateData,
      });

      // Notify if assignee changed
      if (updateData.assignedToId && updateData.assignedToId !== task.assignedToId) {
        await prisma.notification.create({
          data: {
            type: 'TASK_REASSIGNED',
            message: `You have been assigned a task: ${updatedTask.title}`,
            userId: updateData.assignedToId,
            taskId: taskId,
          },
        });
      }

      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /:id/complete - Complete task endpoint
router.put(
  '/:id/complete',
  [
    param('id').isInt().toInt(),
    body('progress').optional().isInt({ min: 10, max: 100 }).toInt(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const taskId = req.params.id;
      const progress = req.body.progress ?? 100;

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Must be assigned to or created by the user
      if (task.assignedToId !== req.user.id && task.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const updateData = { progress };

      if (progress === 100) {
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        updateData.timeTaken = Math.round((new Date() - new Date(task.createdAt)) / 60000);
      } else {
        updateData.status = 'IN_PROGRESS';
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, username: true } },
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });

      await logActivity(prisma, {
        userId: req.user.id,
        action: progress === 100 ? 'COMPLETED' : 'UPDATED',
        entityType: 'TASK',
        entityId: taskId,
        details: { progress, status: updateData.status },
      });

      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:id - Delete task (SUPER_ADMIN, ADMIN only)
router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  [param('id').isInt().toInt()],
  validate,
  async (req, res, next) => {
    try {
      const taskId = req.params.id;

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Verify task is within scope
      const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);
      const isCreator = task.createdById === req.user.id;
      const isAccessibleAssignee = accessibleUserIds.includes(task.assignedToId);
      if (!isCreator && !isAccessibleAssignee) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      await prisma.task.delete({ where: { id: taskId } });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'DELETED',
        entityType: 'TASK',
        entityId: taskId,
        details: { title: task.title },
      });

      res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, getAccessibleUserIds } from '../middleware/auth.js';

const router = Router();

// GET /stats - Dashboard statistics based on role
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const taskWhere = {
      OR: [
        { createdById: { in: accessibleUserIds } },
        { assignedToId: { in: accessibleUserIds } },
      ],
    };

    if (req.user.role === 'USER') {
      const userTaskWhere = { assignedToId: req.user.id };

      const [total, completed, inProgress, overdue] = await Promise.all([
        prisma.task.count({ where: userTaskWhere }),
        prisma.task.count({ where: { ...userTaskWhere, status: 'COMPLETED' } }),
        prisma.task.count({ where: { ...userTaskWhere, status: 'IN_PROGRESS' } }),
        prisma.task.count({
          where: {
            ...userTaskWhere,
            status: { not: 'COMPLETED' },
            deadline: { lt: now },
          },
        }),
      ]);

      return res.json({
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
      });
    }

    // SUPER_ADMIN / ADMIN
    const [total, completed, inProgress, overdue, totalUsers, totalCategories] =
      await Promise.all([
        prisma.task.count({ where: taskWhere }),
        prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
        prisma.task.count({ where: { ...taskWhere, status: 'IN_PROGRESS' } }),
        prisma.task.count({
          where: {
            ...taskWhere,
            status: { not: 'COMPLETED' },
            deadline: { lt: now },
          },
        }),
        prisma.user.count({ where: { id: { in: accessibleUserIds } } }),
        prisma.category.count({ where: { createdById: { in: accessibleUserIds } } }),
      ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      overdueTasks: overdue,
      totalUsers,
      totalCategories,
      completionRate,
    });
  } catch (error) {
    next(error);
  }
});

// GET /recent-tasks - Last 10 tasks in scope
router.get('/recent-tasks', authenticate, async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const where =
      req.user.role === 'USER'
        ? { assignedToId: req.user.id }
        : {
            OR: [
              { createdById: { in: accessibleUserIds } },
              { assignedToId: { in: accessibleUserIds } },
            ],
          };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /overdue - Overdue tasks in scope
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const where =
      req.user.role === 'USER'
        ? { assignedToId: req.user.id, status: { not: 'COMPLETED' }, deadline: { lt: now } }
        : {
            OR: [
              { createdById: { in: accessibleUserIds } },
              { assignedToId: { in: accessibleUserIds } },
            ],
            status: { not: 'COMPLETED' },
            deadline: { lt: now },
          };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /chart-data - Task counts by status + completion per month (last 6 months)
router.get('/chart-data', authenticate, async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

    const taskWhere =
      req.user.role === 'USER'
        ? { assignedToId: req.user.id }
        : {
            OR: [
              { createdById: { in: accessibleUserIds } },
              { assignedToId: { in: accessibleUserIds } },
            ],
          };

    // Task counts grouped by status
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: { id: true },
    });

    const byStatus = {};
    for (const entry of statusCounts) {
      byStatus[entry.status] = entry._count.id;
    }

    // Tasks completed per month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const completedTasks = await prisma.task.findMany({
      where: {
        ...taskWhere,
        status: 'COMPLETED',
        completedAt: { gte: sixMonthsAgo },
      },
      select: { completedAt: true },
    });

    const monthlyCompletions = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyCompletions[key] = 0;
    }

    for (const task of completedTasks) {
      if (task.completedAt) {
        const key = `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyCompletions[key] !== undefined) {
          monthlyCompletions[key]++;
        }
      }
    }

    res.json({
      byStatus,
      monthlyCompletions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

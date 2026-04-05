import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, authorize, getAccessibleUserIds } from '../middleware/auth.js';

const router = Router();

// GET / - Get activity logs
router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, entityType, userId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const accessibleUserIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

      const where = {
        userId: { in: accessibleUserIds },
      };

      if (entityType) {
        where.entityType = entityType;
      }

      if (userId) {
        const parsedUserId = parseInt(userId);
        if (accessibleUserIds.includes(parsedUserId)) {
          where.userId = parsedUserId;
        } else {
          return res.status(403).json({ message: 'User not in accessible scope.' });
        }
      }

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.activityLog.count({ where }),
      ]);

      res.json({
        logs,
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
  }
);

export default router;

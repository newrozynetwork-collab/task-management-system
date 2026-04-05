import { Router } from 'express';
import { body, param } from 'express-validator';
import prisma from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

// All routes require authentication + SUPER_ADMIN or ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN'));

// GET / - List categories created by the current user
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { createdById: req.user.id },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST / - Create category
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('description').optional().isString().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      const category = await prisma.category.create({
        data: {
          name,
          description,
          createdById: req.user.id,
        },
        include: {
          _count: { select: { tasks: true } },
        },
      });

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /:id - Update category
router.put(
  '/:id',
  [
    param('id').isInt().toInt(),
    body('name').optional().notEmpty().trim(),
    body('description').optional().isString().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const categoryId = req.params.id;

      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      // Verify ownership
      if (category.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const { name, description } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
        include: {
          _count: { select: { tasks: true } },
        },
      });

      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:id - Delete category
router.delete(
  '/:id',
  [param('id').isInt().toInt()],
  validate,
  async (req, res, next) => {
    try {
      const categoryId = req.params.id;

      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      // Verify ownership
      if (category.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      await prisma.category.delete({ where: { id: categoryId } });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'DELETED',
        entityType: 'CATEGORY',
        entityId: categoryId,
        details: { name: category.name },
      });

      res.json({ message: 'Category deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

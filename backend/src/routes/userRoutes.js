import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { authenticate, authorize, getAccessibleUserIds } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - List users with pagination, filtering, search
router.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      const currentPage = Math.max(1, parseInt(page, 10));
      const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
      const skip = (currentPage - 1) * pageSize;

      const where = {};

      if (req.user.role === 'SUPER_ADMIN') {
        // Get admin IDs created by this super admin
        const createdAdmins = await prisma.user.findMany({
          where: { createdById: req.user.id, role: 'ADMIN' },
          select: { id: true },
        });
        const adminIds = createdAdmins.map((a) => a.id);

        // Users created by self OR created by admins they created
        where.OR = [
          { createdById: req.user.id },
          { createdById: { in: adminIds } },
        ];
      } else if (req.user.role === 'ADMIN') {
        where.createdById = req.user.id;
      }

      if (role) {
        where.role = role;
      }

      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            language: true,
            createdAt: true,
            createdById: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: users,
        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST / - Create user
router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('username')
      .notEmpty().withMessage('Username is required.')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters.'),
    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name').notEmpty().withMessage('Name is required.'),
    body('role')
      .notEmpty().withMessage('Role is required.')
      .isIn(['SUPER_ADMIN', 'ADMIN', 'USER']).withMessage('Invalid role.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { username, password, name, role, language } = req.body;

      // Enforce role creation rules
      if (req.user.role === 'ADMIN' && role !== 'USER') {
        return res.status(403).json({ message: 'Admins can only create users with USER role.' });
      }

      if (req.user.role === 'SUPER_ADMIN' && !['ADMIN', 'USER'].includes(role)) {
        return res.status(403).json({ message: 'Super Admins can only create ADMIN or USER roles.' });
      }

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          role,
          language: language || 'en',
          createdById: req.user.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          language: true,
          createdAt: true,
        },
      });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'CREATED',
        entityType: 'USER',
        entityId: String(user.id),
        details: { name: user.name, role: user.role },
      });

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

// GET /:id - Get single user
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id, 10);

      const accessibleIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

      if (!accessibleIds.includes(userId)) {
        return res.status(403).json({ message: 'Access denied. User not in your scope.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          language: true,
          createdAt: true,
          createdById: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /:id - Update user
router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id, 10);

      const accessibleIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

      if (!accessibleIds.includes(userId)) {
        return res.status(403).json({ message: 'Access denied. User not in your scope.' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const { name, username, password, language, role } = req.body;

      // ADMIN cannot promote users to ADMIN
      if (req.user.role === 'ADMIN' && role === 'ADMIN') {
        return res.status(403).json({ message: 'Admins cannot assign the ADMIN role.' });
      }

      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (language !== undefined) updateData.language = language;
      if (role !== undefined) updateData.role = role;

      if (username !== undefined) {
        // Check uniqueness if username is being changed
        if (username !== existingUser.username) {
          const duplicate = await prisma.user.findUnique({
            where: { username },
          });

          if (duplicate) {
            return res.status(409).json({ message: 'Username already exists.' });
          }
        }
        updateData.username = username;
      }

      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          language: true,
          createdAt: true,
        },
      });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'UPDATED',
        entityType: 'USER',
        entityId: String(user.id),
        details: { updatedFields: Object.keys(updateData).filter((k) => k !== 'password') },
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:id - Delete user
router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id, 10);

      if (userId === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete yourself.' });
      }

      const accessibleIds = await getAccessibleUserIds(req.user.id, req.user.role, prisma);

      if (!accessibleIds.includes(userId)) {
        return res.status(403).json({ message: 'Access denied. User not in your scope.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      await logActivity(prisma, {
        userId: req.user.id,
        action: 'DELETED',
        entityType: 'USER',
        entityId: String(userId),
        details: { name: user.name, role: user.role },
      });

      res.json({ message: 'User deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router } from 'express';
import { nanoid } from 'nanoid';
import prisma from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// POST / - Generate share link
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { expiresAt } = req.body;
      const token = nanoid(10);

      const shareLink = await prisma.shareLink.create({
        data: {
          token,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById: req.user.id,
        },
      });

      const fullUrl = `${process.env.FRONTEND_URL}/shared/${token}`;

      res.status(201).json({ ...shareLink, url: fullUrl });
    } catch (error) {
      next(error);
    }
  }
);

// GET / - List share links created by current user
router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const shareLinks = await prisma.shareLink.findMany({
        where: { createdById: req.user.id },
        orderBy: { createdAt: 'desc' },
      });

      res.json(shareLinks);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:id - Delete share link (verify ownership)
router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const linkId = parseInt(req.params.id);

      const shareLink = await prisma.shareLink.findUnique({ where: { id: linkId } });

      if (!shareLink) {
        return res.status(404).json({ message: 'Share link not found.' });
      }

      if (shareLink.createdById !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own share links.' });
      }

      await prisma.shareLink.delete({ where: { id: linkId } });

      res.json({ message: 'Share link deleted.' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /verify/:token - Verify share link (no auth required)
router.get('/verify/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!shareLink) {
      return res.status(404).json({ valid: false, message: 'Share link not found.' });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return res.status(410).json({ valid: false, message: 'Share link has expired.' });
    }

    res.json({
      valid: true,
      createdBy: shareLink.createdBy,
      createdAt: shareLink.createdAt,
      expiresAt: shareLink.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

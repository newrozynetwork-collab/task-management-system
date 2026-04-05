import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    next();
  };
};

/**
 * Returns an array of user IDs that the given user is allowed to access,
 * enforcing multi-tenant isolation based on role hierarchy.
 *
 * SUPER_ADMIN: self + admins they created + users those admins created + users they directly created
 * ADMIN: self + users they created
 * USER: self only
 */
export const getAccessibleUserIds = async (userId, role, prismaClient) => {
  if (role === 'USER') {
    return [userId];
  }

  if (role === 'ADMIN') {
    const createdUsers = await prismaClient.user.findMany({
      where: { createdById: userId },
      select: { id: true },
    });

    return [userId, ...createdUsers.map((u) => u.id)];
  }

  if (role === 'SUPER_ADMIN') {
    // Get admins created by this super admin
    const createdAdmins = await prismaClient.user.findMany({
      where: { createdById: userId, role: 'ADMIN' },
      select: { id: true },
    });

    const adminIds = createdAdmins.map((a) => a.id);

    // Get users created by those admins
    const usersCreatedByAdmins = await prismaClient.user.findMany({
      where: { createdById: { in: adminIds } },
      select: { id: true },
    });

    // Get users directly created by the super admin
    const directlyCreatedUsers = await prismaClient.user.findMany({
      where: { createdById: userId },
      select: { id: true },
    });

    const allIds = new Set([
      userId,
      ...adminIds,
      ...usersCreatedByAdmins.map((u) => u.id),
      ...directlyCreatedUsers.map((u) => u.id),
    ]);

    return [...allIds];
  }

  return [userId];
};

/**
 * Logs an activity event to the ActivityLog table.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Object} params
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Description of the action (e.g. 'CREATED', 'UPDATED', 'DELETED')
 * @param {string} params.entityType - Type of entity (e.g. 'TASK', 'CATEGORY', 'USER')
 * @param {string} params.entityId - ID of the affected entity
 * @param {Object} [params.details] - Optional additional details about the action
 */
export const logActivity = async (prisma, { userId, action, entityType, entityId, details }) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Audit Service (Forensic Trail)
 * 
 * Standardized logging for all critical system actions.
 * Supports both synchronous (transactional) and asynchronous logging.
 */
export class AuditService {
    /**
     * Log an action (Synchronous / Transactional)
     * Use this when the log MUST be part of the same transaction as the action.
     */
    static async log(
        tx: Prisma.TransactionClient | PrismaClient,
        data: {
            tenantId?: string;
            outletId?: string;
            userId?: string;
            userName?: string;
            action: string;
            entity: string; // e.g., 'Order', 'Product'
            entityId: string;
            details?: any;
            oldValue?: any; // Snapshot before change
            newValue?: any; // Snapshot after change
            ipAddress?: string;
            userAgent?: string;
        }
    ) {
        try {
            await tx.auditLog.create({
                data: {
                    tenantId: data.tenantId,
                    outletId: data.outletId,
                    userId: data.userId,
                    userName: data.userName,
                    action: data.action,
                    tableName: data.entity,
                    recordId: data.entityId,
                    oldValue: data.oldValue ? (data.oldValue as Prisma.InputJsonValue) : undefined,
                    newValue: data.newValue ? (data.newValue as Prisma.InputJsonValue) : undefined,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    // automated automated fields
                    timestamp: new Date()
                }
            });
        } catch (error) {
            console.error('[AuditService] Failed to create audit log:', error);
            // In a strict forensic system, we might throw here to abort the transaction.
            // For now, we log the error to avoid breaking user flows for non-critical failures.
            // But for banking/finance, you would throw.
        }
    }
}

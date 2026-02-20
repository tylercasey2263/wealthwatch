import type { Request, Response, NextFunction } from 'express';

/**
 * Audit logging middleware — records all state-changing API calls.
 * Logs to the AuditLog database table for compliance and security monitoring.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  // Only audit state-changing methods
  const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!auditMethods.includes(req.method)) {
    next();
    return;
  }

  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  // Intercept the response to capture status code
  res.json = function (body: any) {
    const prisma = (req as any).prisma;
    if (prisma) {
      // Extract resource info from URL
      const pathParts = req.path.split('/').filter(Boolean);
      // e.g., /api/accounts/123 -> resource=accounts, resourceId=123
      const resource = pathParts[1] || pathParts[0] || 'unknown';
      const resourceId = pathParts[2] || body?.id || body?.account?.id || body?.transaction?.id || null;

      // Build audit details (strip sensitive fields)
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.password;
      delete sanitizedBody.passwordHash;
      delete sanitizedBody.csvContent; // Can be very large

      const details = JSON.stringify({
        method: req.method,
        path: req.path,
        body: sanitizedBody,
        duration: Date.now() - startTime,
      });

      // Fire-and-forget — don't block the response
      prisma.auditLog.create({
        data: {
          userId: req.session?.userId || null,
          action: `${req.method} ${req.path}`,
          resource,
          resourceId,
          details,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
          requestId: (req as any).requestId || null,
          status: res.statusCode,
        },
      }).catch((err: any) => {
        console.error('Audit log write failed:', err.message);
      });
    }

    return originalJson(body);
  };

  next();
}

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]!.trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Log a login attempt (success or failure).
 */
export async function logLoginAttempt(
  prisma: any,
  email: string,
  req: Request,
  success: boolean,
  reason?: string
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        success,
        reason,
      },
    });
  } catch (err: any) {
    console.error('Login attempt log failed:', err.message);
  }
}

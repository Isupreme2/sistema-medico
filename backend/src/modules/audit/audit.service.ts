import { AuditLog } from '../../models/auditLog.model';

export interface AuditFilters {
  method?: string;
  role?: string;
  page?: number;
  limit?: number;
}

/** Lista paginada de eventos de auditoría (más recientes primero). */
export async function listAudit(filters: AuditFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));

  const query: Record<string, unknown> = {};
  if (filters.method) query.method = filters.method.toUpperCase();
  if (filters.role) query.role = filters.role;

  const [eventos, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return { eventos, total, page, limit, paginas: Math.ceil(total / limit) };
}

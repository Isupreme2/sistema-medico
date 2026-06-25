import { AuditLog } from '../../models/auditLog.model';

export interface AuditFilters {
  metodo?: string;
  rol?: string;
  page?: number;
  limit?: number;
}

/** Lista paginada de eventos de auditoría (más recientes primero). */
export async function listAudit(filters: AuditFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 25));

  const query: Record<string, unknown> = {};
  if (filters.metodo) query.metodo = filters.metodo.toUpperCase();
  if (filters.rol) query.rol = filters.rol;

  const [eventos, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ creadoEn: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return { eventos, total, page, limit, paginas: Math.ceil(total / limit) };
}

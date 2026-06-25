import { Especialidad } from '../../models/especialidad.model';

/**
 * Lista las especialidades del catálogo (activas), ordenadas alfabéticamente.
 * Acepta un término opcional para filtrar por nombre (búsqueda servidor).
 */
export async function listSpecialties(q?: string) {
  const filter: Record<string, unknown> = { activo: true };
  const term = q?.trim();
  if (term) {
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.nombre = new RegExp(safe, 'i');
  }
  return Especialidad.find(filter).select('nombre').sort({ nombre: 1 });
}

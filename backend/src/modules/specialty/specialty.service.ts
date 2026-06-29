import { Especialidad } from '../../models/especialidad.model';
import { MedicoProfile } from '../../models/medicoProfile.model';

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

/**
 * Especialidades que realmente se ofrecen al público: solo aquellas con al
 * menos un médico ACTIVO (perfil activo y cuenta de usuario activa) asignado.
 * Se usa en el sitio de marketing para no anunciar áreas sin médico disponible.
 */
export async function listSpecialtiesConMedicos(): Promise<string[]> {
  const filas = await MedicoProfile.aggregate<{ _id: string }>([
    { $match: { activo: true } },
    {
      $lookup: {
        from: 'usuarios',
        localField: 'usuarioId',
        foreignField: '_id',
        as: 'usuario',
      },
    },
    { $unwind: '$usuario' },
    { $match: { 'usuario.activo': true } },
    { $group: { _id: '$especialidad' } },
    { $sort: { _id: 1 } },
  ]);
  return filas.map((f) => f._id);
}

import { Appointment } from '../../models/appointment.model';
import { Invoice } from '../../models/invoice.model';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { porcentajeAusentismo } from '../../utils/billing';

/** Agrupa un aggregate [{_id, count}] en un objeto {clave: count}. */
function toMap(rows: { _id: string; count: number }[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r._id] = r.count;
    return acc;
  }, {});
}

/**
 * Métricas para el panel del administrador. Todo se calcula con pipelines de
 * agregación de MongoDB (no se traen documentos a memoria).
 */
export async function overview() {
  const [
    citasPorEstadoRows,
    ingresosRows,
    citasPorDia,
    topMedicosRows,
    totalPacientes,
    totalMedicos,
  ] = await Promise.all([
    Appointment.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ _id: string; count: number; monto: number }>([
      { $group: { _id: '$estado', count: { $sum: 1 }, monto: { $sum: '$total' } } },
    ]),
    citasUltimosDias(14),
    Appointment.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: '$medicoId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'medico' },
      },
      { $unwind: '$medico' },
      {
        $project: {
          _id: 0,
          count: 1,
          nombre: { $concat: ['$medico.nombre', ' ', '$medico.apellido'] },
        },
      },
    ]),
    User.countDocuments({ rol: UserRole.PACIENTE }),
    User.countDocuments({ rol: UserRole.MEDICO }),
  ]);

  const citasPorEstado = toMap(citasPorEstadoRows);
  const totalCitas = Object.values(citasPorEstado).reduce((a, b) => a + b, 0);
  const atendidas = citasPorEstado['atendida'] ?? 0;
  const noAsistio = citasPorEstado['no_asistio'] ?? 0;
  const ausentismoPct = porcentajeAusentismo(atendidas, noAsistio);

  const ingresos = { pendiente: 0, pagada: 0, anulada: 0, total: 0 };
  for (const row of ingresosRows) {
    if (row._id === 'pendiente') ingresos.pendiente = row.monto;
    if (row._id === 'pagada') ingresos.pagada = row.monto;
    if (row._id === 'anulada') ingresos.anulada = row.monto;
  }
  ingresos.total = Math.round((ingresos.pendiente + ingresos.pagada) * 100) / 100;

  return {
    totales: { citas: totalCitas, pacientes: totalPacientes, medicos: totalMedicos },
    citasPorEstado,
    ausentismoPct,
    ingresos,
    citasPorDia,
    topMedicos: topMedicosRows,
  };
}

/** Conteo de citas por día para los últimos N días (rellena los días sin citas). */
async function citasUltimosDias(dias: number) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - (dias - 1));

  const rows = await Appointment.aggregate<{ _id: string; count: number }>([
    { $match: { fechaHora: { $gte: inicio } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaHora' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const mapa = toMap(rows);

  const resultado: { fecha: string; count: number }[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    resultado.push({ fecha: key, count: mapa[key] ?? 0 });
  }
  return resultado;
}

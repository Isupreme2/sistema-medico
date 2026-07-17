import { User } from '../../models/user.model';
import { MedicalRecord } from '../../models/medicalRecord.model';
import { Prescription } from '../../models/prescription.model';
import { Appointment } from '../../models/appointment.model';
import { momentoLabel } from '../../constants/medicationForms';

const fmtFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeZone: 'America/Lima',
});

export interface ContextoPaciente {
  /** Texto estructurado listo para enviar al modelo. */
  texto: string;
  /** Cantidad de consultas registradas (para decidir si hay datos suficientes). */
  totalConsultas: number;
  nombre: string;
}

/**
 * Arma un resumen longitudinal de la historia del paciente: alergias, citas
 * (con su motivo), consultas (diagnóstico, signos, plan) y las recetas emitidas
 * en cada una. Es el contexto que el ML actual no aprovecha y que la IA sí
 * puede razonar en conjunto.
 */
export async function construirContexto(pacienteId: string): Promise<ContextoPaciente | null> {
  const paciente = await User.findById(pacienteId);
  if (!paciente) return null;

  const [records, prescripciones, citas] = await Promise.all([
    MedicalRecord.find({ pacienteId }).sort({ fecha: 1 }).lean(),
    Prescription.find({ pacienteId }).sort({ emitidaEn: 1 }).lean(),
    Appointment.find({ pacienteId }).sort({ fechaHora: 1 }).lean(),
  ]);

  const nombre = `${paciente.nombre} ${paciente.apellido}`;
  const lineas: string[] = [];

  lineas.push(`Paciente: ${nombre}`);
  lineas.push(
    `Alergias registradas: ${paciente.alergias.length ? paciente.alergias.join(', ') : 'ninguna'}`,
  );

  // --- Motivos por los que agendó citas a lo largo del tiempo ---
  if (citas.length) {
    lineas.push('', `Historial de citas (${citas.length}):`);
    for (const c of citas) {
      const cuando = fmtFecha.format(new Date(c.fechaHora));
      const motivo = c.motivo ? ` — motivo: ${c.motivo}` : '';
      lineas.push(`- ${cuando} · ${c.modalidad} · estado: ${c.estado}${motivo}`);
    }
  }

  // --- Consultas registradas, con la receta emitida en cada una ---
  if (records.length) {
    lineas.push('', `Consultas clínicas (${records.length}):`);
    for (const r of records) {
      const cuando = fmtFecha.format(new Date(r.fecha));
      lineas.push(`- ${cuando}`);
      if (r.motivo) lineas.push(`    Motivo: ${r.motivo}`);
      lineas.push(`    Diagnóstico: ${r.diagnostico}${r.cie10 ? ` (CIE-10 ${r.cie10})` : ''}`);
      if (r.notas) lineas.push(`    Notas: ${r.notas}`);
      if (r.tratamiento) lineas.push(`    Plan: ${r.tratamiento}`);
      const sv = r.signosVitales;
      if (sv) {
        const partes: string[] = [];
        if (sv.peso) partes.push(`peso ${sv.peso}kg`);
        if (sv.talla) partes.push(`talla ${sv.talla}cm`);
        if (sv.presionSistolica)
          partes.push(`PA ${sv.presionSistolica}/${sv.presionDiastolica ?? '?'}`);
        if (sv.frecuenciaCardiaca) partes.push(`FC ${sv.frecuenciaCardiaca}`);
        if (sv.temperatura) partes.push(`T° ${sv.temperatura}`);
        if (sv.glucosa) partes.push(`glucosa ${sv.glucosa}`);
        if (sv.saturacionO2) partes.push(`SatO2 ${sv.saturacionO2}%`);
        if (partes.length) lineas.push(`    Signos vitales: ${partes.join(', ')}`);
      }
      const recetasDe = prescripciones.filter(
        (p) => p.historialId && p.historialId.toString() === r._id.toString(),
      );
      for (const rx of recetasDe) {
        const meds = rx.medicamentos
          .map((m) => {
            const dosis = [m.cantidad, m.unidad].filter(Boolean).join(' ');
            const mom = momentoLabel(m.momento);
            return `${m.nombre}${m.concentracion ? ' ' + m.concentracion : ''}${
              dosis ? ` (${dosis})` : ''
            }${mom ? ` [${mom}]` : ''}`;
          })
          .join('; ');
        lineas.push(`    Receta: ${meds}${rx.indicaciones ? ` — ${rx.indicaciones}` : ''}`);
      }
    }
  }

  return { texto: lineas.join('\n'), totalConsultas: records.length, nombre };
}

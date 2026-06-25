import { Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { IPrescription } from '../../models/prescription.model';
import { MedicoProfile } from '../../models/medicoProfile.model';
import { env } from '../../config/env';

interface PersonaPop {
  nombre: string;
  apellido: string;
}

/**
 * Genera el PDF de la receta y lo transmite (stream) a la respuesta.
 * Incluye datos del médico/paciente, los medicamentos, el código y un QR
 * que apunta al endpoint público de verificación.
 */
export async function generarPdfReceta(receta: IPrescription, res: Response): Promise<void> {
  const medico = receta.medicoId as unknown as PersonaPop & { _id: unknown };
  const paciente = receta.pacienteId as unknown as PersonaPop;

  const profile = await MedicoProfile.findOne({ usuarioId: medico._id });
  const verifyUrl = `${env.PUBLIC_URL}${env.API_PREFIX}/prescriptions/verify/${receta.codigo}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receta-${receta.codigo}.pdf"`);
  doc.pipe(res);

  const azul = '#2563eb';
  const gris = '#64748b';

  // --- Encabezado ---
  doc.fillColor(azul).fontSize(20).text('Sistema Médico EHR', { continued: false });
  doc.fillColor(gris).fontSize(10).text('Receta médica digital');
  doc.moveDown(0.5);
  doc.strokeColor('#e2e8f0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // --- Médico / Paciente ---
  const topInfo = doc.y;
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Médico');
  doc
    .font('Helvetica')
    .fillColor('#334155')
    .fontSize(10)
    .text(`Dr(a). ${medico.nombre} ${medico.apellido}`);
  if (profile) {
    doc.text(`Especialidad: ${profile.especialidad}`);
    doc.text(`Colegiatura: ${profile.numeroColegiatura}`);
  }

  doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('Paciente', 320, topInfo);
  doc
    .font('Helvetica')
    .fillColor('#334155')
    .fontSize(10)
    .text(`${paciente.nombre} ${paciente.apellido}`, 320);
  doc.text(`Fecha: ${receta.emitidaEn.toLocaleString('es-PE')}`, 320);

  doc.moveDown(2);

  // --- Medicamentos ---
  doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(12).text('Medicamentos', 50);
  doc.moveDown(0.5);

  receta.medicamentos.forEach((m, i) => {
    doc
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .fontSize(11)
      .text(`${i + 1}. ${m.nombre} — ${m.dosis}`);
    doc
      .font('Helvetica')
      .fillColor('#475569')
      .fontSize(10)
      .text(`   Frecuencia: ${m.frecuencia}   ·   Duración: ${m.duracion}`);
    doc.moveDown(0.5);
  });

  if (receta.indicaciones) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('Indicaciones');
    doc.font('Helvetica').fillColor('#334155').fontSize(10).text(receta.indicaciones);
  }

  // --- Pie: código + QR ---
  const footerY = 700;
  doc.image(qrBuffer, 50, footerY, { width: 90 });
  doc
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .fontSize(11)
    .text(`Código: ${receta.codigo}`, 160, footerY + 15);
  doc
    .font('Helvetica')
    .fillColor(gris)
    .fontSize(9)
    .text('Escanea el QR o visita el enlace para verificar la autenticidad de esta receta.', 160, footerY + 35, { width: 360 });
  doc.fillColor(azul).fontSize(8).text(verifyUrl, 160, footerY + 60, { width: 360 });

  doc.end();
}

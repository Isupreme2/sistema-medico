import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { IInvoice } from '../../models/invoice.model';
import { env } from '../../config/env';

interface PersonaPop {
  nombre: string;
  apellido: string;
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'PENDIENTE',
  pagada: 'PAGADA',
  anulada: 'ANULADA',
};

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/**
 * Genera el PDF de una factura y lo transmite (stream) a la respuesta:
 * datos del emisor/paciente, tabla de ítems y totales con IGV.
 */
export function generarPdfFactura(factura: IInvoice, res: Response): void {
  const paciente = factura.pacienteId as unknown as PersonaPop;
  const medico = factura.medicoId as unknown as PersonaPop | undefined;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="factura-${factura.numero}.pdf"`);
  doc.pipe(res);

  const azul = '#2563eb';
  const gris = '#64748b';

  // --- Encabezado ---
  doc.fillColor(azul).fontSize(20).text(env.APP_NAME);
  doc.fillColor(gris).fontSize(10).text('Comprobante de pago');
  doc
    .fillColor('#0f172a')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(`Factura ${factura.numero}`, 50, 50, { align: 'right' });
  doc
    .font('Helvetica')
    .fillColor(gris)
    .fontSize(10)
    .text(`Estado: ${ESTADO_LABEL[factura.estado] ?? factura.estado}`, { align: 'right' });
  doc.text(`Fecha: ${factura.emitidaEn.toLocaleDateString('es-PE')}`, { align: 'right' });

  doc.moveDown(1);
  doc.strokeColor('#e2e8f0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // --- Paciente / Emisor ---
  const topInfo = doc.y;
  doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('Paciente', 50, topInfo);
  doc
    .font('Helvetica')
    .fillColor('#334155')
    .fontSize(10)
    .text(`${paciente.nombre} ${paciente.apellido}`, 50);

  if (medico) {
    doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text('Médico', 320, topInfo);
    doc
      .font('Helvetica')
      .fillColor('#334155')
      .fontSize(10)
      .text(`Dr(a). ${medico.nombre} ${medico.apellido}`, 320);
  }

  doc.moveDown(2);

  // --- Tabla de ítems ---
  const tableTop = doc.y;
  const colX = { desc: 50, cant: 330, precio: 400, importe: 480 };
  doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(10);
  doc.text('Descripción', colX.desc, tableTop);
  doc.text('Cant.', colX.cant, tableTop);
  doc.text('P. Unit.', colX.precio, tableTop);
  doc.text('Importe', colX.importe, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#e2e8f0').stroke();

  let y = tableTop + 22;
  doc.font('Helvetica').fillColor('#334155').fontSize(10);
  for (const it of factura.conceptos) {
    const importe = it.cantidad * it.precioUnitario;
    doc.text(it.descripcion, colX.desc, y, { width: 270 });
    doc.text(String(it.cantidad), colX.cant, y);
    doc.text(soles(it.precioUnitario), colX.precio, y);
    doc.text(soles(importe), colX.importe, y);
    y += 22;
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
  y += 12;

  // --- Totales ---
  const totales: [string, string][] = [
    ['Subtotal', soles(factura.subtotal)],
    [`IGV (${factura.impuestoPct}%)`, soles(factura.impuesto)],
  ];
  doc.font('Helvetica').fillColor(gris).fontSize(10);
  for (const [label, val] of totales) {
    doc.text(label, 380, y);
    doc.text(val, colX.importe, y, { align: 'left' });
    y += 18;
  }
  doc.font('Helvetica-Bold').fillColor(azul).fontSize(13);
  doc.text('TOTAL', 380, y);
  doc.text(soles(factura.total), colX.importe, y);

  // --- Notas ---
  if (factura.notas) {
    doc.moveDown(3);
    doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(10).text('Notas', 50);
    doc.font('Helvetica').fillColor('#334155').fontSize(10).text(factura.notas, 50, undefined, {
      width: 495,
    });
  }

  // --- Pie ---
  doc
    .font('Helvetica')
    .fillColor(gris)
    .fontSize(8)
    .text('Documento generado electrónicamente por el Sistema Médico EHR.', 50, 770, {
      align: 'center',
      width: 495,
    });

  doc.end();
}

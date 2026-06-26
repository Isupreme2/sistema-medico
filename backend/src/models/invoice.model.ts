import mongoose, { Schema, Document, Model } from 'mongoose';

export enum InvoiceStatus {
  PENDIENTE = 'pendiente',
  PAGADA = 'pagada',
  ANULADA = 'anulada',
  REEMBOLSADA = 'reembolsada',
}

export interface IInvoiceItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  numero: string; // FAC-AAAA-XXXXXX
  pacienteId: mongoose.Types.ObjectId;
  medicoId?: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  emitidaPor: mongoose.Types.ObjectId;
  conceptos: IInvoiceItem[];
  subtotal: number;
  impuestoPct: number;
  impuesto: number;
  total: number;
  estado: InvoiceStatus;
  notas?: string;
  /** Forma de pago registrada al pagar (ej. "Tarjeta •••• 4242"). */
  metodoPago?: string;
  emitidaEn: Date;
  pagadaEn?: Date;
  creadoEn: Date;
  actualizadoEn: Date;
}

const itemSchema = new Schema<IInvoiceItem>(
  {
    descripcion: { type: String, required: true, trim: true, maxlength: 300 },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    numero: { type: String, required: true, unique: true, index: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicoId: { type: Schema.Types.ObjectId, ref: 'User' },
    citaId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    emitidaPor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conceptos: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    impuestoPct: { type: Number, default: 18 },
    impuesto: { type: Number, required: true },
    total: { type: Number, required: true, index: true },
    estado: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.PENDIENTE,
      index: true,
    },
    notas: { type: String, trim: true, maxlength: 1000 },
    metodoPago: { type: String, trim: true, maxlength: 60 },
    emitidaEn: { type: Date, default: Date.now },
    pagadaEn: { type: Date },
  },
  { collection: 'facturas', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

export const Invoice: Model<IInvoice> = mongoose.model<IInvoice>('Invoice', invoiceSchema);

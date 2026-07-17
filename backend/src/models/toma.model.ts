import mongoose, { Schema, Document, Model } from 'mongoose';

/** Estado de una toma dentro de su ciclo de vida. */
export enum TomaEstado {
  PENDIENTE = 'pendiente',
  ENVIADA = 'enviada', // se disparó el recordatorio
  CONFIRMADA = 'confirmada', // el paciente marcó que la tomó
  OMITIDA = 'omitida', // pasó su hora sin avisarse (o el paciente la saltó)
}

/**
 * Una "toma" es una dosis concreta programada en el tiempo. Se materializan al
 * emitir la receta (una por cada horario × día de cada medicamento no-PRN) y son
 * la base del motor de recordatorios (y del futuro chatbot de WhatsApp).
 * Los datos del medicamento se denormalizan para que el worker no tenga que
 * repoblar la receta en cada envío.
 */
export interface IToma extends Document {
  _id: mongoose.Types.ObjectId;
  recetaId: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  medIndex: number;
  codigoReceta: string;
  medicamento: string;
  concentracion?: string;
  cantidad?: string;
  unidad?: string;
  momento?: string;
  programadaEn: Date;
  estado: TomaEstado;
  enviadaEn?: Date;
  canal: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

const tomaSchema = new Schema<IToma>(
  {
    recetaId: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true, index: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medIndex: { type: Number, required: true },
    codigoReceta: { type: String, required: true },
    medicamento: { type: String, required: true },
    concentracion: { type: String },
    cantidad: { type: String },
    unidad: { type: String },
    momento: { type: String },
    programadaEn: { type: Date, required: true },
    estado: {
      type: String,
      enum: Object.values(TomaEstado),
      default: TomaEstado.PENDIENTE,
    },
    enviadaEn: { type: Date },
    canal: { type: String, default: 'in_app' },
  },
  { collection: 'tomas', timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } },
);

// El worker barre por estado + hora: índice compuesto para esa consulta.
tomaSchema.index({ estado: 1, programadaEn: 1 });
// Listado de próximas tomas de un paciente.
tomaSchema.index({ pacienteId: 1, programadaEn: 1 });

export const Toma: Model<IToma> = mongoose.model<IToma>('Toma', tomaSchema);

import { PersonaRef } from './appointment.model';

export type InvoiceStatus = 'pendiente' | 'pagada' | 'anulada';

export interface InvoiceItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Invoice {
  _id: string;
  numero: string;
  pacienteId: PersonaRef;
  medicoId?: PersonaRef;
  citaId?: string;
  conceptos: InvoiceItem[];
  subtotal: number;
  impuestoPct: number;
  impuesto: number;
  total: number;
  estado: InvoiceStatus;
  notas?: string;
  metodoPago?: string;
  emitidaEn: string;
  pagadaEn?: string;
}

export interface CreateInvoicePayload {
  citaId?: string;
  pacienteId?: string;
  impuestoPct?: number;
  notas?: string;
  conceptos: InvoiceItem[];
}

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
  appointmentId?: string;
  items: InvoiceItem[];
  subtotal: number;
  impuestoPct: number;
  impuesto: number;
  total: number;
  estado: InvoiceStatus;
  notas?: string;
  emitidaEn: string;
  pagadaEn?: string;
}

export interface CreateInvoicePayload {
  appointmentId?: string;
  pacienteId?: string;
  impuestoPct?: number;
  notas?: string;
  items: InvoiceItem[];
}

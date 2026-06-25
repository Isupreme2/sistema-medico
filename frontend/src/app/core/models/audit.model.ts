export interface AuditEvent {
  _id: string;
  emailUsuario?: string;
  rol?: string;
  accion: string;
  metodo: string;
  ruta: string;
  codigoEstado: number;
  ip?: string;
  creadoEn: string;
}

export interface AuditPage {
  eventos: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  paginas: number;
}

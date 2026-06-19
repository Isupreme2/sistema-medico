export interface AuditEvent {
  _id: string;
  userEmail?: string;
  role?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  createdAt: string;
}

export interface AuditPage {
  eventos: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  paginas: number;
}

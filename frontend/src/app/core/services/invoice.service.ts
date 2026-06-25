import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { CreateInvoicePayload, Invoice } from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/invoices`;

  list(): Observable<Invoice[]> {
    return this.http
      .get<ApiResponse<{ facturas: Invoice[] }>>(this.api)
      .pipe(map((r) => r.data.facturas));
  }

  crear(payload: CreateInvoicePayload): Observable<Invoice> {
    return this.http
      .post<ApiResponse<{ factura: Invoice }>>(this.api, payload)
      .pipe(map((r) => r.data.factura));
  }

  /** Pago en línea de la consulta por el paciente: genera la factura pagada de la cita. */
  pagarCita(citaId: string, metodoPago?: string): Observable<Invoice> {
    return this.http
      .post<ApiResponse<{ factura: Invoice }>>(`${this.api}/pagar-cita/${citaId}`, { metodoPago })
      .pipe(map((r) => r.data.factura));
  }

  marcarPagada(id: string): Observable<Invoice> {
    return this.http
      .patch<ApiResponse<{ factura: Invoice }>>(`${this.api}/${id}/pay`, {})
      .pipe(map((r) => r.data.factura));
  }

  anular(id: string): Observable<Invoice> {
    return this.http
      .patch<ApiResponse<{ factura: Invoice }>>(`${this.api}/${id}/void`, {})
      .pipe(map((r) => r.data.factura));
  }

  /** Descarga el PDF de la factura (token vía interceptor) y dispara la descarga. */
  descargarPdf(factura: Invoice): void {
    this.http.get(`${this.api}/${factura._id}/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${factura.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

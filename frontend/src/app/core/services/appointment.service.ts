import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import {
  AlternativosResponse,
  Appointment,
  AppointmentModality,
  AppointmentStatus,
  Availability,
  PreConsulta,
  PreConsultaPayload,
  VideoAccess,
} from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/appointments`;

  getAlternativos(medicoId: string, fecha: string, hora?: string): Observable<AlternativosResponse> {
    let url = `${this.api}/alternativos?medicoId=${medicoId}&fecha=${fecha}`;
    if (hora) url += `&hora=${hora}`;
    return this.http
      .get<ApiResponse<AlternativosResponse>>(url)
      .pipe(map((r) => r.data));
  }

  disponibilidad(medicoId: string, fecha: string): Observable<Availability> {
    return this.http
      .get<ApiResponse<Availability>>(`${this.api}/disponibilidad/${medicoId}?fecha=${fecha}`)
      .pipe(map((r) => r.data));
  }

  reservar(payload: {
    medicoId: string;
    /** Solo lo envía Recepción/Admin al agendar por un tercero. */
    pacienteId?: string;
    fechaHora: string;
    tipoCitaId?: string;
    modalidad?: AppointmentModality;
    motivo?: string;
  }): Observable<Appointment> {
    return this.http
      .post<ApiResponse<{ cita: Appointment }>>(this.api, payload)
      .pipe(map((r) => r.data.cita));
  }

  /** Reserva del paciente con pago obligatorio: crea la cita y su factura pagada. */
  reservarYPagar(payload: {
    medicoId: string;
    fechaHora: string;
    tipoCitaId?: string;
    modalidad?: AppointmentModality;
    motivo?: string;
    metodoPago: string;
  }): Observable<Appointment> {
    return this.http
      .post<ApiResponse<{ cita: Appointment }>>(`${this.api}/reservar-y-pagar`, payload)
      .pipe(map((r) => r.data.cita));
  }

  list(filtros?: { desde?: string; hasta?: string }): Observable<Appointment[]> {
    const params = new URLSearchParams();
    if (filtros?.desde) params.set('desde', filtros.desde);
    if (filtros?.hasta) params.set('hasta', filtros.hasta);
    const qs = params.toString();
    return this.http
      .get<ApiResponse<{ citas: Appointment[] }>>(`${this.api}${qs ? '?' + qs : ''}`)
      .pipe(map((r) => r.data.citas));
  }

  cancelar(id: string): Observable<Appointment> {
    return this.http
      .patch<ApiResponse<{ cita: Appointment }>>(`${this.api}/${id}/cancel`, {})
      .pipe(map((r) => r.data.cita));
  }

  actualizarEstado(id: string, estado: AppointmentStatus): Observable<Appointment> {
    return this.http
      .patch<ApiResponse<{ cita: Appointment }>>(`${this.api}/${id}/status`, { estado })
      .pipe(map((r) => r.data.cita));
  }

  videoAccess(id: string): Observable<VideoAccess> {
    return this.http
      .get<ApiResponse<{ video: VideoAccess }>>(`${this.api}/${id}/video`)
      .pipe(map((r) => r.data.video));
  }

  getPreConsulta(id: string): Observable<PreConsulta | null> {
    return this.http
      .get<ApiResponse<{ preConsulta: PreConsulta | null }>>(`${this.api}/${id}/preconsulta`)
      .pipe(map((r) => r.data.preConsulta));
  }

  submitPreConsulta(id: string, payload: PreConsultaPayload): Observable<PreConsulta> {
    return this.http
      .post<ApiResponse<{ preConsulta: PreConsulta }>>(`${this.api}/${id}/preconsulta`, payload)
      .pipe(map((r) => r.data.preConsulta));
  }
}

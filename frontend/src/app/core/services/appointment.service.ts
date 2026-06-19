import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { Appointment, AppointmentStatus, Availability } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/appointments`;

  disponibilidad(medicoId: string, fecha: string): Observable<Availability> {
    return this.http
      .get<ApiResponse<Availability>>(`${this.api}/disponibilidad/${medicoId}?fecha=${fecha}`)
      .pipe(map((r) => r.data));
  }

  reservar(payload: {
    medicoId: string;
    fechaHora: string;
    appointmentTypeId?: string;
    motivo?: string;
  }): Observable<Appointment> {
    return this.http
      .post<ApiResponse<{ cita: Appointment }>>(this.api, payload)
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
}

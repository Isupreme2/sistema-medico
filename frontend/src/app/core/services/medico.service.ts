import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import {
  Bloqueo,
  CreateMedicoPayload,
  Horario,
  MedicoProfile,
} from '../models/medico.model';

@Injectable({ providedIn: 'root' })
export class MedicoService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/medicos`;

  list(soloActivos = false): Observable<MedicoProfile[]> {
    const url = soloActivos ? `${this.api}?activos=true` : this.api;
    return this.http
      .get<ApiResponse<{ medicos: MedicoProfile[] }>>(url)
      .pipe(map((r) => r.data.medicos));
  }

  get(userId: string): Observable<MedicoProfile> {
    return this.http
      .get<ApiResponse<{ medico: MedicoProfile }>>(`${this.api}/${userId}`)
      .pipe(map((r) => r.data.medico));
  }

  create(payload: CreateMedicoPayload): Observable<MedicoProfile> {
    return this.http
      .post<ApiResponse<{ medico: MedicoProfile }>>(this.api, payload)
      .pipe(map((r) => r.data.medico));
  }

  /** Activa o desactiva un médico (Admin). El userId es el del usuario médico. */
  setActivo(userId: string, activo: boolean): Observable<MedicoProfile> {
    return this.http
      .patch<ApiResponse<{ medico: MedicoProfile }>>(`${this.api}/${userId}`, { activo })
      .pipe(map((r) => r.data.medico));
  }

  updateHorario(
    userId: string,
    horarios: Horario[],
    duracionSlotMin?: number,
  ): Observable<MedicoProfile> {
    return this.http
      .put<ApiResponse<{ medico: MedicoProfile }>>(`${this.api}/${userId}/horario`, {
        horarios,
        duracionSlotMin,
      })
      .pipe(map((r) => r.data.medico));
  }

  // --- Bloqueos ---
  listBloqueos(userId: string): Observable<Bloqueo[]> {
    return this.http
      .get<ApiResponse<{ bloqueos: Bloqueo[] }>>(`${this.api}/${userId}/bloqueos`)
      .pipe(map((r) => r.data.bloqueos));
  }

  createBloqueo(
    userId: string,
    desde: string,
    hasta: string,
    motivo?: string,
  ): Observable<Bloqueo> {
    return this.http
      .post<ApiResponse<{ bloqueo: Bloqueo }>>(`${this.api}/${userId}/bloqueos`, {
        desde,
        hasta,
        motivo,
      })
      .pipe(map((r) => r.data.bloqueo));
  }

  deleteBloqueo(userId: string, bloqueoId: string): Observable<unknown> {
    return this.http.delete(`${this.api}/${userId}/bloqueos/${bloqueoId}`);
  }
}

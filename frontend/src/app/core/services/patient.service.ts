import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PatientLite } from '../models/user.model';

export interface CreatePatientPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  /** El backend los exige al registrar (registerSchema). */
  tipoDocumento: 'DNI' | 'CE' | 'PAS';
  numeroDocumento: string;
  /** Demográficos clave para la evaluación de riesgo. */
  fechaNacimiento?: string;
  sexo?: 'M' | 'F' | 'O';
}

/** Operaciones sobre pacientes que usa Recepción (buscar y registrar). */
@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/patients`;

  search(q?: string): Observable<PatientLite[]> {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return this.http
      .get<ApiResponse<{ pacientes: PatientLite[] }>>(`${this.api}${qs}`)
      .pipe(map((r) => r.data.pacientes));
  }

  create(payload: CreatePatientPayload): Observable<PatientLite> {
    return this.http
      .post<ApiResponse<{ paciente: PatientLite }>>(this.api, payload)
      .pipe(map((r) => r.data.paciente));
  }
}

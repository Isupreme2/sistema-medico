import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { AppointmentType } from '../models/medico.model';

@Injectable({ providedIn: 'root' })
export class AppointmentTypeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/appointment-types`;

  list(soloActivos = false): Observable<AppointmentType[]> {
    const url = soloActivos ? `${this.api}?activos=true` : this.api;
    return this.http
      .get<ApiResponse<{ tipos: AppointmentType[] }>>(url)
      .pipe(map((r) => r.data.tipos));
  }

  create(payload: {
    nombre: string;
    duracionMin: number;
    color?: string;
    descripcion?: string;
  }): Observable<AppointmentType> {
    return this.http
      .post<ApiResponse<{ tipo: AppointmentType }>>(this.api, payload)
      .pipe(map((r) => r.data.tipo));
  }

  update(id: string, payload: Partial<AppointmentType>): Observable<AppointmentType> {
    return this.http
      .patch<ApiResponse<{ tipo: AppointmentType }>>(`${this.api}/${id}`, payload)
      .pipe(map((r) => r.data.tipo));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.api}/${id}`);
  }
}

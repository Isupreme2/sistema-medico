import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';

export interface Recepcionista {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  activo: boolean;
  creadoEn: string;
}

export interface CreateStaffPayload {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/staff`;

  list(): Observable<Recepcionista[]> {
    return this.http
      .get<ApiResponse<{ recepcionistas: Recepcionista[] }>>(this.api)
      .pipe(map((r) => r.data.recepcionistas));
  }

  create(payload: CreateStaffPayload): Observable<Recepcionista> {
    return this.http
      .post<ApiResponse<{ usuario: Recepcionista }>>(this.api, payload)
      .pipe(map((r) => r.data.usuario));
  }
}

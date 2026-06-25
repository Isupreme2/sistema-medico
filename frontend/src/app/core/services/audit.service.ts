import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { AuditPage } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/audit`;

  list(filtros?: { metodo?: string; rol?: string; page?: number }): Observable<AuditPage> {
    const params = new URLSearchParams();
    if (filtros?.metodo) params.set('metodo', filtros.metodo);
    if (filtros?.rol) params.set('rol', filtros.rol);
    if (filtros?.page) params.set('page', String(filtros.page));
    const qs = params.toString();
    return this.http
      .get<ApiResponse<AuditPage>>(`${this.api}${qs ? '?' + qs : ''}`)
      .pipe(map((r) => r.data));
  }
}

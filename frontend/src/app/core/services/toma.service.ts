import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { Toma } from '../models/toma.model';

@Injectable({ providedIn: 'root' })
export class TomaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/tomas`;

  /** Próximas tomas del paciente autenticado. */
  proximas(): Observable<Toma[]> {
    return this.http
      .get<ApiResponse<{ tomas: Toma[] }>>(`${this.api}/proximas`)
      .pipe(map((r) => r.data.tomas));
  }

  /** Marca una toma como confirmada (el paciente la tomó). */
  confirmar(id: string): Observable<Toma> {
    return this.http
      .patch<ApiResponse<{ toma: Toma }>>(`${this.api}/${id}/confirmar`, {})
      .pipe(map((r) => r.data.toma));
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';

interface EspecialidadDto {
  _id: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class SpecialtyService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/especialidades`;

  /** Catálogo de especialidades (nombres), para el selector con buscador. */
  list(): Observable<string[]> {
    return this.http
      .get<ApiResponse<{ especialidades: EspecialidadDto[] }>>(this.api)
      .pipe(map((r) => r.data.especialidades.map((e) => e.nombre)));
  }

  /**
   * Público (sin login): solo las especialidades con al menos un médico activo.
   * Se usa en el sitio de marketing para no mostrar áreas sin médico asignado.
   */
  conMedicos(): Observable<string[]> {
    return this.http
      .get<ApiResponse<{ especialidades: string[] }>>(`${this.api}/publicas`)
      .pipe(map((r) => r.data.especialidades));
  }
}

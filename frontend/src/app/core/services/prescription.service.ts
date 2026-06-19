import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import {
  EmitirPayload,
  Prescription,
  SafetyResult,
} from '../models/prescription.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/prescriptions`;

  emitir(payload: EmitirPayload): Observable<{ receta: Prescription; safety: SafetyResult }> {
    return this.http
      .post<ApiResponse<{ receta: Prescription; safety: SafetyResult }>>(this.api, payload)
      .pipe(map((r) => r.data));
  }

  listByPatient(pacienteId: string): Observable<Prescription[]> {
    return this.http
      .get<ApiResponse<{ recetas: Prescription[] }>>(`${this.api}/paciente/${pacienteId}`)
      .pipe(map((r) => r.data.recetas));
  }

  /** Descarga el PDF (con el token vía interceptor) y dispara la descarga en el navegador. */
  descargarPdf(receta: Prescription): void {
    this.http
      .get(`${this.api}/${receta._id}/pdf`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receta-${receta.codigo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }
}

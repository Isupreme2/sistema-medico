import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { PredictionResponse } from '../models/prediction.model';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/predictions`;

  getPrediction(pacienteId: string): Observable<PredictionResponse> {
    return this.http
      .get<ApiResponse<{ prediction: PredictionResponse }>>(
        `${this.api}/paciente/${pacienteId}`,
      )
      .pipe(map((r) => r.data.prediction));
  }
}

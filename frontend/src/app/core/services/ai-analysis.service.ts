import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { AiAnalysis } from '../models/ai-analysis.model';

@Injectable({ providedIn: 'root' })
export class AiAnalysisService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ai-analysis`;

  analizar(pacienteId: string): Observable<AiAnalysis> {
    return this.http
      .get<ApiResponse<{ analysis: AiAnalysis }>>(`${this.api}/paciente/${pacienteId}`)
      .pipe(map((r) => r.data.analysis));
  }
}

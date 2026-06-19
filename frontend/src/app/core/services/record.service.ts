import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { CreateRecordPayload, MedicalRecord } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class RecordService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/records`;

  create(payload: CreateRecordPayload): Observable<MedicalRecord> {
    return this.http
      .post<ApiResponse<{ record: MedicalRecord }>>(this.api, payload)
      .pipe(map((r) => r.data.record));
  }

  listByPatient(pacienteId: string): Observable<MedicalRecord[]> {
    return this.http
      .get<ApiResponse<{ records: MedicalRecord[] }>>(`${this.api}/paciente/${pacienteId}`)
      .pipe(map((r) => r.data.records));
  }

  getById(id: string): Observable<MedicalRecord> {
    return this.http
      .get<ApiResponse<{ record: MedicalRecord }>>(`${this.api}/${id}`)
      .pipe(map((r) => r.data.record));
  }
}

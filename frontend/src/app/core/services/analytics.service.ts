import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/user.model';
import { Overview } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/analytics`;

  overview(): Observable<Overview> {
    return this.http
      .get<ApiResponse<Overview>>(`${this.api}/overview`)
      .pipe(map((r) => r.data));
  }
}

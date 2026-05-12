import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recording } from '../models/recording.model';

@Injectable({ providedIn: 'root' })
export class RecordingsService {
  private http = inject(HttpClient);
  private base = '/api/recordings';

  getRecordings(filters?: {
    cameraId?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }): Observable<Recording[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<Recording[]>(this.base, { params });
  }

  startRecording(cameraId: string): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(`${this.base}/${cameraId}/start`, {});
  }

  stopRecording(cameraId: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/${cameraId}/stop`, {});
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CameraEvent, EventStats } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private http = inject(HttpClient);
  private base = '/api/events';

  getEvents(filters?: {
    cameraId?: string;
    type?: string;
    date?: string;
    reviewed?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<CameraEvent[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<CameraEvent[]>(this.base, { params });
  }

  getStats(): Observable<EventStats> {
    return this.http.get<EventStats>(`${this.base}/stats`);
  }

  markReviewed(id: string, reviewed: boolean): Observable<CameraEvent> {
    return this.http.patch<CameraEvent>(`${this.base}/${id}`, { reviewed });
  }

  markFalsePositive(id: string, fp: boolean): Observable<CameraEvent> {
    return this.http.patch<CameraEvent>(`${this.base}/${id}`, { false_positive: fp });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }
}

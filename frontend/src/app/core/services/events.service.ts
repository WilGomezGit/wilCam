import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CameraEvent, EventStats } from '../models/event.model';

interface EventsResponse {
  events: CameraEvent[];
  total: number;
  limit: number;
  offset: number;
}

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
      if (filters.cameraId != null) params = params.set('camera_id', String(filters.cameraId));
      if (filters.type != null) params = params.set('type', String(filters.type));
      if (filters.date != null) params = params.set('date', String(filters.date));
      if (filters.reviewed != null) params = params.set('reviewed', String(filters.reviewed));
      if (filters.limit != null) params = params.set('limit', String(filters.limit));
      if (filters.offset != null) params = params.set('offset', String(filters.offset));
    }
    return this.http.get<EventsResponse>(this.base, { params }).pipe(
      map(res => res.events ?? [])
    );
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

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}

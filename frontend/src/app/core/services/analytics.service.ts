import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);

  getOverview(period: '24h' | '7d' | '30d' = '7d'): Observable<any> {
    return this.http.get(`/api/analytics/overview?period=${period}`);
  }

  getTimeseries(period: '24h' | '7d' | '30d' = '7d', cameraId?: string, eventType?: string): Observable<any[]> {
    let url = `/api/analytics/timeseries?period=${period}`;
    if (cameraId) url += `&camera_id=${cameraId}`;
    if (eventType) url += `&event_type=${eventType}`;
    return this.http.get<any[]>(url);
  }

  getCameraUptime(): Observable<any[]> {
    return this.http.get<any[]>('/api/analytics/cameras/uptime');
  }

  getHeatmap(cameraId?: string): Observable<any[]> {
    const url = cameraId ? `/api/analytics/heatmap?camera_id=${cameraId}` : '/api/analytics/heatmap';
    return this.http.get<any[]>(url);
  }

  getAIAccuracy(): Observable<any> {
    return this.http.get('/api/analytics/ai/accuracy');
  }

  getStorageStats(): Observable<any> {
    return this.http.get('/api/analytics/storage');
  }

  getAIStats(period: '24h' | '7d' | '30d' = '24h'): Observable<any> {
    return this.http.get(`/api/ai/stats?period=${period}`);
  }
}

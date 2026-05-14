import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Camera } from '../models/camera.model';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private http = inject(HttpClient);
  private base = '/api/cameras';

  getAll(): Observable<Camera[]> {
    return this.http.get<Camera[]>(this.base);
  }

  getById(id: string): Observable<Camera> {
    return this.http.get<Camera>(`${this.base}/${id}`);
  }

  create(camera: Partial<Camera>): Observable<Camera> {
    return this.http.post<Camera>(this.base, camera);
  }

  update(id: string, camera: Partial<Camera>): Observable<Camera> {
    return this.http.put<Camera>(`${this.base}/${id}`, camera);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }

  testConnection(rtspUrl: string): Observable<{ success: boolean; latencyMs?: number }> {
    return this.http.post<{ success: boolean; latencyMs?: number }>(`${this.base}/test-connection`, { rtsp_url: rtspUrl });
  }
}

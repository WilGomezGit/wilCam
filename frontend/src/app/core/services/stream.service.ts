import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StreamService {
  private http = inject(HttpClient);

  startStream(cameraId: string): Observable<{ streaming: boolean; hlsUrl: string }> {
    return this.http.post<{ streaming: boolean; hlsUrl: string }>(`/api/streams/${cameraId}/start`, {});
  }

  stopStream(cameraId: string): Observable<{ streaming: boolean }> {
    return this.http.post<{ streaming: boolean }>(`/api/streams/${cameraId}/stop`, {});
  }

  getStatus(cameraId: string): Observable<{ cameraId: string; streaming: boolean; hlsUrl: string | null }> {
    return this.http.get<{ cameraId: string; streaming: boolean; hlsUrl: string | null }>(`/api/streams/${cameraId}/status`);
  }

  captureSnapshot(cameraId: string): Observable<{ filename: string; url: string }> {
    return this.http.post<{ filename: string; url: string }>(`/api/streams/${cameraId}/snapshot`, {});
  }

  getActiveStreams(): Observable<Array<{ cameraId: string; startedAt: string; url: string }>> {
    return this.http.get<Array<{ cameraId: string; startedAt: string; url: string }>>('/api/streams');
  }
}

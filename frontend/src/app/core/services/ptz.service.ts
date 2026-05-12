import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PtzAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'up-left' | 'up-right' | 'down-left' | 'down-right'
  | 'zoom-in' | 'zoom-out' | 'stop';

@Injectable({ providedIn: 'root' })
export class PtzService {
  private http = inject(HttpClient);
  private base = '/api/ptz';

  move(cameraId: string, action: PtzAction, speed = 0.5): Observable<unknown> {
    return this.http.post(`${this.base}/${cameraId}/${action}`, { speed });
  }

  stop(cameraId: string): Observable<unknown> {
    return this.http.post(`${this.base}/${cameraId}/stop`, {});
  }

  goToPreset(cameraId: string, presetToken: string): Observable<unknown> {
    return this.http.post(`${this.base}/${cameraId}/preset/${presetToken}`, {});
  }
}

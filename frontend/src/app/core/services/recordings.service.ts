import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Recording, RecordingFile, RecordingsPage } from '../models/recording.model';

@Injectable({ providedIn: 'root' })
export class RecordingsService {
  private http = inject(HttpClient);
  private base = '/api/recordings';

  getRecordings(filters?: {
    cameraId?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }): Observable<RecordingsPage> {
    let params = new HttpParams();
    if (filters?.cameraId) params = params.set('camera_id', filters.cameraId);
    if (filters?.date)     params = params.set('date', filters.date);
    if (filters?.limit)    params = params.set('limit', String(filters.limit));
    if (filters?.offset)   params = params.set('offset', String(filters.offset));
    return this.http.get<RecordingsPage>(this.base, { params });
  }

  /** List actual recording files on disk for a camera + date (YYYY-MM-DD) */
  getFiles(cameraId: string, date: string): Observable<RecordingFile[]> {
    return this.http
      .get<{ files: RecordingFile[] }>(`${this.base}/files/${cameraId}?date=${date}`)
      .pipe(map(r => r.files));
  }

  /** List dates (YYYY-MM-DD strings) that have recordings for camera in given month */
  getDates(cameraId: string, year: number, month: number): Observable<string[]> {
    return this.http
      .get<{ dates: string[] }>(`${this.base}/dates/${cameraId}?year=${year}&month=${month}`)
      .pipe(map(r => r.dates));
  }

  startRecording(cameraId: string): Observable<{ message: string; recordingId: string }> {
    return this.http.post<{ message: string; recordingId: string }>(`${this.base}/${cameraId}/start`, {});
  }

  stopRecording(cameraId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${cameraId}/stop`, {});
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}

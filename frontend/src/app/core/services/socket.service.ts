import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { CameraEvent } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;
  private destroyed$ = new Subject<void>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    this.socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => console.log('[WS] connected:', this.socket.id));
    this.socket.on('disconnect', () => console.log('[WS] disconnected'));
  }

  subscribeToCamera(cameraId: string): void {
    this.socket.emit('subscribe:camera', cameraId);
  }

  unsubscribeFromCamera(cameraId: string): void {
    this.socket.emit('unsubscribe:camera', cameraId);
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
      return () => this.socket.off(event);
    });
  }

  get cameraStatus$(): Observable<{ cameraId: string; status: string; ts: number }> {
    return this.on('camera:status');
  }

  get newEvent$(): Observable<CameraEvent> {
    return this.on('event:new');
  }

  get streamStatus$(): Observable<{ cameraId: string; streaming: boolean; hlsUrl: string | null; ts: number }> {
    return this.on('stream:status');
  }

  get systemStats$(): Observable<{ cameras: number; events: number; streams: number; ts: number }> {
    return this.on('system:stats');
  }

  get recordingUpdate$(): Observable<{ cameraId: string; recording: unknown }> {
    return this.on('recording:update');
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.socket?.disconnect();
  }
}

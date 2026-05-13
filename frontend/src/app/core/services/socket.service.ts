import { Injectable, inject, OnDestroy, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private auth = inject(AuthService);
  private socket: Socket | null = null;
  private subjects = new Map<string, Subject<unknown>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  readonly isConnected = signal(false);

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.auth.getAccessToken();
    if (!token) return;

    this.socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: false, // we handle manually
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
      this.reconnectAttempts = 0;
      console.log('[WS] Conectado');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected.set(false);
      console.log('[WS] Desconectado:', reason);
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      this.isConnected.set(false);
      if (err.message === 'Token inválido' || err.message === 'Token requerido') {
        console.error('[WS] Auth error:', err.message);
        return;
      }
      this.scheduleReconnect();
    });

    // Forward all tracked events
    for (const [event, subject] of this.subjects) {
      this.socket.on(event, (data: unknown) => subject.next(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[WS] Reconectando en ${delay}ms (intento ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.socket?.close();
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected.set(false);
  }

  on<T>(event: string): Observable<T> {
    if (!this.subjects.has(event)) {
      const subject = new Subject<unknown>();
      this.subjects.set(event, subject);
      this.socket?.on(event, (data: unknown) => subject.next(data));
    }
    return this.subjects.get(event)!.asObservable() as Observable<T>;
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  joinCamera(cameraId: string): void { this.emit('subscribe:camera', cameraId); }
  leaveCamera(cameraId: string): void { this.emit('unsubscribe:camera', cameraId); }

  get cameraStatus$() { return this.on<{ cameraId: string; status: string }>('camera:status'); }
  get newEvent$() { return this.on<unknown>('event:new'); }
  get streamStatus$() { return this.on<{ cameraId: string; streaming: boolean; hlsUrl?: string }>('stream:status'); }
  get systemStats$() { return this.on<unknown>('system:stats'); }
  get recordingUpdate$() { return this.on<{ cameraId: string; recording: boolean }>('recording:update'); }

  ngOnDestroy(): void { this.disconnect(); }
}

import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warn' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private show(type: NotificationType, message: string, duration = 4000): void {
    const id = crypto.randomUUID();
    this._notifications.update(n => [...n, { id, type, message, duration }]);
    if (duration > 0) setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 3000): void { this.show('success', message, duration); }
  error(message: string, duration = 6000): void { this.show('error', message, duration); }
  warn(message: string, duration = 5000): void { this.show('warn', message, duration); }
  info(message: string, duration = 4000): void { this.show('info', message, duration); }

  dismiss(id: string): void {
    this._notifications.update(n => n.filter(x => x.id !== id));
  }

  clear(): void { this._notifications.set([]); }
}

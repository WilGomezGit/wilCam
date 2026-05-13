import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'wc-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:380px">
      @for (n of ns.notifications(); track n.id) {
        <div class="notif" [class]="'notif-' + n.type" style="animation:fadeIn 0.2s ease">
          <span class="notif-icon">
            @switch (n.type) {
              @case ('success') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              }
              @case ('error') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              }
              @case ('warn') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              }
              @default {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              }
            }
          </span>
          <span style="flex:1;font-size:13px">{{ n.message }}</span>
          <button (click)="ns.dismiss(n.id)" style="background:none;border:none;cursor:pointer;color:inherit;opacity:0.6;padding:0;margin-left:8px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notif {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 8px;
      backdrop-filter: blur(16px); border: 1px solid;
      font-size: 13px; color: var(--fg-0);
      box-shadow: 0 4px 24px oklch(0 0 0 / 0.4);
    }
    .notif-success { background: oklch(0.22 0.06 150 / 0.9); border-color: oklch(0.55 0.14 150 / 0.5); color: oklch(0.85 0.14 150); }
    .notif-error { background: oklch(0.22 0.06 25 / 0.9); border-color: oklch(0.55 0.18 25 / 0.5); color: oklch(0.85 0.15 25); }
    .notif-warn { background: oklch(0.22 0.06 60 / 0.9); border-color: oklch(0.55 0.18 60 / 0.5); color: oklch(0.85 0.15 60); }
    .notif-info { background: oklch(0.18 0.04 245 / 0.9); border-color: var(--line-2); color: var(--accent-2); }
    .notif-icon { display: flex; align-items: center; flex-shrink: 0; }
  `]
})
export class NotificationsComponent {
  protected ns = inject(NotificationService);
}

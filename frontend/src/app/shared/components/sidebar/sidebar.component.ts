import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WilcamLogoComponent } from '../wilcam-logo/wilcam-logo.component';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'wc-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WilcamLogoComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <!-- Logo -->
      <div class="sidebar-logo">
        <wc-logo [size]="14" [collapsed]="collapsed()" [sub]="collapsed() ? null : 'NVR · v1.0'"></wc-logo>
        <button class="collapse-btn" (click)="collapsed.set(!collapsed())" [title]="collapsed() ? 'Expandir' : 'Colapsar'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            @if (collapsed()) {
              <path d="M9 18l6-6-6-6"/>
            } @else {
              <path d="M15 18l-6-6 6-6"/>
            }
          </svg>
        </button>
      </div>

      <!-- Search (expanded only) -->
      @if (!collapsed()) {
        <div class="sidebar-search">
          <span class="icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
            </svg>
          </span>
          <span>Buscar…</span>
          <span class="mono" style="margin-left:auto;font-size:9px;padding:2px 5px;background:var(--bg-3);border-radius:3px">⌘K</span>
        </div>
      }

      <!-- Nav -->
      <nav>
        @for (item of navItems; track item.id) {
          <a [routerLink]="item.route" routerLinkActive="active" class="sb-item"
             [style.justify-content]="collapsed() ? 'center' : 'flex-start'"
             [title]="collapsed() ? item.label : ''">
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            @if (!collapsed()) {
              <span>{{ item.label }}</span>
              @if (item.badge) {
                <span class="mono nav-badge">{{ item.badge }}</span>
              }
            }
          </a>
        }
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        @if (!collapsed()) {
          <div class="system-status panel">
            <div style="display:flex;align-items:center;gap:6px;color:var(--fg-2);margin-bottom:6px">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px oklch(0.78 0.17 155/0.6)"></span>
              <span class="mono" style="font-size:9px;letter-spacing:0.12em">SISTEMA</span>
              <span style="margin-left:auto;color:var(--ok);font-size:11px">OPERATIVO</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:var(--fg-3);font-size:10px">
              <span>NVR-01</span><span class="mono">99.98%</span>
            </div>
            <div style="height:4px;background:var(--bg-3);border-radius:999px;margin-top:6px;overflow:hidden">
              <div style="width:76%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));border-radius:999px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:var(--fg-3)">
              <span>Almacenamiento</span><span class="mono">7.6 / 10 TB</span>
            </div>
          </div>
        }

        <div class="user-row" [style.justify-content]="collapsed() ? 'center' : 'flex-start'">
          <div class="user-avatar">{{ userInitials() }}</div>
          @if (!collapsed()) {
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ auth.user()?.name || 'Usuario' }}</div>
              <div style="font-size:10px;color:var(--fg-3);text-transform:capitalize">{{ auth.user()?.role || '—' }}</div>
            </div>
            <button class="logout-btn" (click)="auth.logout()" title="Cerrar sesión">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          }
        </div>

        @if (collapsed()) {
          <button class="logout-btn" (click)="auth.logout()" title="Cerrar sesión" style="align-self:center;margin-top:4px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        }
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 232px;
      flex-shrink: 0;
      height: 100%;
      background: oklch(0.14 0.012 245 / 0.85);
      border-right: 1px solid var(--line-1);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      padding: 20px 16px;
      gap: 18px;
      transition: width 0.2s;
    }

    .sidebar.collapsed {
      width: 64px;
      padding: 20px 8px;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      padding: 0 4px;
      gap: 8px;
    }

    .collapse-btn {
      margin-left: auto;
      flex-shrink: 0;
      background: none;
      border: 1px solid var(--line-1);
      border-radius: var(--r-sm);
      color: var(--fg-3);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, border-color 0.15s;
    }

    .collapse-btn:hover {
      color: var(--fg-0);
      border-color: var(--line-2);
    }

    .sidebar.collapsed .collapse-btn {
      margin-left: 0;
    }

    .sidebar-search {
      padding: 8px 10px;
      border-radius: var(--r-sm);
      background: var(--bg-2);
      border: 1px solid var(--line-1);
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--fg-2);
      font-size: 12px;
      cursor: pointer;
    }

    nav { display: flex; flex-direction: column; gap: 2px; }

    .nav-icon { color: var(--fg-2); display: flex; align-items: center; flex-shrink: 0; }
    .sb-item.active .nav-icon { color: var(--accent-2); }

    .nav-badge {
      margin-left: auto;
      font-size: 9px;
      padding: 2px 6px;
      background: var(--bg-3);
      border-radius: 999px;
      color: var(--fg-2);
    }

    .sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }

    .system-status { padding: 12px; font-size: 11px; }

    .user-row { display: flex; align-items: center; gap: 10px; padding: 6px 4px; }

    .user-avatar {
      width: 30px; height: 30px;
      border-radius: 999px;
      background: linear-gradient(135deg, oklch(0.68 0.16 250), oklch(0.78 0.14 200));
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      color: oklch(0.14 0.013 245);
      flex-shrink: 0;
    }

    .logout-btn {
      background: none;
      border: 1px solid var(--line-1);
      border-radius: var(--r-sm);
      color: var(--fg-3);
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }

    .logout-btn:hover {
      color: oklch(0.85 0.15 25);
      border-color: oklch(0.55 0.18 25 / 0.4);
      background: oklch(0.22 0.06 25 / 0.3);
    }
  `]
})
export class SidebarComponent {
  protected auth = inject(AuthService);

  collapsed = signal(false);

  userInitials(): string {
    const name = this.auth.user()?.name || '';
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0] || '')
      .join('')
      .toUpperCase() || 'WC';
  }

  readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: gridIcon() },
    { id: 'live', label: 'Cámaras en vivo', route: '/live', icon: camIcon() },
    { id: 'dvr', label: 'Grabaciones', route: '/dvr', icon: playIcon(), badge: '24h' },
    { id: 'events', label: 'Eventos', route: '/events', icon: bellIcon(), badge: '12' },
    { id: 'map', label: 'Mapa', route: '/map', icon: mapIcon() },
    { id: 'heatmap', label: 'Heatmap', route: '/heatmap', icon: flameIcon() },
    { id: 'analytics', label: 'Analytics IA', route: '/analytics', icon: analyticsIcon() },
    { id: 'settings', label: 'Configuración', route: '/settings', icon: cogIcon() },
  ];
}

function svg(d: string) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}
function gridIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>`; }
function camIcon() { return svg('M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3z'); }
function playIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8L6 20z"/></svg>`; }
function bellIcon() { return svg('M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0'); }
function mapIcon() { return svg('M9 4v16M15 8v12M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z'); }
function flameIcon() { return svg('M15 14a3 3 0 1 1-6 0c0-2 2-3 1-6 3 1 6 4 5 6zM12 22c5 0 8-3 8-7 0-5-4-7-4-12-3 3-9 5-9 12 0 4 3 7 5 7z'); }
function cogIcon() { return svg('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z'); }
function analyticsIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>`; }

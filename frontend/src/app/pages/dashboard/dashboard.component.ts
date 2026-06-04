import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { CameraService } from '../../core/services/camera.service';
import { EventsService } from '../../core/services/events.service';
import { SocketService } from '../../core/services/socket.service';
import { Camera } from '../../core/models/camera.model';
import { CameraEvent } from '../../core/models/event.model';

const SCENE_MAP: Record<string, string> = {
  'cam-01': 'parking',  'cam-02': 'entrance', 'cam-03': 'office',
  'cam-04': 'warehouse','cam-05': 'street',   'cam-06': 'hallway',
  'cam-07': 'reception','cam-08': 'loading',  'cam-09': 'rooftop',
};

@Component({
  selector: 'wc-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CameraFeedComponent],
  template: `
    <div class="page-wrap">
      <!-- TOP BAR -->
      <header class="topbar-custom">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px">
          <span style="color:var(--fg-3)">Sucursal Lima</span>
          <span style="color:var(--fg-4);font-size:10px">›</span>
          <span style="color:var(--fg-0);font-weight:500">Centro de Monitoreo</span>
          <span class="chip acc" style="margin-left:6px;padding:1px 7px;font-size:9px">EN VIVO</span>
        </div>

        <div class="cmd" style="margin-left:auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          <span style="flex:1;color:var(--fg-3)">Buscar cámaras, eventos, ubicaciones…</span>
          <span class="kbd">⌘</span><span class="kbd">K</span>
        </div>

        <div style="display:flex;align-items:center;gap:10px;padding-left:8px;border-left:1px solid var(--line-0)">
          <div class="avatar-stack">
            <div class="avatar online" style="background:linear-gradient(135deg,oklch(0.68 0.16 250),oklch(0.78 0.14 200))">WR</div>
            <div class="avatar online" style="background:linear-gradient(135deg,oklch(0.72 0.18 60),oklch(0.78 0.14 90))">MJ</div>
            <div class="avatar online" style="background:linear-gradient(135deg,oklch(0.65 0.22 340),oklch(0.78 0.18 320))">AC</div>
          </div>
          <div style="font-size:11px;color:var(--fg-2);line-height:1.2">
            <div style="color:var(--fg-1)"><span class="num">3</span> en línea</div>
            <div style="color:var(--fg-3);font-size:10px" class="mono">EQUIPO 24/7</div>
          </div>
        </div>

        <div style="width:1px;height:24px;background:var(--line-0)"></div>
        <button class="btn icon ghost" style="position:relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/></svg>
          @if (unreviewedCount() > 0) {
            <span class="notif-dot"></span>
          }
        </button>
        <a class="btn primary" routerLink="/settings" style="font-size:12.5px;padding:8px 14px;text-decoration:none">
          + Añadir cámara
        </a>
      </header>

      <!-- BODY -->
      <div class="dash-body">

        <!-- GREETING + METRICS -->
        <section class="metrics-section">
          <!-- Greeting card -->
          <div class="card hero noise" style="padding:22px;position:relative;overflow:hidden">
            <div class="mono" style="font-size:10px;letter-spacing:0.18em;color:var(--accent-2)">◆ {{ todayLabel }} · LIMA (UTC-5)</div>
            <div style="font-size:24px;font-weight:500;letter-spacing:-0.02em;margin-top:12px;line-height:1.2">
              Buenos días,<br><span style="color:var(--accent-2)">Wilfredo.</span>
            </div>
            <div style="font-size:12.5px;color:var(--fg-2);margin-top:10px;line-height:1.5">
              Hoy tu sistema registró <strong style="color:var(--fg-0)">{{ todayEvents() }} eventos</strong>,
              de los cuales <strong style="color:var(--live)">{{ unreviewedCount() }} siguen sin revisar</strong>.
            </div>
            <div style="margin-top:16px;display:flex;gap:8px">
              <a class="btn primary" routerLink="/events" style="font-size:12px;padding:7px 12px;text-decoration:none">Revisar eventos</a>
              <a class="btn ghost" routerLink="/heatmap" style="font-size:12px;padding:7px 12px;text-decoration:none">Ver resumen</a>
            </div>
            <div style="position:absolute;right:-40px;top:-40px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,var(--accent-soft),transparent 70%);pointer-events:none"></div>
          </div>

          <!-- Metric strip -->
          <div class="metric-strip">
            <!-- Active cameras -->
            <div class="card" style="padding:18px;position:relative;overflow:hidden">
              <div style="display:flex;align-items:flex-start;justify-content:space-between">
                <div class="mono" style="font-size:9.5px;color:var(--fg-3);letter-spacing:0.16em">CÁMARAS ACTIVAS</div>
                <span class="delta up">↑ 1</span>
              </div>
              <div style="display:flex;align-items:baseline;gap:4px;margin-top:8px">
                <div class="num" style="font-size:56px;font-weight:200;line-height:0.95">{{ onlineCams() }}</div>
                <span style="font-size:22px;color:var(--fg-3);font-weight:300" class="num"> / {{ cameras().length }}</span>
              </div>
              <div style="display:flex;gap:3px;margin-top:12px">
                @for (i of camSlots(); track $index) {
                  <div style="flex:1;height:4px;border-radius:1px"
                       [style.background]="$index < onlineCams() ? 'var(--accent-2)' : 'var(--bg-3)'"
                       [style.box-shadow]="$index < onlineCams() ? '0 0 6px oklch(0.85 0.14 205/0.4)' : 'none'"></div>
                }
              </div>
              @if (cameras().length === 0) {
                <div style="font-size:10.5px;color:var(--fg-3);margin-top:8px" class="mono">SIN CÁMARAS CONFIGURADAS</div>
              } @else if (onlineCams() < cameras().length) {
                <div style="font-size:10.5px;color:var(--warn);margin-top:8px" class="mono">{{ cameras().length - onlineCams() }} OFFLINE</div>
              } @else {
                <div style="font-size:10.5px;color:var(--ok);margin-top:8px" class="mono">TODAS OPERATIVAS</div>
              }
            </div>

            <!-- Events -->
            <div class="card" style="padding:16px">
              <div class="mono" style="font-size:9.5px;color:var(--fg-3);letter-spacing:0.16em">EVENTOS · HOY</div>
              <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px">
                <span class="num" style="font-size:28px;font-weight:300;letter-spacing:-0.02em">{{ todayEvents() }}</span>
                <span class="delta up" style="margin-left:auto">+12%</span>
              </div>
              <svg [attr.width]="120" [attr.height]="28" viewBox="0 0 120 28" style="overflow:visible;margin-top:4px">
                <polyline [attr.points]="sparkPoints" fill="none" stroke="oklch(0.78 0.17 155)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div style="font-size:10px;color:var(--fg-3);margin-top:4px">{{ unreviewedCount() }} sin revisar</div>
            </div>

            <!-- Storage -->
            <div class="card" style="padding:16px">
              <div class="mono" style="font-size:9.5px;color:var(--fg-3);letter-spacing:0.16em">ALMACENAMIENTO</div>
              <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
                <div style="flex:1">
                  <div style="font-size:22px;font-weight:300;letter-spacing:-0.02em" class="num">7.6<span style="font-size:13px;color:var(--fg-3);margin-left:3px">TB</span></div>
                  <div style="font-size:10px;color:var(--fg-3);margin-top:2px">de 10 TB</div>
                </div>
                <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
                  <div class="ring" style="--pct:76;--color:oklch(0.82 0.17 80);width:44px;height:44px"></div>
                  <span class="ring-label" style="font-size:9px">76%</span>
                </div>
              </div>
              <div style="display:flex;gap:4px;margin-top:8px">
                <div style="flex:7.6;height:3px;background:linear-gradient(90deg,oklch(0.82 0.17 80),oklch(0.72 0.18 60));border-radius:999px"></div>
                <div style="flex:2.4;height:3px;background:var(--bg-3);border-radius:999px"></div>
              </div>
            </div>

            <!-- Network -->
            <div class="card" style="padding:16px">
              <div class="mono" style="font-size:9.5px;color:var(--fg-3);letter-spacing:0.16em">RED · IN/OUT</div>
              <div style="display:flex;align-items:baseline;gap:4px;margin-top:6px">
                <span class="num" style="font-size:24px;font-weight:300;letter-spacing:-0.02em">184</span>
                <span style="font-size:11px;color:var(--fg-3)">Mbps</span>
                <span class="delta flat" style="margin-left:auto">≈</span>
              </div>
              <svg width="120" height="28" viewBox="0 0 120 28" style="overflow:visible;margin-top:4px">
                <polyline [attr.points]="netPoints" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div style="font-size:10px;color:var(--fg-3);margin-top:4px">pico 240 · prom 156</div>
            </div>
          </div>
        </section>

        <!-- LIVE + SIDE RAIL -->
        <section class="live-section">
          <!-- LEFT: live camera grid -->
          <div class="cam-grid-wrap">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="h-section">
                <span style="display:inline-flex;align-items:center;gap:6px;color:var(--live);font-family:var(--font-mono);font-size:10px;letter-spacing:0.16em">
                  <span class="breath-dot"></span> EN VIVO
                </span>
                <span style="color:var(--fg-2)">· Vista del operador</span>
                <span class="count">{{ cameras().length }}</span>
              </div>

              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <!-- Grid size selector -->
                <div style="display:flex;gap:2px;padding:3px;background:var(--bg-1);border:1px solid var(--line-0);border-radius:8px">
                  @for (g of gridOptions; track g.key) {
                    <button class="mono" (click)="setGrid(g.key)"
                            [style.background]="gridMode() === g.key ? 'var(--accent-soft)' : 'transparent'"
                            [style.color]="gridMode() === g.key ? 'var(--accent-2)' : 'var(--fg-2)'"
                            style="padding:5px 10px;font-size:10px;letter-spacing:0.08em;border:none;cursor:pointer;border-radius:5px">
                      {{ g.label }}
                    </button>
                  }
                </div>
                <button class="btn ghost" style="font-size:12px">Filtros</button>
                <a class="btn ghost" routerLink="/live" style="font-size:12px;text-decoration:none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                </a>
              </div>
            </div>

            <div class="cam-grid" [style.grid-template-columns]="'repeat(' + gridCols() + ', 1fr)'">
              @for (cam of visibleCams(); track cam.id) {
                <div class="lift" style="position:relative;min-height:0">
                  <a [routerLink]="['/live', cam.id]" style="display:block;text-decoration:none">
                    <wc-camera-feed
                      [scene]="getScene(cam.id)"
                      [status]="cam.status === 'online' ? 'live' : 'offline'"
                      [quality]="cam.resolution"
                      [showName]="false"
                      [showTc]="true"
                      [feedStyle]="{'width':'100%','aspectRatio':'16/9'}">
                      <div class="feed-gradient"></div>
                      <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 12px;display:flex;align-items:flex-end;justify-content:space-between;z-index:6;gap:8px">
                        <div style="min-width:0">
                          <div class="mono" style="font-size:9px;color:var(--accent-2);letter-spacing:0.1em">{{ cam.id.toUpperCase() }}</div>
                          <div style="font-size:11.5px;font-weight:500;color:oklch(0.98 0 0);text-shadow:0 1px 4px oklch(0 0 0/0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ cam.name }}</div>
                          <div style="font-size:9.5px;color:oklch(0.85 0.02 240);text-shadow:0 1px 3px oklch(0 0 0/0.9);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ cam.location }}</div>
                        </div>
                        @if (cam.status === 'online') {
                          <div class="glass-hud" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                          </div>
                        }
                      </div>
                    </wc-camera-feed>
                  </a>
                </div>
              }
            </div>
          </div>

          <!-- RIGHT RAIL -->
          <aside class="right-rail">
            <!-- Live alerts -->
            <div class="card" style="padding:14px;display:flex;flex-direction:column;min-height:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span class="breath-dot"></span>
                <div class="h-section" style="font-size:12px">Alertas en vivo <span class="count">{{ unreviewedCount() }}</span></div>
                <a class="btn ghost" routerLink="/events" style="margin-left:auto;padding:2px 6px;font-size:10px;text-decoration:none">Ver todo</a>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;overflow:hidden">
                @for (alert of recentAlerts(); track alert.id) {
                  <div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;cursor:pointer"
                       [style.border-top]="$index > 0 ? '1px solid var(--line-0)' : 'none'">
                    <div style="width:40px;height:28px;border-radius:4px;overflow:hidden;flex-shrink:0;position:relative;border:1px solid var(--line-0)">
                      <wc-camera-feed [scene]="getScene(alert.camera_id)" name="" status="rec" quality="" tc=""
                                      [showName]="false" [showTc]="false" [corners]="false"
                                      [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                    </div>
                    <div style="min-width:0;flex:1">
                      <div style="font-size:12px;font-weight:500;color:var(--fg-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ alert.event_type }}</div>
                      <div style="font-size:10px;color:var(--fg-3);display:flex;align-items:center;gap:5px;margin-top:1px">
                        <span class="mono">{{ alert.camera_id.toUpperCase() }}</span>
                        <span>·</span>
                        <span class="mono">{{ getRelativeTime(alert.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Top cameras -->
            <div class="card" style="padding:14px">
              <div class="h-section" style="font-size:12px;margin-bottom:10px">
                Más activas hoy
                <span style="margin-left:auto;font-size:9.5px;color:var(--fg-3)" class="mono">24H</span>
              </div>
              @for (item of topCams; track item[0]) {
                <div style="margin-bottom:9px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                    <span style="display:flex;align-items:center;gap:6px;min-width:0">
                      <span class="mono" style="color:var(--accent-2);font-size:10px">{{ item[0] }}</span>
                      <span style="color:var(--fg-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item[1] }}</span>
                    </span>
                    <span class="mono num" style="color:var(--fg-3);font-size:10px">{{ item[2] }}</span>
                  </div>
                  <div style="height:4px;background:var(--bg-3);border-radius:999px;overflow:hidden">
                    <div [style.width.%]="item[3]" style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));border-radius:999px"></div>
                  </div>
                </div>
              }
            </div>

            <!-- Mini floor map -->
            <div class="card" style="padding:14px;flex:1;min-height:0;display:flex;flex-direction:column">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <div class="h-section" style="font-size:12px">Plano del sitio</div>
                <span style="margin-left:auto;font-size:9.5px;color:var(--fg-3)" class="mono">EDIFICIO B · P1</span>
              </div>
              <div style="position:relative;flex:1;background:oklch(0.13 0.010 245);border:1px solid var(--line-0);border-radius:8px;overflow:hidden;min-height:130px">
                <div class="grid-bg-fine" style="position:absolute;inset:0;opacity:0.6"></div>
                <svg viewBox="0 0 240 160" style="position:absolute;inset:0;width:100%;height:100%">
                  <g fill="none" stroke="oklch(0.40 0.04 240/0.6)" stroke-width="1.2">
                    <rect x="20" y="20" width="200" height="120"/>
                    <line x1="120" y1="20" x2="120" y2="80"/>
                    <line x1="60" y1="80" x2="220" y2="80"/>
                    <line x1="60" y1="80" x2="60" y2="140"/>
                  </g>
                  @for (pin of mapPins; track $index) {
                    <g>
                      @if (pin.live) { <circle [attr.cx]="pin.x" [attr.cy]="pin.y" r="7" fill="oklch(0.70 0.21 250)" opacity="0.18"/> }
                      <circle [attr.cx]="pin.x" [attr.cy]="pin.y" r="3.2" [attr.fill]="pin.live ? 'oklch(0.85 0.14 205)' : 'oklch(0.45 0.05 25)'"/>
                      @if (pin.alert) { <circle [attr.cx]="pin.x + 2.5" [attr.cy]="pin.y - 2.5" r="1.5" fill="oklch(0.65 0.25 25)"/> }
                    </g>
                  }
                </svg>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:9.5px;color:var(--fg-3)" class="mono">
                <span>{{ cameras().length }} CÁMARAS · {{ onlineCams() }} ACTIVAS</span>
                <a routerLink="/map" style="color:var(--accent-2);text-decoration:none">ABRIR PLANO →</a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }

    .topbar-custom {
      height:60px;flex-shrink:0;
      display:flex;align-items:center;gap:16px;padding:0 24px;
      border-bottom:1px solid var(--line-0);
      background:oklch(0.15 0.011 245/0.6);
      backdrop-filter:blur(20px);
    }

    .notif-dot {
      position:absolute;top:6px;right:6px;
      width:7px;height:7px;border-radius:50%;
      background:var(--live);border:1.5px solid var(--bg-1);
    }

    .dash-body {
      flex:1;padding:20px 24px 24px;
      display:flex;flex-direction:column;gap:16px;
      min-height:0;overflow:hidden;
    }

    .metrics-section {
      display:grid;grid-template-columns:340px 1fr;gap:16px;
    }

    .metric-strip {
      display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:10px;
    }

    .live-section {
      flex:1;display:grid;grid-template-columns:1fr 320px;gap:16px;min-height:0;
    }

    .cam-grid-wrap {
      display:flex;flex-direction:column;gap:12px;min-height:0;
    }

    .cam-grid {
      flex:1;display:grid;gap:10px;min-height:0;
    }

    .right-rail {
      display:flex;flex-direction:column;gap:12px;min-height:0;overflow:hidden;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private cameraService = inject(CameraService);
  private eventsService = inject(EventsService);
  private socketService = inject(SocketService);
  private destroy$ = new Subject<void>();

  cameras = signal<Camera[]>([]);
  recentAlerts = signal<CameraEvent[]>([]);
  todayEvents = signal(0);
  unreviewedCount = signal(0);
  gridMode = signal<'2x2' | '3x3' | '4x4'>('3x3');

  readonly gridOptions = [
    { key: '2x2' as const, label: '2×2' },
    { key: '3x3' as const, label: '3×3' },
    { key: '4x4' as const, label: '4×4' },
  ];

  get topCams(): [string, string, number, number][] {
    return this.cameras().slice(0, 4).map(c => [
      c.id.substring(0, 6).toUpperCase(),
      c.name,
      c.status === 'online' ? 1 : 0,
      c.status === 'online' ? 100 : 0,
    ]);
  }

  get mapPins() {
    const xs = [30, 110, 180, 210, 50, 150, 30, 200];
    const ys = [30, 30, 40, 80, 90, 90, 130, 130];
    return this.cameras().slice(0, 8).map((c, i) => ({
      x: xs[i] ?? 60 + i * 30,
      y: ys[i] ?? 60,
      live: c.status === 'online',
      alert: false,
    }));
  }

  readonly sparkValues = [4,6,3,8,12,7,9,11,15,8,12,16];
  readonly netValues   = [80,90,100,130,150,140,170,160,200,184,176,184];

  get sparkPoints(): string { return this.buildSparkPoints(this.sparkValues, 120, 28); }
  get netPoints(): string   { return this.buildSparkPoints(this.netValues, 120, 28); }

  get todayLabel(): string {
    return new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).toUpperCase();
  }

  onlineCams() { return this.cameras().filter(c => c.status === 'online').length; }
  camSlots()   { return Array.from({ length: this.cameras().length || 1 }); }

  gridCols() {
    return this.gridMode() === '4x4' ? 4 : this.gridMode() === '2x2' ? 2 : 3;
  }

  visibleCams(): Camera[] {
    const n = this.gridCols() ** 2;
    const cams = this.cameras();
    if (cams.length === 0) return [];
    // Pad if needed
    const result = [...cams];
    while (result.length < n && result.length > 0) result.push(...cams);
    return result.slice(0, n);
  }

  setGrid(g: '2x2' | '3x3' | '4x4') { this.gridMode.set(g); }

  getScene(cameraId: string): string { return SCENE_MAP[cameraId] || 'parking'; }

  getRelativeTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h`;
  }

  private buildSparkPoints(values: number[], w: number, h: number): string {
    const max = Math.max(...values), min = Math.min(...values);
    const dx = w / (values.length - 1);
    return values.map((v, i) => `${i * dx},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  }

  ngOnInit(): void {
    this.loadData();

    // Listen to real-time camera status updates
    this.socketService.cameraStatus$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      this.cameras.update(cams => cams.map(c =>
        c.id === msg.cameraId ? { ...c, status: msg.status as 'online' | 'offline' } : c
      ));
    });

    this.socketService.newEvent$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      this.recentAlerts.update(alerts => [ev as CameraEvent, ...alerts].slice(0, 4));
      this.unreviewedCount.update(n => n + 1);
      this.todayEvents.update(n => n + 1);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.cameraService.getAll().subscribe(cams => this.cameras.set(cams));
    this.eventsService.getEvents({ reviewed: false, limit: 4 })
      .subscribe(events => this.recentAlerts.set(events));
    this.eventsService.getStats().subscribe(stats => {
      this.todayEvents.set(stats.today);
      this.unreviewedCount.set(stats.unreviewed);
    });
  }
}

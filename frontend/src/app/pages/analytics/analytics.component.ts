import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SocketService } from '../../core/services/socket.service';

type Period = '24h' | '7d' | '30d';

interface KPICard { label: string; value: string | number; sub: string; color: string; icon: string; }

@Component({
  selector: 'wc-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-wrap">
      <header class="topbar-custom">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--fg-0);font-weight:600">Analytics IA</span>
          <span class="chip acc mono" style="font-size:9px">REALTIME</span>
        </div>
        <div style="display:flex;gap:6px;margin-left:auto">
          @for (p of periods; track p.value) {
            <button class="btn" [class.primary]="period() === p.value"
                    [class.ghost]="period() !== p.value"
                    (click)="setPeriod(p.value)" style="padding:4px 12px;font-size:11px">
              {{ p.label }}
            </button>
          }
        </div>
      </header>

      <!-- KPI Row -->
      <div class="kpi-row">
        @for (k of kpis(); track k.label) {
          <div class="glass kpi-card">
            <div class="kpi-icon" [style.color]="k.color" [innerHTML]="k.icon"></div>
            <div>
              <div class="kpi-value mono" [style.color]="k.color">{{ k.value }}</div>
              <div class="kpi-label">{{ k.label }}</div>
              <div class="kpi-sub mono">{{ k.sub }}</div>
            </div>
          </div>
        }
      </div>

      <div class="analytics-grid">
        <!-- Timeseries Chart -->
        <div class="glass panel analytics-panel span-2">
          <div class="panel-header">
            <span class="mono" style="font-size:11px;color:var(--fg-2)">EVENTOS POR TIEMPO</span>
          </div>
          <div class="chart-area" style="padding:12px 0">
            @if (timeseries().length > 0) {
              <div class="bar-chart">
                @for (pt of timeseries(); track pt.period) {
                  <div class="bar-col" [title]="pt.period + ': ' + pt.count">
                    <div class="bar-fill"
                         [style.height.%]="maxTimeseries() > 0 ? (pt.count / maxTimeseries() * 100) : 0"
                         [style.background]="'var(--accent)'"></div>
                    <div class="bar-label mono">{{ pt.count }}</div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart mono">Sin datos para el período seleccionado</div>
            }
          </div>
        </div>

        <!-- AI Accuracy -->
        <div class="glass panel analytics-panel">
          <div class="panel-header">
            <span class="mono" style="font-size:11px;color:var(--fg-2)">PRECISIÓN IA</span>
          </div>
          @if (aiStats()) {
            <div class="ai-metrics">
              @for (m of aiStats()?.stats ?? []; track m.event_type) {
                <div class="metric-row">
                  <span class="mono" style="font-size:10px;color:var(--fg-3)">{{ m.event_type | uppercase }}</span>
                  <div class="metric-bar-wrap">
                    <div class="metric-bar"
                         [style.width.%]="m.avg_confidence * 100"
                         [style.background]="m.avg_confidence > 0.7 ? 'var(--ok)' : m.avg_confidence > 0.5 ? 'var(--warn)' : 'var(--danger)'">
                    </div>
                  </div>
                  <span class="mono" style="font-size:10px;color:var(--fg-2)">{{ (m.avg_confidence * 100).toFixed(0) }}%</span>
                </div>
              }
              @if (!aiStats()?.stats?.length) {
                <div class="empty-chart mono">IA desactivada o sin detecciones</div>
              }
            </div>
          }
        </div>

        <!-- Camera Performance -->
        <div class="glass panel analytics-panel">
          <div class="panel-header">
            <span class="mono" style="font-size:11px;color:var(--fg-2)">TOP CÁMARAS (DETECCIONES)</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            @for (cam of topCameras().slice(0, 8); track cam.camera_id) {
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>
                <span style="flex:1;font-size:11px;color:var(--fg-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ cam.name }}</span>
                <span class="mono" style="font-size:10px;color:var(--accent)">{{ cam.detections }}</span>
              </div>
            }
            @if (!topCameras().length) {
              <div class="empty-chart mono">Sin detecciones en el período</div>
            }
          </div>
        </div>

        <!-- Storage breakdown -->
        <div class="glass panel analytics-panel">
          <div class="panel-header">
            <span class="mono" style="font-size:11px;color:var(--fg-2)">ALMACENAMIENTO</span>
          </div>
          @if (storage()) {
            <div style="display:flex;flex-direction:column;gap:8px">
              <div class="stat-row">
                <span style="color:var(--fg-3);font-size:11px">Total local</span>
                <span class="mono" style="font-size:12px;color:var(--fg-1)">{{ formatBytes(localTotal()) }}</span>
              </div>
              @for (cl of storage()?.cloud ?? []; track cl.status) {
                <div class="stat-row">
                  <span style="color:var(--fg-3);font-size:11px">Nube ({{ cl.status }})</span>
                  <span class="mono" style="font-size:12px"
                        [style.color]="cl.status === 'done' ? 'var(--ok)' : cl.status === 'failed' ? 'var(--danger)' : 'var(--warn)'">
                    {{ cl.count }} archivos
                  </span>
                </div>
              }
              <div class="stat-row">
                <span style="color:var(--fg-3);font-size:11px">Pendiente subir</span>
                <span class="mono" style="font-size:12px;color:var(--warn)">{{ storage()?.pending_upload_count ?? 0 }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Camera uptime table -->
        <div class="glass panel analytics-panel span-2">
          <div class="panel-header">
            <span class="mono" style="font-size:11px;color:var(--fg-2)">ESTADO DE CÁMARAS (ÚLTIMOS 7 DÍAS)</span>
          </div>
          <div style="overflow-x:auto">
            <table class="evt" style="width:100%">
              <thead>
                <tr>
                  <th>Cámara</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th class="mono">Grabaciones</th>
                  <th class="mono">Tiempo grabado</th>
                  <th class="mono">Eventos</th>
                </tr>
              </thead>
              <tbody>
                @for (cam of cameraUptime(); track cam.id) {
                  <tr>
                    <td style="font-weight:500;color:var(--fg-0)">{{ cam.name }}</td>
                    <td style="color:var(--fg-3);font-size:11px">{{ cam.location }}</td>
                    <td>
                      <span class="chip" [class.ok]="cam.status === 'online' || cam.status === 'recording'"
                            [class.live]="cam.status === 'recording'"
                            style="font-size:9px">
                        {{ cam.status | uppercase }}
                      </span>
                    </td>
                    <td class="mono" style="text-align:right">{{ cam.recording_count }}</td>
                    <td class="mono" style="text-align:right">{{ formatDuration(cam.recorded_seconds) }}</td>
                    <td class="mono" style="text-align:right;color:var(--accent)">{{ cam.event_count }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .topbar-custom {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      border-bottom: 1px solid var(--line-0);
      background: var(--bg-1);
      gap: 12px;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      padding: 16px 24px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
    }

    .kpi-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
    }

    .kpi-label {
      font-size: 11px;
      color: var(--fg-2);
      margin: 3px 0 1px;
    }

    .kpi-sub {
      font-size: 9px;
      color: var(--fg-4);
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 0 24px 24px;
    }

    .analytics-panel {
      border-radius: 12px;
      padding: 16px;
      min-height: 200px;
    }

    .analytics-panel.span-2 {
      grid-column: span 2;
    }

    .panel-header {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--line-0);
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      padding: 0 8px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      height: 100%;
      justify-content: flex-end;
    }

    .bar-fill {
      width: 100%;
      min-height: 2px;
      border-radius: 3px 3px 0 0;
      opacity: 0.85;
      transition: height 0.3s ease;
    }

    .bar-label {
      font-size: 8px;
      color: var(--fg-4);
    }

    .empty-chart {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100px;
      color: var(--fg-3);
      font-size: 11px;
    }

    .ai-metrics {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .metric-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-bar-wrap {
      flex: 1;
      height: 6px;
      background: var(--bg-3);
      border-radius: 999px;
      overflow: hidden;
    }

    .metric-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid var(--line-0);
    }

    .stat-row:last-child { border-bottom: none; }

    @media (max-width: 768px) {
      .analytics-grid { grid-template-columns: 1fr; }
      .analytics-panel.span-2 { grid-column: span 1; }
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private socket = inject(SocketService);
  private destroy$ = new Subject<void>();

  period = signal<Period>('7d');
  periods = [
    { value: '24h' as Period, label: '24H' },
    { value: '7d' as Period, label: '7D' },
    { value: '30d' as Period, label: '30D' },
  ];

  overview = signal<any>(null);
  timeseries = signal<any[]>([]);
  aiStats = signal<any>(null);
  cameraUptime = signal<any[]>([]);
  storage = signal<any>(null);

  kpis = computed<KPICard[]>(() => {
    const o = this.overview();
    if (!o) return [];
    return [
      { label: 'Cámaras online', value: `${o.cameras?.online ?? 0}/${o.cameras?.total ?? 0}`, sub: 'ACTIVAS', color: 'var(--ok)', icon: '📹' },
      { label: 'Eventos hoy', value: o.events?.total ?? 0, sub: this.period().toUpperCase(), color: 'var(--accent)', icon: '⚡' },
      { label: 'Personas det.', value: o.events?.persons ?? 0, sub: 'IA YOLOv8', color: 'var(--live)', icon: '🧍' },
      { label: 'Grabaciones', value: o.recordings?.total ?? 0, sub: `${o.recordings?.active ?? 0} activas`, color: 'var(--accent-2)', icon: '🎬' },
    ];
  });

  maxTimeseries = computed(() => {
    const data = this.timeseries();
    return data.length ? Math.max(...data.map(d => d.count), 1) : 1;
  });

  topCameras = computed(() => this.aiStats()?.perCamera ?? []);

  localTotal = computed(() => {
    const s = this.storage();
    if (!s?.local) return 0;
    return s.local.reduce((sum: number, c: any) => sum + (c.bytes || 0), 0);
  });

  ngOnInit() {
    this.loadAll();
    // Refresh overview every 30s via socket stats
    this.socket.systemStats$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.analytics.getOverview(this.period()).subscribe(d => this.overview.set(d));
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setPeriod(p: Period) {
    this.period.set(p);
    this.loadAll();
  }

  private loadAll() {
    const p = this.period();
    forkJoin({
      overview: this.analytics.getOverview(p),
      timeseries: this.analytics.getTimeseries(p),
      aiStats: this.analytics.getAIStats(p),
      cameraUptime: this.analytics.getCameraUptime(),
      storage: this.analytics.getStorageStats(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ overview, timeseries, aiStats, cameraUptime, storage }) => {
        this.overview.set(overview);
        this.timeseries.set(timeseries);
        this.aiStats.set(aiStats);
        this.cameraUptime.set(cameraUptime);
        this.storage.set(storage);
      },
      error: (e) => console.error('[Analytics] Load error:', e),
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = bytes;
    let i = 0;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(1)} ${units[i]}`;
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

@Component({
  selector: 'wc-heatmap',
  standalone: true,
  imports: [CommonModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Mapa de Calor de Actividad" subtitle="ANÁLISIS · ÚLTIMA SEMANA · TODAS LAS CÁMARAS">
        <div style="display:flex;gap:2px;padding:3px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:8px">
          @for (m of periods; track m; let i = $index) {
            <button class="mono" (click)="activePeriod = m"
                    [style.background]="activePeriod === m ? 'var(--accent-soft)' : 'transparent'"
                    [style.color]="activePeriod === m ? 'var(--accent-2)' : 'var(--fg-2)'"
                    style="padding:6px 10px;font-size:10px;letter-spacing:0.1em;border:none;cursor:pointer;border-radius:5px">{{ m }}</button>
          }
        </div>
        <button class="btn ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Reporte
        </button>
      </wc-topbar>

      <div style="flex:1;padding:24px;display:grid;grid-template-columns:1fr 320px;gap:18px;min-height:0;overflow:auto">
        <!-- Main heatmap -->
        <div class="panel" style="padding:20px;display:flex;flex-direction:column;min-height:0">
          <div style="display:flex;align-items:center;margin-bottom:16px">
            <div>
              <div style="font-size:14px;font-weight:600">Detecciones por hora</div>
              <div style="font-size:11px;color:var(--fg-3);margin-top:2px">Persona + Vehículo · Suma de las 9 cámaras activas</div>
            </div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:10px;font-size:10px;color:var(--fg-3)" class="mono">
              <span>BAJO</span>
              <div style="display:flex">
                @for (v of legendValues; track v) {
                  <div style="width:18px;height:10px" [style.background]="heatColor(v)"></div>
                }
              </div>
              <span>ALTO</span>
            </div>
          </div>

          <!-- Hour labels -->
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center;margin-bottom:4px">
            <div></div>
            <div style="display:grid;grid-template-columns:repeat(24,1fr);gap:3px;font-size:9px;color:var(--fg-3)" class="mono">
              @for (h of hours; track h; let hi = $index) {
                <div style="text-align:center" [style.visibility]="hi % 3 === 0 ? 'visible' : 'hidden'">{{ padHour(hi) }}</div>
              }
            </div>
          </div>

          <!-- Heat grid -->
          <div style="display:flex;flex-direction:column;gap:3px">
            @for (row of heat; track row; let di = $index) {
              <div style="display:grid;grid-template-columns:40px 1fr;gap:8px;align-items:center">
                <div class="mono" style="font-size:10px;color:var(--fg-3);letter-spacing:0.1em">{{ days[di] }}</div>
                <div style="display:grid;grid-template-columns:repeat(24,1fr);gap:3px">
                  @for (v of row; track v; let hi = $index) {
                    <div style="aspect-ratio:1;border-radius:3px"
                         [style.background]="heatColor(v)"
                         [style.box-shadow]="v > 0.9 ? '0 0 8px oklch(0.72 0.22 30 / 0.6)' : 'none'"
                         [style.border]="di === 1 && hi === 14 ? '1.5px solid var(--fg-0)' : 'none'"></div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Analysis row -->
          <div style="margin-top:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding-top:20px;border-top:1px solid var(--line-1)">
            @for (stat of analysisStats; track stat[0]; let i = $index) {
              <div>
                <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em">{{ stat[0] }}</div>
                <div style="font-size:18px;font-weight:500;margin-top:4px;letter-spacing:-0.01em"
                     [style.color]="i === 3 ? 'var(--ok)' : 'var(--fg-0)'">{{ stat[1] }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Right side -->
        <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
          <!-- Zone heatmap on single camera -->
          <div class="panel" style="padding:14px">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:10px">MAPA DE CALOR · CAM-02</div>
            <div style="position:relative">
              <wc-camera-feed scene="entrance" name="" status="live" quality="" tc=""
                [feedStyle]="{'width':'100%','aspect-ratio':'16/9','border-radius':'6px'}"></wc-camera-feed>
              <!-- Heatmap overlay blobs -->
              <div style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen">
                <div style="position:absolute;top:30%;left:40%;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle, oklch(0.72 0.22 30 / 0.8), oklch(0.60 0.20 215 / 0.4) 50%, transparent 75%)"></div>
                <div style="position:absolute;top:50%;left:15%;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle, oklch(0.72 0.18 60 / 0.7), transparent 70%)"></div>
                <div style="position:absolute;top:40%;left:70%;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle, oklch(0.48 0.14 235 / 0.6), transparent 70%)"></div>
              </div>
            </div>
          </div>

          <!-- Top cameras -->
          <div class="panel" style="padding:14px;flex:1">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:12px">TOP CÁMARAS</div>
            @for (cam of topCameras; track cam[0]) {
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
                  <span>
                    <span class="mono" style="color:var(--accent-2)">{{ cam[0] }}</span>
                    <span style="color:var(--fg-2)"> {{ cam[1] }}</span>
                  </span>
                  <span class="mono" style="color:var(--fg-3)">{{ cam[2] }}</span>
                </div>
                <div style="height:6px;background:var(--bg-3);border-radius:999px;overflow:hidden">
                  <div [style.width]="cam[3] + '%'"
                       style="height:100%;background:linear-gradient(90deg,oklch(0.72 0.20 250),oklch(0.85 0.14 205));border-radius:999px"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class HeatmapComponent {
  activePeriod = '7D';
  readonly periods = ['7D', '30D', '90D'];
  readonly days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  readonly hours = Array.from({ length: 24 });
  readonly legendValues = [0.05, 0.2, 0.4, 0.62, 0.82, 0.95];

  readonly analysisStats = [
    ['Hora pico', '14:00 — 15:00'],
    ['Día más activo', 'Martes'],
    ['Total semana', '2,847 eventos'],
    ['vs. semana anterior', '+12.4%'],
  ];

  readonly topCameras = [
    ['CAM-02', 'Lobby Principal', 842, 100],
    ['CAM-05', 'Calle Frontal', 618, 73],
    ['CAM-01', 'Estac. Norte', 522, 62],
    ['CAM-07', 'Recepción', 411, 49],
    ['CAM-04', 'Almacén A', 248, 29],
  ];

  readonly heat: number[][] = this.days.map((_, di) =>
    Array.from({ length: 24 }, (_, hi) => {
      const weekend = di >= 5;
      if (di === 1 && hi === 14) return 1.0;
      if (hi >= 8 && hi < 12) return weekend ? 0.3 : 0.85 + Math.random() * 0.15;
      if (hi >= 14 && hi < 18) return weekend ? 0.35 : 0.75 + Math.random() * 0.2;
      if (hi >= 18 && hi < 21) return 0.5 + Math.random() * 0.25;
      if (hi >= 6 && hi < 8) return 0.3 + Math.random() * 0.2;
      return 0.05 + Math.random() * 0.15;
    })
  );

  heatColor(v: number): string {
    if (v < 0.1) return 'oklch(0.20 0.018 245)';
    if (v < 0.3) return 'oklch(0.32 0.08 240)';
    if (v < 0.5) return 'oklch(0.48 0.14 235)';
    if (v < 0.75) return 'oklch(0.60 0.20 215)';
    if (v < 0.9) return 'oklch(0.72 0.18 60)';
    return 'oklch(0.72 0.22 30)';
  }

  padHour(h: number): string {
    return String(h).padStart(2, '0');
  }
}

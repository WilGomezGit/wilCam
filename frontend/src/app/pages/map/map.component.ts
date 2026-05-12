import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

interface CameraPin {
  x: number;
  y: number;
  name: string;
  status: 'live' | 'rec' | 'offline';
  alerts: number;
}

@Component({
  selector: 'wc-map',
  standalone: true,
  imports: [CommonModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Mapa de Cámaras" subtitle="DISTRIBUCIÓN GEOGRÁFICA · 3 EDIFICIOS">
        <div style="display:flex;gap:2px;padding:3px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:8px">
          @for (m of mapModes; track m; let i = $index) {
            <button class="mono" (click)="activeMode = m"
                    [style.background]="activeMode === m ? 'var(--accent-soft)' : 'transparent'"
                    [style.color]="activeMode === m ? 'var(--accent-2)' : 'var(--fg-2)'"
                    style="padding:6px 10px;font-size:10px;letter-spacing:0.1em;border:none;cursor:pointer;border-radius:5px">{{ m }}</button>
          }
        </div>
        <button class="btn ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filtrar
        </button>
        <button class="btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
      </wc-topbar>

      <div style="flex:1;position:relative;overflow:hidden;background:oklch(0.13 0.012 245)">
        <!-- Grid bg -->
        <div class="grid-bg" style="position:absolute;inset:0;opacity:0.4"></div>

        <!-- Buildings SVG floor plan -->
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
             style="position:absolute;inset:0;width:100%;height:100%">
          <defs>
            <pattern id="bp" width="2" height="2" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="2" y2="2" stroke="oklch(0.42 0.04 240 / 0.2)" stroke-width="0.2"/>
            </pattern>
          </defs>
          <!-- Building A -->
          <rect x="10" y="15" width="35" height="25" fill="url(#bp)" stroke="oklch(0.45 0.05 240 / 0.7)" stroke-width="0.3"/>
          <text x="11.5" y="20" fill="oklch(0.65 0.04 240)" font-size="2" font-family="JetBrains Mono">EDIFICIO A · OFICINAS</text>
          <!-- Building B -->
          <rect x="48" y="20" width="25" height="22" fill="url(#bp)" stroke="oklch(0.45 0.05 240 / 0.7)" stroke-width="0.3"/>
          <text x="49.5" y="25" fill="oklch(0.65 0.04 240)" font-size="2" font-family="JetBrains Mono">EDIFICIO B · LOBBY</text>
          <!-- Warehouse -->
          <rect x="60" y="50" width="32" height="28" fill="url(#bp)" stroke="oklch(0.45 0.05 240 / 0.7)" stroke-width="0.3"/>
          <text x="61.5" y="55" fill="oklch(0.65 0.04 240)" font-size="2" font-family="JetBrains Mono">ALMACÉN C</text>
          <!-- Parking -->
          <rect x="12" y="60" width="34" height="20" fill="url(#bp)" stroke="oklch(0.45 0.05 240 / 0.7)" stroke-width="0.3"/>
          <text x="13.5" y="65" fill="oklch(0.65 0.04 240)" font-size="2" font-family="JetBrains Mono">ESTACIONAMIENTO</text>
          <!-- Paths -->
          <g stroke="oklch(0.55 0.08 240 / 0.4)" stroke-width="0.4" fill="none" stroke-dasharray="1.2 1">
            <path d="M28 40 L28 60"/>
            <path d="M55 42 L55 60"/>
            <path d="M45 30 L48 30"/>
          </g>
        </svg>

        <!-- FOV cones -->
        @for (pin of pins; track pin.name; let i = $index) {
          @if (pin.status !== 'offline') {
            <div style="position:absolute;pointer-events:none"
                 [style.left]="pin.x + '%'"
                 [style.top]="pin.y + '%'"
                 [style.transform]="'translate(-50%,-50%) rotate(' + (i * 47) + 'deg)'">
              <div style="width:130px;height:130px;background:conic-gradient(from -30deg, transparent 0deg, oklch(0.70 0.21 250 / 0.18) 30deg, transparent 60deg);clip-path:polygon(50% 50%, 100% 0%, 100% 50%);transform:translate(-50%,-50%);margin-left:50%;margin-top:50%"></div>
            </div>
          }
        }

        <!-- Camera pins -->
        @for (pin of pins; track pin.name; let i = $index) {
          <div style="position:absolute;transform:translate(-50%,-50%)"
               [style.left]="pin.x + '%'"
               [style.top]="pin.y + '%'"
               (click)="selectedPin = pin">
            @if (pin.status === 'live') {
              <div style="position:absolute;inset:-8px;border-radius:50%;border:1.5px solid oklch(0.85 0.14 205 / 0.5);animation:livepulse 2s infinite"></div>
            }
            <div style="width:22px;height:22px;border-radius:50%;border:2px solid var(--bg-0);display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;position:relative"
                 [style.background]="pin.status === 'offline' ? 'oklch(0.40 0.05 25)' : 'linear-gradient(180deg, oklch(0.72 0.20 250), oklch(0.55 0.22 252))'"
                 [style.box-shadow]="pin.status !== 'offline' ? '0 0 0 1px oklch(0.85 0.14 205 / 0.6), 0 0 16px var(--accent-glow)' : 'none'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3z"/></svg>
              @if (pin.alerts > 0) {
                <span style="position:absolute;top:-6px;right:-6px;min-width:14px;height:14px;padding:0 4px;border-radius:999px;background:var(--live);color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--bg-0)">{{ pin.alerts }}</span>
              }
            </div>
            <div class="mono" style="position:absolute;top:26px;left:50%;transform:translateX(-50%);font-size:9px;color:var(--fg-1);text-shadow:0 1px 4px oklch(0 0 0 / 0.8);white-space:nowrap;letter-spacing:0.06em">{{ pin.name }}</div>
          </div>
        }

        <!-- Floating card — selected camera -->
        <div class="glass" style="position:absolute;top:30px;right:24px;width:280px;padding:14px">
          <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em;margin-bottom:8px">SELECCIONADA</div>
          <wc-camera-feed [scene]="selectedPin?.status === 'offline' ? 'rooftop' : 'entrance'" name="" status="live" quality="4K" tc="14:32:08"
            [feedStyle]="{'width':'100%','aspect-ratio':'16/9','border-radius':'6px'}"></wc-camera-feed>
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;font-weight:600">{{ selectedPin?.name || 'CAM-02' }}</div>
              <div style="font-size:11px;color:var(--fg-3)">Lobby Principal · Edificio B</div>
            </div>
            <span class="chip live"><span class="live-dot"></span>LIVE</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px">
            <button class="btn primary" style="flex:1;justify-content:center;font-size:11px">Ver en vivo</button>
            <button class="btn" style="flex:1;justify-content:center;font-size:11px">Grabaciones</button>
          </div>
        </div>

        <!-- Legend -->
        <div class="glass" style="position:absolute;bottom:20px;left:20px;padding:12px;display:flex;flex-direction:column;gap:6px;font-size:11px">
          <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em;margin-bottom:4px">LEYENDA</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:12px;height:12px;border-radius:50%;background:linear-gradient(180deg,oklch(0.72 0.20 250),oklch(0.55 0.22 252));box-shadow:0 0 8px var(--accent-glow);display:inline-block"></span>
            En vivo · 7
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:12px;height:12px;border-radius:50%;background:var(--live);display:inline-block"></span>
            Grabando · 1
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:12px;height:12px;border-radius:50%;background:oklch(0.40 0.05 25);display:inline-block"></span>
            Offline · 1
          </div>
        </div>

        <!-- Map controls -->
        <div style="position:absolute;bottom:20px;right:24px;display:flex;flex-direction:column;gap:6px">
          <button class="btn icon" style="width:36px;height:36px;background:oklch(0.18 0.013 245 / 0.85);backdrop-filter:blur(10px)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="btn icon" style="width:36px;height:36px;background:oklch(0.18 0.013 245 / 0.85);backdrop-filter:blur(10px)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="btn icon" style="width:36px;height:36px;background:oklch(0.18 0.013 245 / 0.85);backdrop-filter:blur(10px)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class MapComponent {
  activeMode = 'PLANO';
  selectedPin: CameraPin | null = null;

  readonly mapModes = ['SATÉLITE', 'PLANO', 'CALOR'];

  readonly pins: CameraPin[] = [
    { x: 18, y: 28, name: 'CAM-01', status: 'live', alerts: 2 },
    { x: 32, y: 22, name: 'CAM-02', status: 'live', alerts: 5 },
    { x: 48, y: 30, name: 'CAM-03', status: 'live', alerts: 0 },
    { x: 38, y: 48, name: 'CAM-04', status: 'rec', alerts: 1 },
    { x: 62, y: 42, name: 'CAM-05', status: 'live', alerts: 3 },
    { x: 52, y: 60, name: 'CAM-06', status: 'live', alerts: 0 },
    { x: 70, y: 56, name: 'CAM-07', status: 'live', alerts: 0 },
    { x: 80, y: 70, name: 'CAM-08', status: 'live', alerts: 2 },
    { x: 28, y: 70, name: 'CAM-09', status: 'offline', alerts: 0 },
  ];

  constructor() {
    this.selectedPin = this.pins[1];
  }
}

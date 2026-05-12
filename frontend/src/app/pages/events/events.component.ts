import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

interface EventRow {
  time: string;
  cam: string;
  loc: string;
  type: string;
  conf: number;
  scene: string;
  sev: 'live' | 'warn' | 'acc';
}

@Component({
  selector: 'wc-events',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Historial de Eventos" subtitle="REGISTRO · DETECCIONES IA · 30 DÍAS">
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:8px;padding:6px 10px;min-width:220px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Buscar evento, cámara, fecha…"
                 style="background:transparent;border:0;padding:0;flex:1;font-size:12px">
        </div>
        <button class="btn ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filtros
        </button>
        <button class="btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </wc-topbar>

      <!-- Filter bar -->
      <div style="display:flex;gap:10px;padding:14px 24px;border-bottom:1px solid var(--line-1);align-items:center;flex-wrap:wrap">
        @for (btn of dateFilters; track btn.l) {
          <button class="btn" (click)="activeDateFilter = btn.l"
                  [style.background]="activeDateFilter === btn.l ? 'var(--accent-soft)' : 'var(--bg-2)'"
                  [style.color]="activeDateFilter === btn.l ? 'var(--accent-2)' : 'var(--fg-1)'"
                  [style.border-color]="activeDateFilter === btn.l ? 'oklch(0.70 0.21 250 / 0.4)' : 'var(--line-1)'"
                  style="padding:6px 12px;font-size:12px">{{ btn.l }}</button>
        }
        <div style="width:1px;height:22px;background:var(--line-1);margin:0 6px"></div>
        @for (chip of typeChips; track chip.t) {
          <span class="chip" [class]="chip.k">{{ chip.t }} <span style="color:var(--fg-3)">{{ chip.n }}</span></span>
        }
        <div style="margin-left:auto;font-size:11px;color:var(--fg-3)" class="mono">56 EVENTOS · HOY</div>
      </div>

      <div style="flex:1;display:grid;grid-template-columns:1fr 360px;min-height:0">
        <!-- Events list -->
        <div style="overflow:hidden;display:flex;flex-direction:column">
          <div style="overflow:auto;flex:1">
            <table class="evt">
              <thead>
                <tr>
                  <th style="width:90px">Hora</th>
                  <th style="width:80px">Preview</th>
                  <th>Evento</th>
                  <th>Cámara · Ubicación</th>
                  <th style="width:90px">Confianza</th>
                  <th style="width:100px">Severidad</th>
                  <th style="width:60px"></th>
                </tr>
              </thead>
              <tbody>
                @for (e of events; track e.time; let i = $index) {
                  <tr [style.background]="selectedIndex === i ? 'oklch(0.65 0.25 25 / 0.06)' : 'transparent'"
                      (click)="selectedIndex = i" style="cursor:pointer">
                    <td class="mono" style="color:var(--accent-2)">{{ e.time }}</td>
                    <td>
                      <div style="width:64px;height:36px;border-radius:4px;overflow:hidden;border:1px solid var(--line-1)">
                        <wc-camera-feed [scene]="e.scene" name="" tc="" quality="" status="rec"
                          [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span [style.color]="e.sev === 'live' ? 'var(--live)' : e.sev === 'warn' ? 'var(--warn)' : 'var(--accent-2)'">
                          <ng-container [ngSwitch]="getEventIcon(e.type)">
                            <svg *ngSwitchCase="'walk'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="4" r="2"/><path d="M5 10l2-3h7.5l2 3"/><path d="M10 10l-1 6h6l-1-6"/></svg>
                            <svg *ngSwitchCase="'car'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="11" width="22" height="8" rx="2"/><path d="M5 11V7l2-4h10l2 4v4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>
                            <svg *ngSwitchCase="'pkg'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            <svg *ngSwitchDefault width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                          </ng-container>
                        </span>
                        <span style="font-weight:500">{{ e.type }}</span>
                      </div>
                    </td>
                    <td style="color:var(--fg-2)">
                      <span class="mono" style="color:var(--fg-1)">{{ e.cam }}</span>
                      <span style="color:var(--fg-3)"> · {{ e.loc }}</span>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:50px;height:4px;background:var(--bg-3);border-radius:999px;overflow:hidden">
                          <div [style.width]="e.conf + '%'" [style.background]="e.conf > 90 ? 'var(--ok)' : 'var(--accent-2)'"
                               style="height:100%;border-radius:999px"></div>
                        </div>
                        <span class="mono" style="font-size:11px">{{ e.conf }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="chip" [class]="e.sev" style="padding:2px 8px;font-size:10px">
                        {{ e.sev === 'live' ? 'CRÍTICO' : e.sev === 'warn' ? 'MEDIO' : 'INFO' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn ghost" style="padding:4px 8px;font-size:11px">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Clip
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line-1)">
            <div style="font-size:11px;color:var(--fg-3)">Mostrando 1–8 de 56 eventos</div>
            <div style="display:flex;gap:4px">
              <button class="btn icon ghost" style="width:28px;height:28px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              @for (p of pages; track p; let pi = $index) {
                <button class="btn mono"
                        [style.background]="pi === 0 ? 'var(--accent-soft)' : 'var(--bg-2)'"
                        [style.color]="pi === 0 ? 'var(--accent-2)' : 'var(--fg-2)'"
                        style="padding:6px 10px;font-size:11px;min-width:28px;justify-content:center">{{ p }}</button>
              }
              <button class="btn icon ghost" style="width:28px;height:28px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT — event detail -->
        <div style="border-left:1px solid var(--line-1);background:oklch(0.14 0.012 245 / 0.5);display:flex;flex-direction:column;overflow:auto">
          <div style="padding:14px 20px;border-bottom:1px solid var(--line-1)">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:4px">EVENTO SELECCIONADO</div>
            <div style="font-size:14px;font-weight:600">{{ selectedEvent.type }}</div>
            <div class="mono" style="font-size:11px;color:var(--accent-2);margin-top:4px">2026-05-12 · {{ selectedEvent.time }} · {{ selectedEvent.cam }}</div>
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
            <wc-camera-feed [scene]="selectedEvent.scene" name="" status="rec" quality="4K" tc="14:32:08.421"
              [feedStyle]="{'width':'100%','aspect-ratio':'16/9','border-radius':'8px'}"
              [aiBoxes]="[{x:38,y:38,w:14,h:44,label:'Persona · 98%'}]"></wc-camera-feed>

            <!-- Mini sequence -->
            <div>
              <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em;margin-bottom:6px">SECUENCIA · 12 SEG</div>
              <div style="display:flex;gap:4px">
                @for (frame of [0,1,2,3,4,5]; track frame) {
                  <div style="flex:1;height:38px;border-radius:3px;overflow:hidden"
                       [style.border]="frame === 2 ? '1.5px solid var(--accent)' : '1px solid var(--line-1)'"
                       [style.box-shadow]="frame === 2 ? '0 0 8px var(--accent-glow)' : 'none'">
                    <wc-camera-feed [scene]="selectedEvent.scene" name="" tc="" quality="" status="rec"
                      [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                  </div>
                }
              </div>
            </div>

            <!-- AI detection panel -->
            <div class="panel" style="padding:12px">
              <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em;margin-bottom:8px">DETECCIÓN IA</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:11px">
                @for (row of aiDetails; track row[0]) {
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--fg-3)">{{ row[0] }}</span>
                    <span class="mono">{{ row[1] }}</span>
                  </div>
                }
              </div>
            </div>

            <div style="display:flex;gap:8px">
              <button class="btn primary" style="flex:1;justify-content:center;font-size:12px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Reproducir
              </button>
              <button class="btn icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="btn icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--fg-2)">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer" (click)="reviewed = !reviewed">
                <span class="switch" [class.on]="reviewed"></span>
                Marcar como revisado
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer" (click)="falsePositive = !falsePositive">
                <span class="switch" [class.on]="falsePositive"></span>
                Falso positivo
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class EventsComponent {
  searchQuery = '';
  activeDateFilter = 'Hoy';
  selectedIndex = 0;
  reviewed = false;
  falsePositive = false;

  readonly dateFilters = [
    { l: 'Hoy' }, { l: 'Últimos 7d' }, { l: '30d' }, { l: 'Personalizado' },
  ];

  readonly typeChips = [
    { t: 'Persona', n: 24, k: 'live' },
    { t: 'Vehículo', n: 14, k: 'acc' },
    { t: 'Paquete', n: 5, k: 'warn' },
    { t: 'Animal', n: 1, k: 'warn' },
    { t: 'Movimiento', n: 12, k: '' },
  ];

  readonly events: EventRow[] = [
    { time: '14:32:08', cam: 'CAM-02', loc: 'Lobby Principal', type: 'Persona', conf: 98, scene: 'entrance', sev: 'live' },
    { time: '14:28:51', cam: 'CAM-05', loc: 'Calle Frontal', type: 'Vehículo', conf: 94, scene: 'street', sev: 'warn' },
    { time: '14:19:33', cam: 'CAM-07', loc: 'Recepción', type: 'Paquete dejado', conf: 87, scene: 'reception', sev: 'acc' },
    { time: '14:08:12', cam: 'CAM-04', loc: 'Almacén A', type: 'Movimiento nocturno', conf: 91, scene: 'warehouse', sev: 'warn' },
    { time: '13:51:44', cam: 'CAM-08', loc: 'Carga y Descarga', type: 'Persona', conf: 96, scene: 'loading', sev: 'live' },
    { time: '13:42:19', cam: 'CAM-01', loc: 'Estacionamiento N.', type: 'Vehículo', conf: 99, scene: 'parking', sev: 'acc' },
    { time: '13:30:02', cam: 'CAM-02', loc: 'Lobby Principal', type: 'Persona × 3', conf: 92, scene: 'entrance', sev: 'warn' },
    { time: '13:18:55', cam: 'CAM-06', loc: 'Pasillo Sur', type: 'Movimiento', conf: 84, scene: 'hallway', sev: 'acc' },
  ];

  readonly pages = ['1', '2', '3', '…', '7'];

  readonly aiDetails = [
    ['Clasificación', 'Persona'],
    ['Confianza', '98.4%'],
    ['Velocidad', '1.2 m/s'],
    ['Dirección', '→ Norte'],
    ['Tiempo en escena', '7.2s'],
  ];

  get selectedEvent(): EventRow {
    return this.events[this.selectedIndex];
  }

  getEventIcon(type: string): string {
    if (type.includes('Persona')) return 'walk';
    if (type.includes('Vehícu')) return 'car';
    if (type.includes('Paquete')) return 'pkg';
    return 'zap';
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

type CameraScene = 'parking' | 'entrance' | 'office' | 'warehouse' | 'rooftop' | 'hallway' | 'street' | 'reception' | 'loading';

interface CameraRow {
  id: string;
  name: string;
  ip: string;
  resolution: string;
  recording: boolean;
  ai: boolean;
  scene: CameraScene;
  online: boolean;
}

@Component({
  selector: 'wc-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Configuración" subtitle="GESTIÓN DEL SISTEMA">
        <button class="btn ghost">Restablecer</button>
        <button class="btn primary">Guardar cambios</button>
      </wc-topbar>

      <div style="flex:1;display:grid;grid-template-columns:220px 1fr;min-height:0">
        <!-- Settings nav -->
        <nav style="padding:16px 12px;border-right:1px solid var(--line-1);display:flex;flex-direction:column;gap:2px">
          @for (item of navItems; track item.l) {
            <div class="sb-item" [class.active]="activeSection === item.l" (click)="activeSection = item.l">
              <span [style.color]="activeSection === item.l ? 'var(--accent-2)' : 'var(--fg-2)'">
                <ng-container [ngSwitch]="item.icon">
                  <svg *ngSwitchCase="'cam'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3z"/></svg>
                  <svg *ngSwitchCase="'rec'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                  <svg *ngSwitchCase="'zap'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <svg *ngSwitchCase="'bell'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <svg *ngSwitchCase="'user'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <svg *ngSwitchCase="'hd'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10v4"/><path d="M18 10v4"/><path d="M14 12h4"/></svg>
                  <svg *ngSwitchCase="'wifi'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  <svg *ngSwitchDefault width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </ng-container>
              </span>
              <span>{{ item.l }}</span>
            </div>
          }
        </nav>

        <!-- Main settings content -->
        <div style="padding:24px;overflow:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
            <div>
              <div style="font-size:16px;font-weight:600">Gestión de cámaras</div>
              <div style="font-size:12px;color:var(--fg-3);margin-top:2px">Añade, edita o elimina cámaras IP conectadas al NVR</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Escanear red
              </button>
              <button class="btn primary" (click)="showAddForm = !showAddForm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Añadir RTSP
              </button>
            </div>
          </div>

          <!-- Add RTSP form -->
          @if (showAddForm) {
            <div class="glass" style="padding:18px;margin-bottom:18px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <div style="font-size:13px;font-weight:600">Nueva cámara</div>
                <span class="chip acc" style="margin-left:auto">BORRADOR</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">NOMBRE</span>
                  <input type="text" [(ngModel)]="newCam.name" placeholder="CAM-10 · Patio Trasero">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">UBICACIÓN</span>
                  <input type="text" [(ngModel)]="newCam.location" placeholder="Edificio A · Planta 1">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">GRUPO</span>
                  <select [(ngModel)]="newCam.group">
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                  </select>
                </label>
                <label style="grid-column:span 3;display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">URL RTSP</span>
                  <input type="text" [(ngModel)]="newCam.rtsp" placeholder="rtsp://admin:password@192.168.1.50:554/stream">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">USUARIO</span>
                  <input type="text" [(ngModel)]="newCam.user" placeholder="admin">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CONTRASEÑA</span>
                  <input type="password" [(ngModel)]="newCam.password">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">RESOLUCIÓN</span>
                  <select [(ngModel)]="newCam.resolution">
                    <option value="4k">3840 × 2160 (4K)</option>
                    <option value="hd">1920 × 1080</option>
                  </select>
                </label>
              </div>
              <div style="margin-top:14px;display:flex;align-items:center;gap:14px">
                <button class="btn ghost" (click)="testConnection()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Probar conexión
                </button>
                @if (connectionTested) {
                  <span class="chip ok">Conexión exitosa · 142ms</span>
                }
                <div style="margin-left:auto;display:flex;gap:8px">
                  <button class="btn ghost" (click)="showAddForm = false">Cancelar</button>
                  <button class="btn primary" (click)="addCamera()">Añadir cámara</button>
                </div>
              </div>
            </div>
          }

          <!-- Camera list -->
          <div class="panel" style="overflow:hidden">
            <table class="evt">
              <thead>
                <tr>
                  <th>Cámara</th>
                  <th>Estado</th>
                  <th>IP</th>
                  <th>Resolución</th>
                  <th>Grabación</th>
                  <th>IA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (cam of cameras; track cam.id) {
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:42px;height:26px;border-radius:3px;overflow:hidden;border:1px solid var(--line-1)">
                          <wc-camera-feed [scene]="cam.scene" name="" [status]="cam.online ? 'live' : 'offline'" quality="" tc=""
                            [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                        </div>
                        <div>
                          <div class="mono" style="font-size:11px;color:var(--accent-2)">{{ cam.id }}</div>
                          <div style="font-size:12px;color:var(--fg-1)">{{ cam.name }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (cam.online) {
                        <span class="chip ok">
                          <span style="width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor"></span>
                          Online
                        </span>
                      } @else {
                        <span class="chip warn">
                          <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>
                          Offline
                        </span>
                      }
                    </td>
                    <td class="mono" style="color:var(--fg-2)">{{ cam.ip }}</td>
                    <td class="mono">{{ cam.resolution }}</td>
                    <td>
                      <span class="switch" [class.on]="cam.recording" (click)="cam.recording = !cam.recording"></span>
                    </td>
                    <td>
                      <span class="switch" [class.on]="cam.ai" (click)="cam.ai = !cam.ai"></span>
                    </td>
                    <td style="text-align:right">
                      <button class="btn icon ghost" style="width:28px;height:28px">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn icon ghost" style="width:28px;height:28px;color:var(--danger)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent {
  activeSection = 'Cámaras';
  showAddForm = false;
  connectionTested = false;

  readonly navItems = [
    { l: 'Cámaras', icon: 'cam' },
    { l: 'Grabación', icon: 'rec' },
    { l: 'Detección IA', icon: 'zap' },
    { l: 'Notificaciones', icon: 'bell' },
    { l: 'Usuarios', icon: 'user' },
    { l: 'Almacenamiento', icon: 'hd' },
    { l: 'Red', icon: 'wifi' },
    { l: 'Sistema', icon: 'cog' },
  ];

  cameras: CameraRow[] = [
    { id: 'CAM-01', name: 'Estacionamiento N.', ip: '192.168.1.41', resolution: '4K', recording: true, ai: true, scene: 'parking', online: true },
    { id: 'CAM-02', name: 'Lobby Principal', ip: '192.168.1.42', resolution: '4K', recording: true, ai: true, scene: 'entrance', online: true },
    { id: 'CAM-03', name: 'Oficinas P2', ip: '192.168.1.43', resolution: 'HD', recording: true, ai: false, scene: 'office', online: true },
    { id: 'CAM-04', name: 'Almacén A', ip: '192.168.1.44', resolution: '4K', recording: true, ai: true, scene: 'warehouse', online: true },
    { id: 'CAM-09', name: 'Azotea', ip: '192.168.1.49', resolution: 'HD', recording: false, ai: false, scene: 'rooftop', online: false },
  ];

  newCam = {
    name: 'CAM-10 · Patio Trasero',
    location: 'Edificio A · Planta 1',
    group: 'exterior',
    rtsp: 'rtsp://admin:••••••@192.168.1.50:554/Streaming/Channels/101',
    user: 'admin',
    password: '',
    resolution: '4k',
  };

  testConnection(): void {
    this.connectionTested = true;
  }

  addCamera(): void {
    this.showAddForm = false;
    this.connectionTested = false;
  }
}

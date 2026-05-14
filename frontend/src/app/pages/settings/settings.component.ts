import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraService } from '../../core/services/camera.service';
import { Camera } from '../../core/models/camera.model';

const SCENE_LIST = ['parking','entrance','office','warehouse','rooftop','hallway','street','reception','loading'] as const;

function sceneFor(cam: Camera): string {
  const id = (cam.id || '').toLowerCase();
  const map: Record<string, string> = {
    'cam-01':'parking','cam-02':'entrance','cam-03':'office','cam-04':'warehouse',
    'cam-05':'street','cam-06':'hallway','cam-07':'reception','cam-08':'loading','cam-09':'rooftop',
  };
  if (map[id]) return map[id];
  const code = cam.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return SCENE_LIST[code % SCENE_LIST.length];
}

function extractIp(rtspUrl: string): string {
  try {
    const match = rtspUrl.match(/@([^:/]+)/);
    return match ? match[1] : rtspUrl.replace(/^rtsp:\/\/[^@]*@?/, '').split(':')[0];
  } catch { return '—'; }
}

@Component({
  selector: 'wc-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Configuración" subtitle="GESTIÓN DEL SISTEMA">
        <button class="btn ghost" (click)="loadCameras()">Actualizar</button>
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
                  <svg *ngSwitchCase="'hd'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M14 10v4M18 10v4M14 12h4"/></svg>
                  <svg *ngSwitchCase="'wifi'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  <svg *ngSwitchDefault width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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
                <span class="chip acc" style="margin-left:auto">NUEVA</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">NOMBRE *</span>
                  <input type="text" [(ngModel)]="newCam.name" placeholder="Cámara Entrada">
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
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">URL RTSP *</span>
                  <input type="text" [(ngModel)]="newCam.rtsp" placeholder="rtsp://admin:password@192.168.1.50:554/stream">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">USUARIO</span>
                  <input type="text" [(ngModel)]="newCam.username" placeholder="admin">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CONTRASEÑA</span>
                  <input type="password" [(ngModel)]="newCam.password">
                </label>
                <label style="display:flex;flex-direction:column;gap:5px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">RESOLUCIÓN</span>
                  <select [(ngModel)]="newCam.resolution">
                    <option value="4K">3840 × 2160 (4K)</option>
                    <option value="HD">1920 × 1080 (HD)</option>
                    <option value="720p">1280 × 720</option>
                  </select>
                </label>
              </div>
              <div style="margin-top:14px;display:flex;align-items:center;gap:14px">
                <button class="btn ghost" (click)="testConnection()" [disabled]="testingConnection || !newCam.rtsp">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {{ testingConnection ? 'Probando…' : 'Probar conexión' }}
                </button>
                @if (connectionTested) {
                  <span class="chip ok">Conexión exitosa · {{ connectionLatency }}ms</span>
                }
                @if (connectionError) {
                  <span class="chip warn">Sin conexión</span>
                }
                <div style="margin-left:auto;display:flex;gap:8px">
                  <button class="btn ghost" (click)="cancelAdd()">Cancelar</button>
                  <button class="btn primary" (click)="addCamera()"
                          [disabled]="savingCamera || !newCam.name || !newCam.rtsp">
                    {{ savingCamera ? 'Guardando…' : 'Añadir cámara' }}
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Camera list -->
          <div class="panel" style="overflow:hidden">
            @if (loading()) {
              <div style="padding:32px;text-align:center;color:var(--fg-3);font-size:12px">Cargando cámaras…</div>
            } @else if (cameras().length === 0) {
              <div style="padding:32px;text-align:center;color:var(--fg-3);font-size:12px">
                No hay cámaras configuradas. Haz clic en "Añadir RTSP" para agregar una.
              </div>
            } @else {
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
                  @for (cam of cameras(); track cam.id) {
                    @if (editingId() === cam.id) {
                      <!-- Inline edit row -->
                      <tr style="background:oklch(0.65 0.25 250/0.05)">
                        <td colspan="7" style="padding:14px">
                          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
                            <label style="display:flex;flex-direction:column;gap:4px">
                              <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.12em">NOMBRE</span>
                              <input type="text" [(ngModel)]="editCam.name" style="padding:6px 8px;font-size:12px">
                            </label>
                            <label style="display:flex;flex-direction:column;gap:4px">
                              <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.12em">UBICACIÓN</span>
                              <input type="text" [(ngModel)]="editCam.location" style="padding:6px 8px;font-size:12px">
                            </label>
                            <label style="display:flex;flex-direction:column;gap:4px">
                              <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.12em">RESOLUCIÓN</span>
                              <select [(ngModel)]="editCam.resolution" style="padding:6px 8px;font-size:12px">
                                <option value="4K">4K</option>
                                <option value="HD">HD</option>
                                <option value="SD">SD</option>
                              </select>
                            </label>
                            <label style="grid-column:span 2;display:flex;flex-direction:column;gap:4px">
                              <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.12em">URL RTSP</span>
                              <input type="text" [(ngModel)]="editCam.rtsp" style="padding:6px 8px;font-size:12px">
                            </label>
                            <label style="display:flex;flex-direction:column;gap:4px">
                              <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.12em">NUEVA CONTRASEÑA</span>
                              <input type="password" [(ngModel)]="editCam.password" placeholder="(sin cambios)" style="padding:6px 8px;font-size:12px">
                            </label>
                          </div>
                          <div style="display:flex;gap:8px;justify-content:flex-end">
                            <button class="btn ghost" (click)="cancelEdit()">Cancelar</button>
                            <button class="btn primary" (click)="saveEdit(cam)">Guardar</button>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      <tr>
                        <td>
                          <div style="display:flex;align-items:center;gap:10px">
                            <div style="width:42px;height:26px;border-radius:3px;overflow:hidden;border:1px solid var(--line-1)">
                              <wc-camera-feed [scene]="getScene(cam)" name="" [status]="cam.status === 'online' ? 'live' : 'offline'" quality="" tc=""
                                [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                            </div>
                            <div>
                              <div class="mono" style="font-size:11px;color:var(--accent-2)">{{ cam.id.substring(0,8).toUpperCase() }}</div>
                              <div style="font-size:12px;color:var(--fg-1)">{{ cam.name }}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          @if (cam.status === 'online') {
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
                        <td class="mono" style="color:var(--fg-2);font-size:11px">{{ extractIp(cam.rtsp_url) }}</td>
                        <td class="mono">{{ cam.resolution }}</td>
                        <td>
                          <span class="switch" [class.on]="cam.recording_enabled === 1"
                                (click)="toggleRecording(cam)"></span>
                        </td>
                        <td>
                          <span class="switch" [class.on]="cam.ai_enabled === 1"
                                (click)="toggleAI(cam)"></span>
                        </td>
                        <td style="text-align:right">
                          <button class="btn icon ghost" style="width:28px;height:28px" (click)="startEdit(cam)" title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="btn icon ghost" style="width:28px;height:28px;color:var(--danger)" (click)="deleteCamera(cam)" title="Eliminar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit {
  private cameraService = inject(CameraService);

  activeSection = 'Cámaras';
  showAddForm = false;
  connectionTested = false;
  connectionError = false;
  connectionLatency = 0;
  testingConnection = false;
  savingCamera = false;

  loading = signal(false);
  cameras = signal<Camera[]>([]);
  editingId = signal<string | null>(null);

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

  newCam = { name: '', location: '', group: 'exterior', rtsp: '', username: '', password: '', resolution: 'HD' };
  editCam = { name: '', location: '', rtsp: '', username: '', password: '', resolution: '' };

  ngOnInit(): void {
    this.loadCameras();
  }

  loadCameras(): void {
    this.loading.set(true);
    this.cameraService.getAll().subscribe({
      next: cams => { this.cameras.set(cams); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getScene(cam: Camera): string { return sceneFor(cam); }
  extractIp(rtspUrl: string): string { return extractIp(rtspUrl); }

  testConnection(): void {
    if (!this.newCam.rtsp) return;
    this.testingConnection = true;
    this.connectionTested = false;
    this.connectionError = false;
    this.cameraService.testConnection(this.newCam.rtsp).subscribe({
      next: res => {
        this.connectionTested = !!res.success;
        this.connectionError = !res.success;
        this.connectionLatency = res.latencyMs || 0;
        this.testingConnection = false;
      },
      error: () => {
        this.connectionError = true;
        this.testingConnection = false;
      },
    });
  }

  addCamera(): void {
    if (!this.newCam.name || !this.newCam.rtsp) return;
    this.savingCamera = true;
    this.cameraService.create({
      name: this.newCam.name,
      location: this.newCam.location,
      group_name: this.newCam.group,
      rtsp_url: this.newCam.rtsp,
      username: this.newCam.username || undefined,
      password: this.newCam.password || undefined,
      resolution: this.newCam.resolution,
      recording_enabled: 1,
      ai_enabled: 0,
      ptz_enabled: 0,
    }).subscribe({
      next: () => {
        this.cancelAdd();
        this.loadCameras();
      },
      error: () => { this.savingCamera = false; },
    });
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.connectionTested = false;
    this.connectionError = false;
    this.savingCamera = false;
    this.newCam = { name: '', location: '', group: 'exterior', rtsp: '', username: '', password: '', resolution: 'HD' };
  }

  startEdit(cam: Camera): void {
    this.editingId.set(cam.id);
    this.editCam = {
      name: cam.name,
      location: cam.location || '',
      rtsp: cam.rtsp_url,
      username: cam.username || '',
      password: '',
      resolution: cam.resolution,
    };
  }

  saveEdit(cam: Camera): void {
    const payload: Partial<Camera> = {
      name: this.editCam.name,
      location: this.editCam.location,
      rtsp_url: this.editCam.rtsp,
      username: this.editCam.username || undefined,
      resolution: this.editCam.resolution,
    };
    if (this.editCam.password) payload.password = this.editCam.password;
    this.cameraService.update(cam.id, payload).subscribe({
      next: () => { this.editingId.set(null); this.loadCameras(); },
    });
  }

  cancelEdit(): void { this.editingId.set(null); }

  deleteCamera(cam: Camera): void {
    if (!confirm(`¿Eliminar la cámara "${cam.name}"? Esta acción no se puede deshacer.`)) return;
    this.cameraService.delete(cam.id).subscribe({
      next: () => this.loadCameras(),
    });
  }

  toggleRecording(cam: Camera): void {
    this.cameraService.update(cam.id, { recording_enabled: cam.recording_enabled ? 0 : 1 }).subscribe({
      next: updated => {
        this.cameras.update(list => list.map(c => c.id === cam.id ? { ...c, recording_enabled: updated.recording_enabled } : c));
      },
    });
  }

  toggleAI(cam: Camera): void {
    this.cameraService.update(cam.id, { ai_enabled: cam.ai_enabled ? 0 : 1 }).subscribe({
      next: updated => {
        this.cameras.update(list => list.map(c => c.id === cam.id ? { ...c, ai_enabled: updated.ai_enabled } : c));
      },
    });
  }
}

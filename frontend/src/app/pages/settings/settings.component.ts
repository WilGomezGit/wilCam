import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraService } from '../../core/services/camera.service';
import { Camera } from '../../core/models/camera.model';

function extractIp(rtspUrl: string): string {
  try {
    const match = rtspUrl.match(/@([^:/]+)/);
    return match ? match[1] : rtspUrl.replace(/^rtsp:\/\/[^@]*@?/, '').split(':')[0];
  } catch { return '—'; }
}

@Component({
  selector: 'wc-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Configuración" subtitle="GESTIÓN DE CÁMARAS">
        <button class="btn ghost" (click)="loadCameras()">Actualizar</button>
      </wc-topbar>

      <div style="flex:1;padding:20px 24px;overflow:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div>
            <div style="font-size:15px;font-weight:600">Cámaras IP</div>
            <div style="font-size:12px;color:var(--fg-3);margin-top:2px">
              {{ cameras().length }} cámara{{ cameras().length !== 1 ? 's' : '' }} registrada{{ cameras().length !== 1 ? 's' : '' }}
            </div>
          </div>
          <button class="btn primary" (click)="showAddForm = !showAddForm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Añadir cámara
          </button>
        </div>

        <!-- Add form -->
        @if (showAddForm) {
          <div class="glass" style="padding:18px;margin-bottom:20px;border-radius:12px">
            <div style="font-size:13px;font-weight:600;margin-bottom:14px">Nueva cámara</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
              <label class="field">
                <span>NOMBRE *</span>
                <input type="text" [(ngModel)]="newCam.name" placeholder="Cámara Entrada">
              </label>
              <label class="field">
                <span>UBICACIÓN</span>
                <input type="text" [(ngModel)]="newCam.location" placeholder="Edificio A · Planta 1">
              </label>
              <label class="field">
                <span>RESOLUCIÓN</span>
                <select [(ngModel)]="newCam.resolution">
                  <option value="4K">4K</option>
                  <option value="HD">HD</option>
                  <option value="720p">720p</option>
                </select>
              </label>
              <label class="field" style="grid-column:span 3">
                <span>URL RTSP *</span>
                <input type="text" [(ngModel)]="newCam.rtsp"
                       placeholder="rtsp://admin:password@192.168.1.50:554/stream">
              </label>
              <label class="field">
                <span>USUARIO</span>
                <input type="text" [(ngModel)]="newCam.username" placeholder="admin">
              </label>
              <label class="field">
                <span>CONTRASEÑA</span>
                <input type="password" [(ngModel)]="newCam.password">
              </label>
              <label class="field">
                <span>HOST ONVIF</span>
                <input type="text" [(ngModel)]="newCam.onvif_host" placeholder="(auto desde URL RTSP)">
              </label>
              <label class="field">
                <span>PUERTO PTZ/ONVIF</span>
                <input type="number" [(ngModel)]="newCam.onvif_port" placeholder="80">
              </label>
              <div style="display:flex;flex-direction:column;gap:6px">
                <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em">PTZ</span>
                <div style="display:flex;align-items:center;gap:10px;height:36px">
                  <span class="switch" [class.on]="newCam.ptz_enabled" (click)="newCam.ptz_enabled = !newCam.ptz_enabled"></span>
                  <span style="font-size:12px;color:var(--fg-2)">{{ newCam.ptz_enabled ? 'Habilitado' : 'Deshabilitado' }}</span>
                </div>
              </div>
              @if (newCam.ptz_enabled) {
                <label class="field">
                  <span>PROTOCOLO PTZ</span>
                  <select [(ngModel)]="newCam.ptz_protocol">
                    <option value="auto">Auto (detectar automáticamente)</option>
                    <option value="cgi">CGI Hi3510 clásico</option>
                    <option value="cgi_param">CGI param.cgi (INSTAR / Cam720)</option>
                    <option value="onvif">ONVIF SOAP</option>
                  </select>
                </label>
              }
            </div>

            <div style="margin-top:14px;display:flex;align-items:center;gap:10px">
              <button class="btn ghost" (click)="testConnection()" [disabled]="testingConnection || !newCam.rtsp">
                {{ testingConnection ? 'Probando…' : 'Probar RTSP' }}
              </button>
              @if (connectionTested) {
                <span class="chip ok">OK · {{ connectionLatency }}ms</span>
              }
              @if (connectionError) {
                <span class="chip warn">Sin conexión</span>
              }
              <div style="margin-left:auto;display:flex;gap:8px">
                <button class="btn ghost" (click)="cancelAdd()">Cancelar</button>
                <button class="btn primary" (click)="addCamera()"
                        [disabled]="savingCamera || !newCam.name || !newCam.rtsp">
                  {{ savingCamera ? 'Guardando…' : 'Añadir' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Camera table -->
        <div class="panel" style="overflow:hidden">
          @if (loading()) {
            <div style="padding:32px;text-align:center;color:var(--fg-3);font-size:12px">Cargando…</div>
          } @else if (cameras().length === 0) {
            <div style="padding:32px;text-align:center;color:var(--fg-3);font-size:12px">
              No hay cámaras. Haz clic en "Añadir cámara" para empezar.
            </div>
          } @else {
            <table class="evt">
              <thead>
                <tr>
                  <th>Cámara</th>
                  <th>Estado</th>
                  <th>IP</th>
                  <th>Res.</th>
                  <th>Grab.</th>
                  <th>PTZ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (cam of cameras(); track cam.id) {
                  @if (editingId() === cam.id) {
                    <tr style="background:oklch(0.65 0.25 250/0.05)">
                      <td colspan="7" style="padding:14px">
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
                          <label class="field">
                            <span>NOMBRE</span>
                            <input type="text" [(ngModel)]="editCam.name" style="padding:6px 8px;font-size:12px">
                          </label>
                          <label class="field">
                            <span>UBICACIÓN</span>
                            <input type="text" [(ngModel)]="editCam.location" style="padding:6px 8px;font-size:12px">
                          </label>
                          <label class="field">
                            <span>RESOLUCIÓN</span>
                            <select [(ngModel)]="editCam.resolution" style="padding:6px 8px;font-size:12px">
                              <option value="4K">4K</option>
                              <option value="HD">HD</option>
                              <option value="720p">720p</option>
                            </select>
                          </label>
                          <label class="field" style="grid-column:span 2">
                            <span>URL RTSP</span>
                            <input type="text" [(ngModel)]="editCam.rtsp" style="padding:6px 8px;font-size:12px">
                          </label>
                          <label class="field">
                            <span>NUEVA CONTRASEÑA</span>
                            <input type="password" [(ngModel)]="editCam.password"
                                   placeholder="(sin cambios)" style="padding:6px 8px;font-size:12px">
                          </label>
                          <label class="field">
                            <span>HOST ONVIF</span>
                            <input type="text" [(ngModel)]="editCam.onvif_host" style="padding:6px 8px;font-size:12px">
                          </label>
                          <label class="field">
                            <span>PUERTO PTZ</span>
                            <input type="number" [(ngModel)]="editCam.onvif_port" style="padding:6px 8px;font-size:12px">
                          </label>
                          <div style="display:flex;flex-direction:column;gap:6px">
                            <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em">PTZ</span>
                            <div style="display:flex;align-items:center;gap:10px;height:36px">
                              <span class="switch" [class.on]="editCam.ptz_enabled" (click)="editCam.ptz_enabled = !editCam.ptz_enabled"></span>
                            </div>
                          </div>
                          @if (editCam.ptz_enabled) {
                            <label class="field">
                              <span>PROTOCOLO PTZ</span>
                              <select [(ngModel)]="editCam.ptz_protocol" style="padding:6px 8px;font-size:12px">
                                <option value="auto">Auto (CGI → ONVIF)</option>
                                <option value="cgi">HTTP CGI (Cam720)</option>
                                <option value="onvif">ONVIF SOAP</option>
                              </select>
                            </label>
                          }
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
                        <div>
                          <div class="mono" style="font-size:10px;color:var(--accent-2)">{{ cam.id.substring(0,8).toUpperCase() }}</div>
                          <div style="font-size:12px;color:var(--fg-1)">{{ cam.name }}</div>
                          @if (cam.location) {
                            <div style="font-size:11px;color:var(--fg-3)">{{ cam.location }}</div>
                          }
                        </div>
                      </td>
                      <td>
                        @if (cam.status === 'online') {
                          <span class="chip ok">
                            <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>Online
                          </span>
                        } @else {
                          <span class="chip warn">
                            <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>Offline
                          </span>
                        }
                      </td>
                      <td class="mono" style="color:var(--fg-2);font-size:11px">{{ extractIp(cam.rtsp_url) }}</td>
                      <td class="mono">{{ cam.resolution }}</td>
                      <td>
                        <span class="switch" [class.on]="cam.recording_enabled === 1"
                              (click)="toggleField(cam, 'recording_enabled')"></span>
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:6px">
                          <span class="switch" [class.on]="cam.ptz_enabled === 1"
                                (click)="toggleField(cam, 'ptz_enabled')"></span>
                          @if (cam.ptz_enabled === 1) {
                            <span class="mono" style="font-size:9px;color:var(--fg-3)">
                              {{ (cam.ptz_protocol || 'auto').toUpperCase() }}
                            </span>
                          }
                        </div>
                      </td>
                      <td style="text-align:right">
                        <button class="btn icon ghost" style="width:28px;height:28px" (click)="startEdit(cam)" title="Editar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="btn icon ghost" style="width:28px;height:28px;color:var(--danger)"
                                (click)="deleteCamera(cam)" title="Eliminar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
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
  `,
  styles: [`
    .field { display:flex;flex-direction:column;gap:4px; }
    .field span { font-size:9px;color:var(--fg-3);letter-spacing:0.14em;font-family:monospace; }
  `]
})
export class SettingsComponent implements OnInit {
  private cameraService = inject(CameraService);

  showAddForm = false;
  connectionTested = false;
  connectionError = false;
  connectionLatency = 0;
  testingConnection = false;
  savingCamera = false;

  loading = signal(false);
  cameras = signal<Camera[]>([]);
  editingId = signal<string | null>(null);

  newCam = {
    name: '', location: '', rtsp: '', username: '', password: '',
    onvif_host: '', onvif_port: 80, resolution: 'HD',
    ptz_enabled: false, ptz_protocol: 'auto',
  };
  editCam = {
    name: '', location: '', rtsp: '', username: '', password: '', resolution: '',
    onvif_host: '', onvif_port: 80, ptz_enabled: false, ptz_protocol: 'auto',
  };

  ngOnInit(): void { this.loadCameras(); }

  loadCameras(): void {
    this.loading.set(true);
    this.cameraService.getAll().subscribe({
      next: cams => { this.cameras.set(cams); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

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
      error: () => { this.connectionError = true; this.testingConnection = false; },
    });
  }

  addCamera(): void {
    if (!this.newCam.name || !this.newCam.rtsp) return;
    this.savingCamera = true;
    this.cameraService.create({
      name: this.newCam.name,
      location: this.newCam.location,
      rtsp_url: this.newCam.rtsp,
      username: this.newCam.username || undefined,
      password: this.newCam.password || undefined,
      onvif_host: this.newCam.onvif_host || undefined,
      onvif_port: this.newCam.onvif_port || 80,
      resolution: this.newCam.resolution,
      recording_enabled: 1,
      ai_enabled: 0,
      ptz_enabled: this.newCam.ptz_enabled ? 1 : 0,
      ptz_protocol: this.newCam.ptz_protocol as 'auto' | 'cgi' | 'onvif',
    }).subscribe({
      next: () => { this.cancelAdd(); this.loadCameras(); },
      error: () => { this.savingCamera = false; },
    });
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.connectionTested = false;
    this.connectionError = false;
    this.savingCamera = false;
    this.newCam = {
      name: '', location: '', rtsp: '', username: '', password: '',
      onvif_host: '', onvif_port: 80, resolution: 'HD',
      ptz_enabled: false, ptz_protocol: 'auto',
    };
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
      onvif_host: cam.onvif_host || '',
      onvif_port: cam.onvif_port || 80,
      ptz_enabled: cam.ptz_enabled === 1,
      ptz_protocol: cam.ptz_protocol || 'auto',
    };
  }

  saveEdit(cam: Camera): void {
    const payload: Partial<Camera> = {
      name: this.editCam.name,
      location: this.editCam.location,
      rtsp_url: this.editCam.rtsp,
      username: this.editCam.username || undefined,
      resolution: this.editCam.resolution,
      onvif_host: this.editCam.onvif_host || undefined,
      onvif_port: this.editCam.onvif_port || 80,
      ptz_enabled: this.editCam.ptz_enabled ? 1 : 0,
      ptz_protocol: this.editCam.ptz_protocol as 'auto' | 'cgi' | 'onvif',
    };
    if (this.editCam.password) (payload as any).password = this.editCam.password;
    this.cameraService.update(cam.id, payload).subscribe({
      next: () => { this.editingId.set(null); this.loadCameras(); },
    });
  }

  cancelEdit(): void { this.editingId.set(null); }

  deleteCamera(cam: Camera): void {
    if (!confirm(`¿Eliminar "${cam.name}"? Esta acción no se puede deshacer.`)) return;
    this.cameraService.delete(cam.id).subscribe({ next: () => this.loadCameras() });
  }

  toggleField(cam: Camera, field: 'recording_enabled' | 'ptz_enabled'): void {
    const val = cam[field] ? 0 : 1;
    this.cameraService.update(cam.id, { [field]: val }).subscribe({
      next: updated => {
        this.cameras.update(list => list.map(c => c.id === cam.id ? { ...c, [field]: updated[field] } : c));
      },
    });
  }
}

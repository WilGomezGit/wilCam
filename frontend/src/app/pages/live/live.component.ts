import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { PtzControlComponent } from '../../shared/components/ptz-control/ptz-control.component';
import { CameraService } from '../../core/services/camera.service';
import { StreamService } from '../../core/services/stream.service';
import { SocketService } from '../../core/services/socket.service';
import { PtzService } from '../../core/services/ptz.service';
import { Camera } from '../../core/models/camera.model';

const SCENE_MAP: Record<string, string> = {
  'cam-01': 'parking',  'cam-02': 'entrance', 'cam-03': 'office',
  'cam-04': 'warehouse','cam-05': 'street',   'cam-06': 'hallway',
  'cam-07': 'reception','cam-08': 'loading',  'cam-09': 'rooftop',
};

@Component({
  selector: 'wc-live',
  standalone: true,
  imports: [CommonModule, TopbarComponent, CameraFeedComponent, PtzControlComponent],
  template: `
    <div class="page-wrap">
      <wc-topbar
        [title]="selectedCam() ? selectedCam()!.name : 'Cámaras en vivo'"
        [subtitle]="selectedCam() ? (selectedCam()!.location || 'VISTA EN VIVO') : 'VISTA EN VIVO'">
        @if (selectedCam()?.status === 'online') {
          <span class="chip live"><span class="live-dot"></span> EN VIVO</span>
        } @else if (selectedCam()?.status === 'offline') {
          <span class="chip warn">OFFLINE</span>
        }
        <button class="btn ghost" (click)="takeSnapshot()" [disabled]="!selectedCam() || selectedCam()?.status !== 'online'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/></svg>
          Snapshot
        </button>
      </wc-topbar>

      <div class="live-body">
        <!-- MAIN PLAYER -->
        <div class="player-wrap">
          <div style="flex:1;position:relative;min-height:0">
            @if (selectedCam()) {
              <wc-camera-feed
                [scene]="getScene(selectedCam()!.id)"
                [status]="selectedCam()!.status === 'online' ? 'live' : 'offline'"
                [quality]="selectedCam()!.resolution || 'HD'"
                [showName]="false"
                [showTc]="true"
                [hlsUrl]="hlsUrl()"
                [feedStyle]="{'width':'100%','height':'100%'}">

                <!-- Status chips (top left) -->
                <div style="position:absolute;top:16px;left:16px;z-index:7;display:flex;gap:6px;align-items:center">
                  @if (selectedCam()?.status === 'online') {
                    <span class="chip live" style="padding:3px 10px"><span class="live-dot"></span> EN VIVO</span>
                  }
                  <span class="chip mono" style="background:oklch(0 0 0/0.5);border-color:oklch(1 0 0/0.1);font-size:10px">
                    {{ selectedCam()!.resolution || 'HD' }}
                  </span>
                  <span class="chip mono" style="background:oklch(0 0 0/0.5);border-color:oklch(1 0 0/0.1);font-size:10px">
                    {{ selectedCam()!.fps || 15 }} FPS
                  </span>
                </div>

                <!-- PTZ control (top right) — only if PTZ enabled -->
                @if (selectedCam()?.ptz_enabled) {
                  <div style="position:absolute;top:16px;right:16px;z-index:7">
                    <wc-ptz-control [cameraId]="selectedCam()!.id"></wc-ptz-control>
                  </div>
                }

                <!-- Bottom bar: snapshot + fullscreen -->
                <div class="glass" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:7;padding:8px 14px;display:flex;align-items:center;gap:12px;border-radius:12px">
                  <button class="btn icon ghost" style="border:none" title="Snapshot" (click)="takeSnapshot()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/></svg>
                  </button>
                  <button class="btn icon ghost" style="border:none" title="Pantalla completa" (click)="toggleFullscreen()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                  </button>
                </div>
              </wc-camera-feed>
            } @else {
              <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-3);font-size:13px">
                Selecciona una cámara
              </div>
            }
          </div>

          <!-- Camera strip -->
          <div class="cam-strip">
            @for (cam of cameras(); track cam.id) {
              <div (click)="selectCamera(cam)"
                   style="flex:1;position:relative;border-radius:8px;overflow:hidden;cursor:pointer"
                   [style.border]="selectedCam()?.id === cam.id ? '1.5px solid var(--accent)' : '1px solid var(--line-1)'"
                   [style.box-shadow]="selectedCam()?.id === cam.id ? '0 0 0 3px var(--accent-soft),0 0 16px var(--accent-glow)' : 'none'">
                <wc-camera-feed [scene]="getScene(cam.id)" [name]="cam.name"
                                [status]="cam.status === 'online' ? 'live' : 'offline'"
                                quality="" tc="" [showTc]="false" [corners]="false"
                                [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
              </div>
            }
          </div>
        </div>

        <!-- RIGHT PANEL -->
        <div class="right-panel">
          <!-- Camera info -->
          <div class="panel" style="padding:16px">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:12px">INFORMACIÓN</div>
            @if (selectedCam()) {
              <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
                @for (row of getCamInfo(); track row[0]) {
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--fg-3)">{{ row[0] }}</span>
                    <span class="mono" style="color:var(--fg-1)">{{ row[1] }}</span>
                  </div>
                }
              </div>
            } @else {
              <div style="color:var(--fg-3);font-size:12px">Sin cámara seleccionada</div>
            }
          </div>

          <!-- PTZ presets — only when PTZ is enabled -->
          @if (selectedCam()?.ptz_enabled) {
            <div class="panel" style="padding:16px">
              <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:10px">POSICIONES PTZ</div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
                @for (p of [1,2,3,4,5,6]; track p) {
                  <button class="btn" (click)="gotoPreset(p)"
                          style="padding:8px 10px;font-size:11px;justify-content:flex-start"
                          [style.background]="activePreset() === p ? 'var(--accent-soft)' : 'var(--bg-2)'"
                          [style.color]="activePreset() === p ? 'var(--accent-2)' : 'var(--fg-1)'"
                          [style.border-color]="activePreset() === p ? 'oklch(0.70 0.21 250/0.4)' : 'var(--line-1)'">
                    <span class="mono" style="font-size:9px;opacity:0.7">P{{ p }}</span>
                    Preset {{ p }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Snapshot feedback -->
          @if (snapshotMsg()) {
            <div class="panel" style="padding:12px 16px;font-size:12px;color:var(--ok)">
              {{ snapshotMsg() }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
    .live-body { flex:1;display:grid;grid-template-columns:1fr 300px;gap:14px;padding:16px 20px 20px;min-height:0; }
    .player-wrap { display:flex;flex-direction:column;gap:12px;min-height:0; }
    .cam-strip { display:flex;gap:8px;height:86px;flex-shrink:0; }
    .right-panel { display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto; }
  `]
})
export class LiveComponent implements OnInit, OnDestroy {
  private cameraService = inject(CameraService);
  private streamService = inject(StreamService);
  private socketService = inject(SocketService);
  private ptzService = inject(PtzService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  cameras = signal<Camera[]>([]);
  selectedCam = signal<Camera | null>(null);
  hlsUrl = signal<string | null>(null);
  activePreset = signal<number | null>(null);
  snapshotMsg = signal<string | null>(null);

  getScene(cameraId: string): string { return SCENE_MAP[cameraId] || 'parking'; }

  getCamInfo(): [string, string][] {
    const c = this.selectedCam();
    if (!c) return [];
    return [
      ['ID',          c.id.substring(0, 8).toUpperCase()],
      ['IP',          c.onvif_host || this.extractIp(c.rtsp_url)],
      ['Resolución',  c.resolution || 'HD'],
      ['FPS',         String(c.fps || 15)],
      ['PTZ',         c.ptz_enabled ? (c.ptz_protocol || 'auto').toUpperCase() : 'No'],
      ['Estado',      c.status],
    ];
  }

  private extractIp(rtsp: string): string {
    return rtsp?.match(/@([^:/]+)/)?.[1] || rtsp?.match(/rtsp:\/\/([^:/]+)/)?.[1] || '—';
  }

  selectCamera(cam: Camera): void {
    this.selectedCam.set(cam);
    this.activePreset.set(null);
    this.loadStream(cam);
  }

  gotoPreset(n: number): void {
    const cam = this.selectedCam();
    if (!cam) return;
    this.activePreset.set(n);
    this.ptzService.goToPreset(cam.id, String(n)).subscribe();
  }

  takeSnapshot(): void {
    const c = this.selectedCam();
    if (!c) return;
    this.streamService.captureSnapshot(c.id).subscribe({
      next: snap => {
        const a = document.createElement('a');
        a.href = snap.url;
        a.download = snap.filename || `snapshot-${c.id}-${Date.now()}.jpg`;
        a.click();
        this.snapshotMsg.set('Snapshot guardado');
        setTimeout(() => this.snapshotMsg.set(null), 3000);
      },
      error: () => {
        this.snapshotMsg.set('Error al capturar snapshot');
        setTimeout(() => this.snapshotMsg.set(null), 3000);
      },
    });
  }

  toggleFullscreen(): void {
    const el = document.querySelector('wc-camera-feed') as HTMLElement;
    if (el) {
      if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }
  }

  ngOnInit(): void {
    this.cameraService.getAll().subscribe(cams => {
      this.cameras.set(cams);
      const paramId = this.route.snapshot.paramMap.get('id');
      const initial = paramId ? cams.find(c => c.id === paramId) : cams[0];
      if (initial) this.selectCamera(initial);
    });

    this.socketService.cameraStatus$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      const status = msg.status as 'online' | 'offline';
      this.cameras.update(list => list.map(c => c.id === msg.cameraId ? { ...c, status } : c));
      if (this.selectedCam()?.id === msg.cameraId) {
        this.selectedCam.update(c => c ? { ...c, status } : c);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStream(cam: Camera): void {
    this.streamService.startStream(cam.id).subscribe({
      next: res => {
        this.hlsUrl.set(res.hlsUrl);
        this.cameras.update(list => list.map(c =>
          c.id === cam.id ? { ...c, status: 'online' as const } : c
        ));
        this.selectedCam.update(c => c?.id === cam.id ? { ...c, status: 'online' as const } : c);
      },
      error: () => {},
    });
  }
}

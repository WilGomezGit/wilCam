import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { PtzControlComponent } from '../../shared/components/ptz-control/ptz-control.component';
import { CameraService } from '../../core/services/camera.service';
import { StreamService } from '../../core/services/stream.service';
import { Camera } from '../../core/models/camera.model';

const SCENE_MAP: Record<string, string> = {
  'cam-01': 'parking',  'cam-02': 'entrance', 'cam-03': 'office',
  'cam-04': 'warehouse','cam-05': 'street',   'cam-06': 'hallway',
  'cam-07': 'reception','cam-08': 'loading',  'cam-09': 'rooftop',
};

const PRESETS = ['Entrada', 'Mostrador', 'Escalera', 'Ascensor', 'Pasillo A', 'Patio'];

@Component({
  selector: 'wc-live',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, CameraFeedComponent, PtzControlComponent],
  template: `
    <div class="page-wrap">
      <wc-topbar [title]="selectedCam() ? (selectedCam()!.name + ' · ' + selectedCam()!.id.toUpperCase()) : 'Cámaras en vivo'"
                 [subtitle]="'VISTA EN VIVO · ' + (selectedCam()?.resolution || '4K') + ' · 30 FPS'">
        @if (selectedCam()?.status === 'online') {
          <span class="chip live"><span class="live-dot"></span> EN VIVO</span>
        } @else if (selectedCam()?.status === 'offline') {
          <span class="chip warn">OFFLINE</span>
        }
        <span class="chip acc">Señal excelente</span>
        <span class="chip">RTSP · H.265</span>
        <button class="btn ghost" (click)="takeSnapshot()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/></svg>
          Snapshot
        </button>
        <button class="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7"/></svg>
          Ajustes
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
                [quality]="'4K · 3840×2160'"
                [showName]="false"
                [showTc]="true"
                [hlsUrl]="hlsUrl()"
                [aiBoxes]="[{ x: 38, y: 38, w: 14, h: 44, label: 'Persona · 98%' }, { x: 56, y: 44, w: 12, h: 36, label: 'Persona · 91%' }]"
                [feedStyle]="{'width':'100%','height':'100%'}">

                <!-- Top-left HUD chips -->
                <div style="position:absolute;top:16px;left:16px;z-index:7;display:flex;gap:6px;align-items:center">
                  <span class="chip live" style="padding:3px 10px"><span class="live-dot"></span> EN VIVO</span>
                  <span class="chip mono" style="background:oklch(0 0 0/0.5);border-color:oklch(1 0 0/0.1);font-size:10px">3840 × 2160</span>
                  <span class="chip mono" style="background:oklch(0 0 0/0.5);border-color:oklch(1 0 0/0.1);font-size:10px">30 FPS</span>
                  <span class="chip mono" style="background:oklch(0 0 0/0.5);border-color:oklch(1 0 0/0.1);font-size:10px">H.265 · 8 Mbps</span>
                </div>

                <!-- PTZ joystick (top right) -->
                @if (selectedCam()?.ptz_enabled) {
                  <div style="position:absolute;top:16px;right:16px;z-index:7">
                    <wc-ptz-control [cameraId]="selectedCam()!.id"></wc-ptz-control>
                  </div>
                }

                <!-- Bottom transport bar -->
                <div class="glass" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:7;padding:10px 16px;display:flex;align-items:center;gap:14px;border-radius:14px">
                  <button class="btn icon ghost" style="border:none;color:var(--live)">
                    <span style="width:12px;height:12px;border-radius:50%;background:var(--live);box-shadow:0 0 8px var(--live-glow)"></span>
                  </button>
                  <button class="btn icon ghost" style="border:none" [class.active-mic]="micActive()" (click)="toggleMic()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                  </button>
                  <div style="width:1px;height:20px;background:var(--line-1)"></div>
                  <button class="btn icon ghost" style="border:none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4zM15 9a4 4 0 0 1 0 6M18 5a8 8 0 0 1 0 14"/></svg>
                  </button>
                  <div style="width:80px;height:3px;background:var(--bg-3);border-radius:999px;position:relative">
                    <div style="width:70%;height:100%;background:var(--accent-2);border-radius:999px"></div>
                  </div>
                  <div style="width:1px;height:20px;background:var(--line-1)"></div>
                  <button class="btn icon ghost" style="border:none" (click)="takeSnapshot()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  </button>
                  <button class="btn icon ghost" style="border:none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                  </button>
                </div>
              </wc-camera-feed>
            }
          </div>

          <!-- Camera strip -->
          <div class="cam-strip">
            @for (cam of cameras(); track cam.id) {
              <div (click)="selectCamera(cam)"
                   style="flex:1;position:relative;border-radius:8px;overflow:hidden;cursor:pointer"
                   [style.border]="selectedCam()?.id === cam.id ? '1.5px solid var(--accent)' : '1px solid var(--line-1)'"
                   [style.box-shadow]="selectedCam()?.id === cam.id ? '0 0 0 3px var(--accent-soft),0 0 16px var(--accent-glow)' : 'none'">
                <wc-camera-feed [scene]="getScene(cam.id)" [name]="cam.id.toUpperCase()"
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
            }
          </div>

          <!-- Intercom -->
          <div class="panel" style="padding:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg>
              <div class="mono" style="font-size:11px;letter-spacing:0.14em">INTERCOMUNICADOR</div>
            </div>
            <div style="background:oklch(0.13 0.012 245);border:1px solid var(--line-1);border-radius:var(--r-md);padding:14px;position:relative;overflow:hidden">
              <svg viewBox="0 0 200 30" style="width:100%;height:30px;margin-bottom:10px">
                @for (_ of waveformBars; track $index) {
                  <rect [attr.x]="$index * 5" [attr.y]="(30 - waveformBars[$index]) / 2"
                        width="2.5" [attr.height]="waveformBars[$index]"
                        [attr.fill]="$index < 26 ? 'var(--accent-2)' : 'var(--bg-4)'" rx="1"/>
                }
              </svg>
              <div style="display:flex;align-items:center;gap:10px">
                <button class="btn primary" style="flex:1;justify-content:center;padding:10px 14px"
                        (mousedown)="startTalk()" (mouseup)="stopTalk()" (mouseleave)="stopTalk()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg>
                  {{ talking() ? 'Hablando…' : 'Hablar' }}
                </button>
                <button class="btn icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H2v6h4l5 4zM15 9a4 4 0 0 1 0 6M18 5a8 8 0 0 1 0 14"/></svg>
                </button>
              </div>
              <div class="mono" style="font-size:10px;color:var(--fg-3);margin-top:8px;text-align:center;letter-spacing:0.1em">PRESIONA Y MANTÉN · DUPLEX</div>
            </div>
          </div>

          <!-- PTZ presets -->
          @if (selectedCam()?.ptz_enabled) {
            <div class="panel" style="padding:16px;flex:1;min-height:0">
              <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:10px">POSICIONES PTZ</div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
                @for (preset of ptzPresets; track $index) {
                  <button class="btn" (click)="gotoPreset($index)"
                          style="padding:8px 10px;font-size:11px;justify-content:flex-start"
                          [style.background]="activePreset() === $index ? 'var(--accent-soft)' : 'var(--bg-2)'"
                          [style.color]="activePreset() === $index ? 'var(--accent-2)' : 'var(--fg-1)'"
                          [style.border-color]="activePreset() === $index ? 'oklch(0.70 0.21 250/0.4)' : 'var(--line-1)'">
                    <span class="mono" style="font-size:9px;opacity:0.7">P{{ $index + 1 }}</span>
                    {{ preset }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
    .live-body { flex:1;display:grid;grid-template-columns:1fr 320px;gap:14px;padding:16px 20px 20px;min-height:0; }
    .player-wrap { display:flex;flex-direction:column;gap:12px;min-height:0; }
    .cam-strip { display:flex;gap:8px;height:86px;flex-shrink:0; }
    .right-panel { display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto; }
    .active-mic { color:var(--live) !important; }
  `]
})
export class LiveComponent implements OnInit, OnDestroy {
  private cameraService = inject(CameraService);
  private streamService = inject(StreamService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  cameras = signal<Camera[]>([]);
  selectedCam = signal<Camera | null>(null);
  hlsUrl = signal<string | null>(null);
  micActive = signal(false);
  talking = signal(false);
  activePreset = signal<number | null>(null);

  readonly ptzPresets = PRESETS;

  readonly waveformBars: number[] = Array.from({ length: 40 }, (_, i) =>
    4 + Math.abs(Math.sin(i * 0.7)) * 20 + (i % 5) * 2
  );

  getScene(cameraId: string): string { return SCENE_MAP[cameraId] || 'parking'; }

  getCamInfo(): [string, string][] {
    const c = this.selectedCam();
    if (!c) return [];
    return [
      ['Modelo', 'HikDome PTZ-4K'],
      ['IP', c.onvif_host || '192.168.1.42'],
      ['Codec', c.codec || 'H.265 / AAC'],
      ['Resolución', c.resolution || '3840 × 2160'],
      ['FPS / Bitrate', `${c.fps || 30} / 8 Mbps`],
      ['Latencia', '142 ms'],
      ['Uptime', '47 d 22 h'],
    ];
  }

  selectCamera(cam: Camera): void {
    this.selectedCam.set(cam);
    this.loadStream(cam);
  }

  toggleMic(): void { this.micActive.update(v => !v); }
  startTalk(): void { this.talking.set(true); }
  stopTalk(): void  { this.talking.set(false); }

  gotoPreset(idx: number): void {
    const cam = this.selectedCam();
    if (!cam) return;
    this.activePreset.set(idx);
    this.http.post(`/api/ptz/${cam.id}/preset/${idx + 1}`, {}).subscribe();
  }

  takeSnapshot(): void {
    const c = this.selectedCam();
    if (!c) return;
    this.streamService.captureSnapshot(c.id).subscribe(snap => {
      const a = document.createElement('a');
      a.href = snap.url;
      a.download = snap.filename || `snapshot-${c.id}-${Date.now()}.jpg`;
      a.click();
    });
  }

  ngOnInit(): void {
    this.cameraService.getAll().subscribe(cams => {
      this.cameras.set(cams);
      const paramId = this.route.snapshot.paramMap.get('id');
      const initial = paramId ? cams.find(c => c.id === paramId) : cams[0];
      if (initial) this.selectCamera(initial);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStream(cam: Camera): void {
    this.streamService.startStream(cam.id).subscribe(res => {
      this.hlsUrl.set(res.hlsUrl);
    });
  }
}

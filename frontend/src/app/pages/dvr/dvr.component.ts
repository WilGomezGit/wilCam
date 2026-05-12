import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { CameraService } from '../../core/services/camera.service';
import { RecordingsService } from '../../core/services/recordings.service';
import { Camera } from '../../core/models/camera.model';
import { Recording } from '../../core/models/recording.model';

const SCENE_MAP: Record<string, string> = {
  'cam-01':'parking','cam-02':'entrance','cam-03':'office',
  'cam-04':'warehouse','cam-05':'street','cam-06':'hallway',
  'cam-07':'reception','cam-08':'loading','cam-09':'rooftop',
};

@Component({
  selector: 'wc-dvr',
  standalone: true,
  imports: [CommonModule, TopbarComponent, CameraFeedComponent],
  template: `
    <div class="page-wrap">
      <wc-topbar title="Reproducción de Grabaciones" subtitle="DVR/NVR · ARCHIVO HISTÓRICO">
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:8px;padding:6px 10px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span class="mono" style="font-size:12px">{{ selectedDate() }}</span>
        </div>
        <button class="btn ghost">Eventos</button>
        <button class="btn ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Exportar clip
        </button>
        <button class="btn">Compartir</button>
      </wc-topbar>

      <div class="dvr-body">
        <!-- LEFT: calendar + cameras -->
        <div class="dvr-left">
          <!-- Mini calendar -->
          <div class="panel" style="padding:12px">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:10px;padding:0 4px">MAYO 2026</div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:10px">
              @for (d of weekDays; track d) {
                <div style="text-align:center;color:var(--fg-3);padding:4px 0" class="mono">{{ d }}</div>
              }
              @for (day of calDays; track day) {
                <div (click)="selectDay(day)"
                     style="text-align:center;padding:5px 0;border-radius:4px;cursor:pointer;position:relative"
                     [style.background]="day === selectedDay() ? 'var(--accent)' : hasRecording(day) ? 'var(--accent-soft)' : 'transparent'"
                     [style.color]="day === selectedDay() ? 'white' : hasRecording(day) ? 'var(--accent-2)' : 'var(--fg-2)'"
                     [style.font-weight]="day === selectedDay() ? '600' : '400'"
                     class="mono">
                  {{ day }}
                  @if (hasRecording(day) && day !== selectedDay()) {
                    <span style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:3px;height:3px;background:var(--accent-2);border-radius:50%"></span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Camera list -->
          <div class="panel" style="padding:12px;flex:1;min-height:0;display:flex;flex-direction:column">
            <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:10px;padding:0 4px">CÁMARAS</div>
            <div style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px">
              @for (cam of cameras(); track cam.id) {
                <div (click)="selectCamera(cam)"
                     style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.15s"
                     [style.background]="selectedCam()?.id === cam.id ? 'var(--accent-soft)' : 'transparent'"
                     [style.color]="selectedCam()?.id === cam.id ? 'var(--fg-0)' : 'var(--fg-2)'"
                     [style.border]="selectedCam()?.id === cam.id ? '1px solid oklch(0.70 0.21 250/0.3)' : '1px solid transparent'">
                  <span style="width:6px;height:6px;border-radius:50%"
                        [style.background]="selectedCam()?.id === cam.id ? 'var(--accent-2)' : 'var(--fg-3)'"
                        [style.box-shadow]="selectedCam()?.id === cam.id ? '0 0 6px var(--accent-glow)' : 'none'"></span>
                  <span class="mono" style="font-size:10px;color:var(--fg-3)">{{ cam.id.toUpperCase() }}</span>
                  <span>{{ cam.name }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT: player + timeline + events -->
        <div class="dvr-right">
          <!-- Player -->
          <div style="flex:1;min-height:0;position:relative">
            @if (selectedCam()) {
              <wc-camera-feed
                [scene]="getScene(selectedCam()!.id)"
                status="rec"
                quality="REPRODUCCIÓN"
                [showName]="false"
                [showTc]="true"
                [feedStyle]="{'width':'100%','height':'100%'}">

                <div style="position:absolute;top:16px;left:16px;display:flex;gap:8px;z-index:7">
                  <span class="chip" style="background:oklch(0 0 0/0.55);color:oklch(0.92 0.15 25);border-color:oklch(0.65 0.25 25/0.5);padding:3px 10px">
                    <span class="live-dot"></span> REC
                  </span>
                  <span class="chip mono" style="background:oklch(0 0 0/0.55);border-color:oklch(1 0 0/0.1);font-size:10px">
                    {{ selectedCam()!.id.toUpperCase() }} · {{ selectedCam()!.name }}
                  </span>
                </div>
                <div style="position:absolute;top:16px;right:16px;font-size:11px;color:oklch(0.92 0.02 240);text-shadow:0 1px 4px oklch(0 0 0/0.9);z-index:7" class="mono">
                  REPRODUCCIÓN · {{ playbackSpeed() }}×
                </div>
              </wc-camera-feed>
            }
          </div>

          <!-- Transport controls -->
          <div class="panel" style="padding:12px;display:flex;align-items:center;gap:16px;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:4px">
              <button class="btn icon ghost" style="width:32px;height:32px">⏮</button>
              <button class="btn icon ghost" style="width:32px;height:32px">◀</button>
              <button class="btn primary" style="width:44px;height:44px;justify-content:center;padding:0;border-radius:50%"
                      (click)="togglePlay()">
                {{ playing() ? '⏸' : '▶' }}
              </button>
              <button class="btn icon ghost" style="width:32px;height:32px">▶</button>
              <button class="btn icon ghost" style="width:32px;height:32px">⏭</button>
            </div>

            <div style="width:1px;height:28px;background:var(--line-1)"></div>

            <div class="mono" style="font-size:13px;color:var(--fg-0);min-width:130px">
              <span style="color:var(--accent-2)">{{ currentTimeStr() }}</span>
              <span style="color:var(--fg-3)"> / 23:59:59</span>
            </div>

            <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
              <span class="mono" style="font-size:10px;color:var(--fg-3);letter-spacing:0.1em">VEL</span>
              <div style="display:flex;gap:2px;padding:2px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:6px">
                @for (speed of speeds; track speed) {
                  <button class="mono" (click)="setSpeed(speed)"
                          style="padding:4px 8px;font-size:10px;border:none;cursor:pointer;border-radius:4px"
                          [style.background]="playbackSpeed() === speed ? 'var(--accent-soft)' : 'transparent'"
                          [style.color]="playbackSpeed() === speed ? 'var(--accent-2)' : 'var(--fg-2)'">
                    {{ speed }}×
                  </button>
                }
              </div>
              <div style="width:1px;height:20px;background:var(--line-1)"></div>
              <button class="btn ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
              </button>
            </div>
          </div>

          <!-- Timeline -->
          <div class="panel" style="padding:14px;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-2)">LÍNEA DE TIEMPO · 24H</div>
              <div style="display:flex;gap:12px;margin-left:auto;font-size:10px;color:var(--fg-3)">
                <span style="display:flex;align-items:center;gap:6px">
                  <span style="width:10px;height:4px;background:linear-gradient(180deg,oklch(0.45 0.16 245/0.65),oklch(0.35 0.13 245/0.5));border-radius:2px"></span>
                  Grabación continua
                </span>
                <span style="display:flex;align-items:center;gap:6px">
                  <span style="width:10px;height:4px;background:linear-gradient(180deg,oklch(0.65 0.25 25/0.7),oklch(0.55 0.22 25/0.5));border-radius:2px"></span>
                  Movimiento detectado
                </span>
              </div>
            </div>

            <div class="timeline" (click)="scrubTimeline($event)">
              <div class="tl-minor"></div>
              <div class="tl-ticks"></div>

              <!-- Hour labels -->
              <div style="position:absolute;top:4px;left:0;right:0;display:flex;justify-content:space-between;padding:0 4px;font-size:8.5px;color:var(--fg-3)" class="mono">
                @for (h of timelineHours; track h) {
                  <span>{{ h.toString().padStart(2,'0') }}:00</span>
                }
              </div>

              <!-- Recording blocks -->
              @for (rec of recBlocks; track $index) {
                <div class="tl-rec" [style.left.%]="pct(rec[0])" [style.width.%]="pct(rec[1])"></div>
              }

              <!-- Motion events -->
              @for (ev of motionEvents; track $index) {
                <div class="tl-motion" [style.left.%]="pct(ev[0])" [style.width.%]="pct(ev[1])"></div>
              }

              <!-- Playhead -->
              <div class="playhead" [style.left.%]="pct(playhead())">
                <div class="playhead-handle"></div>
                <div class="playhead-label mono">{{ currentTimeStr() }}</div>
              </div>
            </div>

            <!-- Zoom rail -->
            <div style="margin-top:10px;display:flex;align-items:center;gap:12px;color:var(--fg-3);font-size:10px" class="mono">
              <span>ZOOM</span>
              <div style="flex:1;height:2px;background:var(--bg-3);border-radius:999px;position:relative">
                <div style="position:absolute;left:30%;top:-4px;width:10px;height:10px;background:var(--fg-1);border-radius:50%"></div>
                <div style="position:absolute;right:30%;top:-4px;width:10px;height:10px;background:var(--fg-1);border-radius:50%"></div>
                <div style="position:absolute;left:30%;right:30%;top:-1px;height:4px;background:var(--accent-2);border-radius:999px"></div>
              </div>
              <span>09:00 — 18:00</span>
            </div>
          </div>

          <!-- Event clips -->
          <div class="panel" style="padding:12px;height:130px;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
              <div class="mono" style="font-size:10px;letter-spacing:0.14em">EVENTOS · {{ selectedDate() }} ({{ motionEvents.length }})</div>
              <button class="btn ghost" style="margin-left:auto;padding:4px 8px;font-size:11px">Ver todos</button>
            </div>
            <div style="display:flex;gap:8px;overflow-x:auto">
              @for (ev of motionEvents.slice(0, 7); track $index) {
                <div style="width:130px;flex-shrink:0;position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--line-1);cursor:pointer"
                     (click)="jumpToEvent(ev[0])">
                  <wc-camera-feed [scene]="getScene(selectedCam()?.id || 'cam-01')"
                                  name="" status="rec" quality="" tc=""
                                  [showName]="false" [showTc]="false" [corners]="false"
                                  [feedStyle]="{'width':'100%','height':'64px'}"></wc-camera-feed>
                  <div style="padding:5px 8px;background:var(--bg-1);font-size:10px">
                    <div class="mono" style="color:var(--accent-2);font-weight:600">{{ formatEventTime(ev[0]) }}</div>
                    <div style="color:var(--fg-3);font-size:9px">Movimiento</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
    .dvr-body { flex:1;display:grid;grid-template-columns:260px 1fr;gap:14px;padding:16px 20px 0;min-height:0; }
    .dvr-left { display:flex;flex-direction:column;gap:12px;min-height:0; }
    .dvr-right { display:flex;flex-direction:column;gap:12px;min-height:0; }
    .playhead {
      position:absolute;top:0;bottom:0;width:2px;background:var(--accent);
      box-shadow:0 0 12px var(--accent-glow),0 0 32px var(--accent-glow);z-index:5;
    }
    .playhead-handle {
      position:absolute;top:-6px;left:-5px;width:12px;height:12px;
      background:var(--accent);border-radius:50%;box-shadow:0 0 12px var(--accent-glow);
    }
    .playhead-label {
      position:absolute;top:-22px;left:-28px;width:60px;
      padding:2px 6px;background:var(--accent);color:white;font-size:9px;
      border-radius:3px;text-align:center;font-weight:600;
    }
  `]
})
export class DvrComponent implements OnInit {
  private cameraService = inject(CameraService);
  private recService = inject(RecordingsService);

  cameras = signal<Camera[]>([]);
  selectedCam = signal<Camera | null>(null);
  selectedDay = signal(12);
  playing = signal(false);
  playbackSpeed = signal(1);
  playhead = signal(14.53);

  readonly weekDays = ['L','M','M','J','V','S','D'];
  readonly calDays = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly timelineHours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  readonly speeds = [0.25, 0.5, 1, 2, 4, 8];
  readonly recBlocks: [number, number][] = [[0, 6.5], [6.8, 4.5], [11.5, 7.2], [19, 4.8]];
  readonly motionEvents: [number, number][] = [
    [2.1, 0.15], [3.8, 0.3], [7.4, 0.2], [9.1, 0.4],
    [12.2, 0.25], [14.3, 0.35], [16.7, 0.3], [18.2, 0.5],
    [21.1, 0.2], [22.5, 0.4],
  ];

  readonly recordingDays = [2, 5, 7, 8, 9, 10, 11, 12];

  get selectedDate(): () => string {
    return () => `2026-05-${String(this.selectedDay()).padStart(2,'0')}`;
  }

  get currentTimeStr(): () => string {
    return () => {
      const h = Math.floor(this.playhead());
      const m = Math.floor((this.playhead() - h) * 60);
      const s = Math.floor(((this.playhead() - h) * 60 - m) * 60);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
  }

  hasRecording(day: number): boolean { return this.recordingDays.includes(day); }
  selectDay(day: number): void { this.selectedDay.set(day); }
  selectCamera(cam: Camera): void { this.selectedCam.set(cam); }
  setSpeed(s: number): void { this.playbackSpeed.set(s); }
  togglePlay(): void { this.playing.update(v => !v); }
  getScene(id?: string): string { return SCENE_MAP[id || 'cam-01'] || 'entrance'; }
  pct(h: number): number { return (h / 24) * 100; }
  formatEventTime(t: number): string {
    const hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
  jumpToEvent(t: number): void { this.playhead.set(t); }

  scrubTimeline(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    this.playhead.set(pct * 24);
  }

  ngOnInit(): void {
    this.cameraService.getAll().subscribe(cams => {
      this.cameras.set(cams);
      if (cams.length) this.selectedCam.set(cams.find(c => c.id === 'cam-02') || cams[0]);
    });
  }
}

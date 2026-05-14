import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, signal, effect, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { CameraService } from '../../core/services/camera.service';
import { RecordingsService } from '../../core/services/recordings.service';
import { Camera } from '../../core/models/camera.model';
import { RecordingFile } from '../../core/models/recording.model';

function today(): string {
  return new Date().toISOString().substring(0, 10);
}
function fmtSec(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
function fmtSize(b: number): string {
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  return (b / 1e6).toFixed(0) + ' MB';
}

@Component({
  selector: 'wc-dvr',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  template: `
    <div class="page-wrap">
      <wc-topbar title="Grabaciones" subtitle="ARCHIVO · ALMACENAMIENTO NVR">
        <span class="chip mono" style="font-size:10px">
          {{ recordings().length }} segmento{{ recordings().length !== 1 ? 's' : '' }}
          · {{ totalSizeLabel() }}
        </span>
        <button class="btn ghost" (click)="downloadCurrent()" [disabled]="!currentRec()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Descargar clip
        </button>
      </wc-topbar>

      <div class="dvr-body">

        <!-- LEFT: calendar + cameras -->
        <div class="dvr-left">

          <!-- Mini calendar -->
          <div class="panel" style="padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <button class="btn icon ghost" style="width:22px;height:22px;padding:0" (click)="prevMonth()">‹</button>
              <div class="mono" style="font-size:10px;letter-spacing:0.12em;color:var(--fg-2)">
                {{ monthLabel() }}
              </div>
              <button class="btn icon ghost" style="width:22px;height:22px;padding:0" (click)="nextMonth()">›</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:10px">
              @for (d of ['L','M','M','J','V','S','D']; track d + $index) {
                <div style="text-align:center;color:var(--fg-3);padding:3px 0" class="mono">{{ d }}</div>
              }
              @for (_ of calPadding(); track $index) {
                <div></div>
              }
              @for (day of calDays(); track day) {
                <div (click)="selectDay(day)"
                     style="text-align:center;padding:5px 0;border-radius:4px;cursor:pointer;position:relative;transition:all 0.12s"
                     [style.background]="isSelectedDay(day) ? 'var(--accent)' : 'transparent'"
                     [style.color]="isSelectedDay(day) ? 'white' : hasDates().has(calDateStr(day)) ? 'var(--accent-2)' : 'var(--fg-2)'"
                     [style.font-weight]="isSelectedDay(day) ? '600' : '400'"
                     class="mono">
                  {{ day }}
                  @if (hasDates().has(calDateStr(day)) && !isSelectedDay(day)) {
                    <span style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:3px;height:3px;background:var(--accent-2);border-radius:50%"></span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Camera list -->
          <div class="panel" style="padding:10px;flex:1;min-height:0;display:flex;flex-direction:column">
            <div class="mono" style="font-size:9px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:8px;padding:0 4px">CÁMARAS</div>
            <div style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:2px">
              @for (cam of cameras(); track cam.id) {
                <div (click)="selectCamera(cam)"
                     style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:12px"
                     [style.background]="selectedCam()?.id === cam.id ? 'var(--accent-soft)' : 'transparent'"
                     [style.border]="selectedCam()?.id === cam.id ? '1px solid oklch(0.70 0.21 250/0.3)' : '1px solid transparent'">
                  <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0"
                        [style.background]="selectedCam()?.id === cam.id ? 'var(--accent-2)' : 'var(--fg-4)'"></span>
                  <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ cam.name }}</span>
                </div>
              }
              @if (cameras().length === 0) {
                <div style="font-size:11px;color:var(--fg-3);padding:8px;text-align:center">Sin cámaras</div>
              }
            </div>
          </div>

          <!-- Storage info -->
          <div class="panel" style="padding:10px 12px">
            <div class="mono" style="font-size:9px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:8px">ALMACENAMIENTO NVR</div>
            <div style="font-size:11px;color:var(--fg-2);display:flex;flex-direction:column;gap:4px">
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--fg-3)">Segmentos hoy</span>
                <span class="mono">{{ recordings().length }}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--fg-3)">Tamaño total</span>
                <span class="mono">{{ totalSizeLabel() }}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--fg-3)">Acceso</span>
                <span class="mono" style="color:var(--ok)">LOCAL · WEB</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: player + controls + timeline + clips -->
        <div class="dvr-right">

          <!-- VIDEO PLAYER -->
          <div class="player-container">
            @if (currentRec()) {
              <video #videoPlayer
                     [src]="currentRec()!.url"
                     (timeupdate)="onTimeUpdate()"
                     (loadedmetadata)="onMetadata()"
                     (ended)="onEnded()"
                     (play)="playing.set(true)"
                     (pause)="playing.set(false)"
                     (waiting)="buffering.set(true)"
                     (canplay)="buffering.set(false)"
                     preload="auto"
                     style="width:100%;height:100%;object-fit:contain;background:#000;display:block">
              </video>

              <!-- Overlay: chips -->
              <div style="position:absolute;top:14px;left:14px;z-index:10;display:flex;gap:6px">
                <span class="chip" style="background:oklch(0 0 0/0.55);color:oklch(0.92 0.15 25);border-color:oklch(0.65 0.25 25/0.5);padding:3px 10px;font-size:10px">
                  <span class="live-dot"></span> REC
                </span>
                <span class="chip mono" style="background:oklch(0 0 0/0.55);border-color:oklch(1 0 0/0.1);font-size:10px">
                  {{ selectedCam()?.name }}
                </span>
              </div>

              <!-- Speed indicator -->
              <div class="mono" style="position:absolute;top:14px;right:14px;z-index:10;font-size:11px;color:oklch(0.95 0 0);text-shadow:0 1px 6px oklch(0 0 0/0.9)">
                {{ speed() }}× · {{ fmtSec(currentTimeSec()) }}
              </div>

              <!-- Buffering -->
              @if (buffering()) {
                <div style="position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:oklch(0 0 0/0.4)">
                  <div style="width:32px;height:32px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div>
                </div>
              }

              <!-- Center play/pause overlay on click -->
              <div style="position:absolute;inset:0;z-index:9;cursor:pointer" (click)="togglePlay()"></div>

            } @else {
              <!-- Empty state -->
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--fg-3)">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M22 12H2M12 2v20M4.93 4.93l14.14 14.14M4.93 19.07 19.07 4.93"/>
                </svg>
                <div style="font-size:13px">
                  @if (!selectedCam()) { Selecciona una cámara }
                  @else if (loadingRecs()) { Cargando grabaciones… }
                  @else { Sin grabaciones para esta fecha }
                </div>
              </div>
            }
          </div>

          <!-- TRANSPORT CONTROLS -->
          <div class="panel" style="padding:10px 16px;display:flex;align-items:center;gap:14px;flex-shrink:0">
            <!-- Buttons -->
            <div style="display:flex;align-items:center;gap:4px">
              <button class="btn icon ghost" style="width:30px;height:30px;border:none" (click)="prevSegment()" title="Segmento anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              <button class="btn icon ghost" style="width:30px;height:30px;border:none" (click)="seekRel(-10)" title="-10s">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5V1L7 6l5 5V7a7 7 0 1 1-7 7h-2a9 9 0 1 0 9-9z"/><text x="8" y="16" font-size="5" fill="currentColor" stroke="none">10</text></svg>
              </button>
              <button class="btn primary"
                      style="width:40px;height:40px;justify-content:center;padding:0;border-radius:50%;font-size:16px"
                      (click)="togglePlay()">
                {{ playing() ? '⏸' : '▶' }}
              </button>
              <button class="btn icon ghost" style="width:30px;height:30px;border:none" (click)="seekRel(10)" title="+10s">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5V1l5 5-5 5V7a7 7 0 1 0 7 7h2a9 9 0 1 1-9-9z"/><text x="9" y="16" font-size="5" fill="currentColor" stroke="none">10</text></svg>
              </button>
              <button class="btn icon ghost" style="width:30px;height:30px;border:none" (click)="nextSegment()" title="Siguiente segmento">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 4V8zm7-6h2v12h-2z"/></svg>
              </button>
            </div>

            <div style="width:1px;height:24px;background:var(--line-1)"></div>

            <!-- Time -->
            <div class="mono" style="font-size:12px;min-width:110px">
              <span style="color:var(--accent-2)">{{ fmtSec(currentTimeSec()) }}</span>
              <span style="color:var(--fg-3)"> / {{ fmtSec(duration()) }}</span>
            </div>

            <!-- Seek bar -->
            <div style="flex:1;height:4px;background:var(--bg-3);border-radius:999px;cursor:pointer;position:relative"
                 (click)="seekBar($event)">
              <div [style.width.%]="seekPct()" style="height:100%;background:var(--accent-2);border-radius:999px;pointer-events:none"></div>
              <div [style.left.%]="seekPct()"
                   style="position:absolute;top:-4px;width:12px;height:12px;background:var(--accent-2);border-radius:50%;transform:translateX(-50%);pointer-events:none;box-shadow:0 0 8px var(--accent-glow)"></div>
            </div>

            <div style="width:1px;height:24px;background:var(--line-1)"></div>

            <!-- Speed selector -->
            <div style="display:flex;gap:2px;padding:2px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:6px">
              @for (s of speeds; track s) {
                <button class="mono" (click)="setSpeed(s)"
                        style="padding:3px 7px;font-size:10px;border:none;cursor:pointer;border-radius:4px"
                        [style.background]="speed() === s ? 'var(--accent-soft)' : 'transparent'"
                        [style.color]="speed() === s ? 'var(--accent-2)' : 'var(--fg-3)'">
                  {{ s }}×
                </button>
              }
            </div>

            <!-- Fullscreen -->
            <button class="btn icon ghost" style="width:30px;height:30px;border:none" (click)="toggleFullscreen()" title="Pantalla completa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            </button>
          </div>

          <!-- TIMELINE 24H -->
          <div class="panel" style="padding:12px 14px;flex-shrink:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div class="mono" style="font-size:9px;letter-spacing:0.14em;color:var(--fg-2)">LÍNEA DE TIEMPO · {{ selectedDateLabel() }}</div>
              <div style="display:flex;gap:10px;font-size:9px;color:var(--fg-3)">
                <span style="display:flex;align-items:center;gap:4px">
                  <span style="width:10px;height:4px;background:var(--accent-2);border-radius:2px;opacity:0.7"></span>
                  Grabación
                </span>
                @if (currentRec()) {
                  <span class="mono" style="color:var(--accent-2)">▶ {{ recLabel(currentRec()!) }}</span>
                }
              </div>
            </div>

            <!-- Timeline track -->
            <div class="timeline" (click)="scrubTimeline($event)">
              <!-- Hour ticks -->
              <div style="position:absolute;top:3px;left:0;right:0;display:flex;justify-content:space-between;padding:0 3px;font-size:8px;color:var(--fg-4);pointer-events:none" class="mono">
                @for (h of [0,3,6,9,12,15,18,21,24]; track h) {
                  <span>{{ String(h).padStart(2,'0') }}</span>
                }
              </div>

              <!-- Recording blocks -->
              @for (rec of recordings(); track rec.filename) {
                <div class="tl-rec"
                     [style.left.%]="recStartPct(rec)"
                     [style.width.%]="recWidthPct(rec)"
                     [class.tl-rec-active]="currentRec()?.filename === rec.filename"
                     (click)="loadRecording(rec, 0); $event.stopPropagation()"
                     [title]="recLabel(rec)">
                </div>
              }

              <!-- Playhead -->
              @if (currentRec()) {
                <div class="playhead" [style.left.%]="playheadPct()">
                  <div class="playhead-handle"></div>
                  <div class="playhead-label mono">{{ fmtSec(playheadAbsSec()) }}</div>
                </div>
              }
            </div>
          </div>

          <!-- SEGMENTS LIST -->
          <div class="panel" style="flex-shrink:0;overflow:hidden">
            <div style="padding:10px 14px 6px;display:flex;align-items:center;gap:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M20.2 13.4a8.3 8.3 0 0 0 0-2.8l1.8-1.4a10 10 0 0 0-2.8-4.8l-2.1.6a8 8 0 0 0-2.4-1.4l-.3-2.2a10 10 0 0 0-5.6 0l-.3 2.2a8 8 0 0 0-2.4 1.4l-2.1-.6a10 10 0 0 0-2.8 4.8l1.8 1.4a8.3 8.3 0 0 0 0 2.8L1.8 14.8a10 10 0 0 0 2.8 4.8l2.1-.6a8 8 0 0 0 2.4 1.4l.3 2.2a10 10 0 0 0 5.6 0l.3-2.2a8 8 0 0 0 2.4-1.4l2.1.6a10 10 0 0 0 2.8-4.8z"/></svg>
              <div class="mono" style="font-size:9px;letter-spacing:0.14em">SEGMENTOS ({{ recordings().length }})</div>
            </div>

            @if (loadingRecs()) {
              <div style="padding:14px;text-align:center;font-size:11px;color:var(--fg-3)">Cargando…</div>
            } @else if (recordings().length === 0) {
              <div style="padding:14px;text-align:center;font-size:11px;color:var(--fg-3)">
                Sin grabaciones para {{ selectedDateLabel() }}
              </div>
            } @else {
              <div style="display:flex;gap:8px;padding:6px 14px 12px;overflow-x:auto">
                @for (rec of recordings(); track rec.filename) {
                  <div style="flex-shrink:0;width:140px;border-radius:8px;overflow:hidden;cursor:pointer;transition:all 0.15s"
                       [style.border]="currentRec()?.filename === rec.filename ? '1.5px solid var(--accent)' : '1px solid var(--line-1)'"
                       [style.box-shadow]="currentRec()?.filename === rec.filename ? '0 0 0 2px var(--accent-soft)' : 'none'"
                       (click)="loadRecording(rec, 0)">
                    <div style="padding:8px 10px;background:var(--bg-2)">
                      <div class="mono" style="font-size:10px;font-weight:600"
                           [style.color]="currentRec()?.filename === rec.filename ? 'var(--accent-2)' : 'var(--fg-1)'">
                        {{ recTimeLabel(rec) }}
                      </div>
                      <div style="font-size:9px;color:var(--fg-3);margin-top:2px">{{ fmtSize(rec.sizeBytes) }}</div>
                    </div>
                    @if (currentRec()?.filename === rec.filename) {
                      <div style="height:2px;background:linear-gradient(90deg,var(--accent),var(--accent-2))"></div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }

    .page-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
    .dvr-body { flex:1;display:grid;grid-template-columns:240px 1fr;gap:12px;padding:14px 20px 16px;min-height:0; }
    .dvr-left { display:flex;flex-direction:column;gap:10px;min-height:0; }
    .dvr-right { display:flex;flex-direction:column;gap:10px;min-height:0; }

    .player-container {
      flex:1;position:relative;min-height:0;
      background:oklch(0.08 0.01 245);
      border-radius:10px;overflow:hidden;
      border:1px solid var(--line-1);
    }

    .timeline {
      position:relative;
      height:28px;
      background:var(--bg-2);
      border-radius:4px;
      overflow:visible;
      cursor:crosshair;
      border:1px solid var(--line-1);
    }

    .tl-rec {
      position:absolute;
      top:12px;
      height:8px;
      background:oklch(0.55 0.18 250/0.65);
      border-radius:2px;
      transition:background 0.15s;
      cursor:pointer;
    }
    .tl-rec:hover { background:oklch(0.65 0.20 250/0.85); }
    .tl-rec.tl-rec-active { background:var(--accent-2); box-shadow:0 0 8px var(--accent-glow); }

    .playhead {
      position:absolute;top:0;bottom:0;width:2px;
      background:var(--accent);
      box-shadow:0 0 10px var(--accent-glow);
      z-index:5;pointer-events:none;
    }
    .playhead-handle {
      position:absolute;top:-5px;left:-5px;width:12px;height:12px;
      background:var(--accent);border-radius:50%;
      box-shadow:0 0 10px var(--accent-glow);
    }
    .playhead-label {
      position:absolute;top:-22px;left:-22px;width:48px;
      padding:1px 4px;background:var(--accent);color:white;
      font-size:8px;border-radius:3px;text-align:center;font-weight:600;
    }
  `]
})
export class DvrComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoPlayer') videoRef?: ElementRef<HTMLVideoElement>;

  private cameraService  = inject(CameraService);
  private recService     = inject(RecordingsService);
  private cdr            = inject(ChangeDetectorRef);

  cameras      = signal<Camera[]>([]);
  selectedCam  = signal<Camera | null>(null);
  recordings   = signal<RecordingFile[]>([]);
  currentRec   = signal<RecordingFile | null>(null);
  loadingRecs  = signal(false);

  playing       = signal(false);
  buffering     = signal(false);
  speed         = signal(1);
  currentTimeSec = signal(0);
  duration       = signal(0);

  // Calendar state
  calYear  = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth() + 1);
  calDay   = signal(new Date().getDate());
  hasDates = signal<Set<string>>(new Set());

  readonly speeds = [0.25, 0.5, 1, 2, 4, 8, 16];
  readonly fmtSec = fmtSec;
  readonly fmtSize = fmtSize;
  readonly String = String;

  // Internal: pending seek after src changes
  private _pendingSeek: number | null = null;
  private _destroyed = false;

  constructor() {
    // When currentRec changes, reload video
    effect(() => {
      const rec = this.currentRec();
      const el = this.videoRef?.nativeElement;
      if (!el || !rec) return;
      el.src = rec.url;
      el.playbackRate = this.speed();
      el.load();
      const seek = this._pendingSeek ?? 0;
      this._pendingSeek = null;
      el.addEventListener('loadedmetadata', () => {
        el.currentTime = seek;
        el.play().catch(() => {});
      }, { once: true });
    });
  }

  // ── Calendar helpers ────────────────────────────────────────────
  get selectedDate(): string {
    return `${this.calYear()}-${String(this.calMonth()).padStart(2,'0')}-${String(this.calDay()).padStart(2,'0')}`;
  }

  selectedDateLabel(): string {
    const d = new Date(this.selectedDate + 'T12:00:00');
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  }

  monthLabel(): string {
    return new Date(this.calYear(), this.calMonth() - 1, 1)
      .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  calDays(): number[] {
    const days = new Date(this.calYear(), this.calMonth(), 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }

  calPadding(): null[] {
    // Monday=0 padding
    const firstDay = new Date(this.calYear(), this.calMonth() - 1, 1).getDay();
    const pad = firstDay === 0 ? 6 : firstDay - 1;
    return Array(pad).fill(null);
  }

  calDateStr(day: number): string {
    return `${this.calYear()}-${String(this.calMonth()).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  isSelectedDay(day: number): boolean {
    return this.calDay() === day &&
      this.calYear() === new Date().getFullYear() &&
      this.calMonth() === new Date().getMonth() + 1
      ? true
      : this.selectedDate === this.calDateStr(day);
  }

  prevMonth(): void {
    if (this.calMonth() === 1) { this.calMonth.set(12); this.calYear.update(y => y - 1); }
    else this.calMonth.update(m => m - 1);
    this.loadHasDates();
  }

  nextMonth(): void {
    if (this.calMonth() === 12) { this.calMonth.set(1); this.calYear.update(y => y + 1); }
    else this.calMonth.update(m => m + 1);
    this.loadHasDates();
  }

  selectDay(day: number): void {
    this.calDay.set(day);
    this.loadRecordings();
  }

  // ── Camera selection ────────────────────────────────────────────
  selectCamera(cam: Camera): void {
    this.selectedCam.set(cam);
    this.currentRec.set(null);
    this.recordings.set([]);
    this.playing.set(false);
    this.loadHasDates();
    this.loadRecordings();
  }

  // ── Data loading ────────────────────────────────────────────────
  loadHasDates(): void {
    const cam = this.selectedCam();
    if (!cam) return;
    this.recService.getDates(cam.id, this.calYear(), this.calMonth()).subscribe({
      next: dates => this.hasDates.set(new Set(dates)),
      error: () => {},
    });
  }

  loadRecordings(): void {
    const cam = this.selectedCam();
    if (!cam) return;
    this.loadingRecs.set(true);
    this.currentRec.set(null);
    this.recordings.set([]);
    this.recService.getFiles(cam.id, this.selectedDate).subscribe({
      next: files => {
        this.recordings.set(files);
        this.loadingRecs.set(false);
        if (files.length > 0) this.loadRecording(files[0], 0);
      },
      error: () => this.loadingRecs.set(false),
    });
  }

  loadRecording(rec: RecordingFile, seekSec: number): void {
    this._pendingSeek = seekSec;
    this.currentRec.set(rec);
    this.playing.set(true);
  }

  // ── Playback controls ───────────────────────────────────────────
  togglePlay(): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    if (this.playing()) el.pause(); else el.play().catch(() => {});
  }

  setSpeed(s: number): void {
    this.speed.set(s);
    const el = this.videoRef?.nativeElement;
    if (el) el.playbackRate = s;
  }

  seekRel(delta: number): void {
    const el = this.videoRef?.nativeElement;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
  }

  seekBar(e: MouseEvent): void {
    const el = this.videoRef?.nativeElement;
    if (!el || !el.duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  }

  prevSegment(): void {
    const recs = this.recordings();
    const cur  = this.currentRec();
    if (!recs.length || !cur) return;
    const idx = recs.findIndex(r => r.filename === cur.filename);
    if (idx > 0) this.loadRecording(recs[idx - 1], 0);
  }

  nextSegment(): void {
    const recs = this.recordings();
    const cur  = this.currentRec();
    if (!recs.length || !cur) return;
    const idx = recs.findIndex(r => r.filename === cur.filename);
    if (idx < recs.length - 1) this.loadRecording(recs[idx + 1], 0);
  }

  toggleFullscreen(): void {
    const container = document.querySelector('.player-container') as HTMLElement;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  downloadCurrent(): void {
    const rec = this.currentRec();
    if (!rec) return;
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = rec.filename;
    a.click();
  }

  // ── Timeline helpers ────────────────────────────────────────────
  private dateMidnightSec(rec: RecordingFile): number {
    const start = new Date(rec.startTime);
    const midnight = new Date(this.selectedDate + 'T00:00:00');
    return (start.getTime() - midnight.getTime()) / 1000;
  }

  recStartPct(rec: RecordingFile): number {
    const sec = this.dateMidnightSec(rec);
    return Math.max(0, (sec / 86400) * 100);
  }

  recWidthPct(rec: RecordingFile): number {
    // Assume 10-minute segments; use size as proxy if needed
    const durSec = 600; // 10 min default
    return Math.min(100 - this.recStartPct(rec), (durSec / 86400) * 100);
  }

  playheadAbsSec(): number {
    const cur = this.currentRec();
    if (!cur) return 0;
    return this.dateMidnightSec(cur) + this.currentTimeSec();
  }

  playheadPct(): number {
    return (this.playheadAbsSec() / 86400) * 100;
  }

  scrubTimeline(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = pct * 86400;

    const rec = this.recordings().find(r => {
      const start = this.dateMidnightSec(r);
      return targetSec >= start && targetSec < start + 600;
    });

    if (rec) {
      const offset = targetSec - this.dateMidnightSec(rec);
      this.loadRecording(rec, Math.max(0, offset));
    }
  }

  seekPct(): number {
    const d = this.duration();
    if (!d) return 0;
    return (this.currentTimeSec() / d) * 100;
  }

  recLabel(rec: RecordingFile): string {
    const d = new Date(rec.startTime);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  recTimeLabel(rec: RecordingFile): string {
    const start = new Date(rec.startTime);
    const end   = new Date(start.getTime() + 600000);
    return `${this.recLabel(rec)}–${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  }

  totalSizeLabel(): string {
    const total = this.recordings().reduce((s, r) => s + (r.sizeBytes || 0), 0);
    return fmtSize(total);
  }

  // ── Video events ────────────────────────────────────────────────
  onTimeUpdate(): void {
    const el = this.videoRef?.nativeElement;
    if (el) this.currentTimeSec.set(el.currentTime);
  }

  onMetadata(): void {
    const el = this.videoRef?.nativeElement;
    if (el) this.duration.set(el.duration || 0);
  }

  onEnded(): void {
    this.playing.set(false);
    this.nextSegment();
  }

  // ── Lifecycle ───────────────────────────────────────────────────
  ngOnInit(): void {
    this.cameraService.getAll().subscribe(cams => {
      this.cameras.set(cams);
      if (cams.length) this.selectCamera(cams[0]);
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this._destroyed = true;
    const el = this.videoRef?.nativeElement;
    if (el) { el.pause(); el.src = ''; }
  }
}

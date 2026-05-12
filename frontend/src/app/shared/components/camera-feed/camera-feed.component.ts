import {
  Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges,
  ElementRef, ViewChild, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SCENES } from './camera-scenes';

export type FeedStatus = 'live' | 'rec' | 'offline';

export interface AiBox {
  x: number; y: number; w: number; h: number; label: string;
}

// HLS.js is loaded as a side effect — handle both cases
declare global {
  interface Window { Hls: unknown }
}

@Component({
  selector: 'wc-camera-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feed" [class.offline]="status === 'offline'" [style]="feedStyle">

      <!-- Scene SVG placeholder (shown when no HLS) -->
      @if (status !== 'offline' && !hlsUrl) {
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"
             style="position:absolute;inset:0;width:100%;height:100%;z-index:1"
             [innerHTML]="sceneSvg"></svg>
      }

      <!-- HLS video -->
      @if (hlsUrl) {
        <video #videoEl autoplay muted playsinline
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1">
        </video>
      }

      <!-- Corner brackets -->
      @if (corners && status !== 'offline') {
        <span class="corner tl"></span>
        <span class="corner tr"></span>
        <span class="corner bl"></span>
        <span class="corner br"></span>
      }

      <!-- Scan line on live -->
      @if (status === 'live' && !hlsUrl) {
        <div class="feed-scan"></div>
      }

      <!-- Status tag -->
      @if (status === 'live') {
        <div class="feed-tag" style="background:oklch(0.65 0.25 25 / 0.18);border-color:oklch(0.65 0.25 25 / 0.5);color:oklch(0.92 0.15 25)">
          <span class="live-dot"></span> LIVE
        </div>
      }
      @if (status === 'rec') {
        <div class="feed-tag" style="background:oklch(0.65 0.25 25 / 0.18);border-color:oklch(0.65 0.25 25 / 0.5);color:oklch(0.92 0.15 25)">
          <span class="live-dot"></span> REC
        </div>
      }

      <!-- Offline indicator -->
      @if (status === 'offline') {
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--fg-3);z-index:5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3z"/>
            <line x1="2" y1="2" x2="22" y2="22" stroke="oklch(0.65 0.25 25)" stroke-width="1.5"/>
          </svg>
          <div class="mono" style="font-size:9px;letter-spacing:0.1em">SIGNAL LOST</div>
        </div>
      }

      <!-- AI bounding boxes -->
      @for (box of aiBoxes; track $index) {
        <div class="aibox" [attr.data-label]="box.label"
             [style.left.%]="box.x" [style.top.%]="box.y"
             [style.width.%]="box.w" [style.height.%]="box.h"></div>
      }

      <!-- Quality badge -->
      @if (quality && status !== 'offline') {
        <div style="position:absolute;top:10px;right:12px;z-index:6">
          <span class="mono" style="font-size:9px;color:oklch(0.85 0.14 205);letter-spacing:0.1em;text-shadow:0 1px 4px oklch(0 0 0/0.8)">{{ quality }}</span>
        </div>
      }

      <!-- Camera name -->
      @if (showName && name) {
        <div class="feed-name">{{ name }}</div>
      }

      <!-- Timecode -->
      @if (showTc && status !== 'offline') {
        <div class="feed-tc">{{ tc || currentTime }}</div>
      }

      <!-- Bottom gradient -->
      <div class="feed-gradient"></div>

      <!-- Slot for extra content -->
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .feed { width: 100%; height: 100%; }
  `]
})
export class CameraFeedComponent implements OnInit, OnChanges, OnDestroy {
  @Input() scene: string = 'parking';
  @Input() name = '';
  @Input() status: FeedStatus = 'live';
  @Input() tc = '';
  @Input() quality = '';
  @Input() corners = true;
  @Input() aiBoxes: AiBox[] = [];
  @Input() showName = true;
  @Input() showTc = true;
  @Input() hlsUrl: string | null = null;
  @Input() feedStyle: Record<string, string> = {};

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  private sanitizer = inject(DomSanitizer);
  sceneSvg!: SafeHtml;
  currentTime = '';
  private hlsInstance: unknown = null;
  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateScene();
    this.startClock();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scene']) this.updateScene();
    if (changes['hlsUrl'] && this.videoEl) this.initHls();
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
    this.destroyHls();
  }

  private updateScene(): void {
    const svgContent = SCENES[this.scene] || SCENES['parking'];
    this.sceneSvg = this.sanitizer.bypassSecurityTrustHtml(svgContent);
  }

  private startClock(): void {
    const update = () => {
      this.currentTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  private async initHls(): Promise<void> {
    if (!this.hlsUrl || !this.videoEl) return;
    this.destroyHls();

    const video = this.videoEl.nativeElement;

    // Dynamic import of HLS.js
    try {
      const Hls = await import('hls.js').then(m => m.default);
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 10 });
        hls.loadSource(this.hlsUrl);
        hls.attachMedia(video);
        this.hlsInstance = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = this.hlsUrl;
      }
    } catch {
      video.src = this.hlsUrl;
    }
  }

  private destroyHls(): void {
    if (this.hlsInstance && typeof (this.hlsInstance as { destroy?: () => void }).destroy === 'function') {
      (this.hlsInstance as { destroy: () => void }).destroy();
      this.hlsInstance = null;
    }
  }
}

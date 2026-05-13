import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PtzService, PtzAction } from '../../../core/services/ptz.service';

@Component({
  selector: 'wc-ptz-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ptz-wrapper glass">
      <!-- Direction pad -->
      <div class="ptz-grid">
        <button class="btn icon" title="Up-Left"   (mousedown)="start('up-left')"   (mouseup)="stop()" (mouseleave)="stop()">↖</button>
        <button class="btn icon" title="Up"        (mousedown)="start('up')"        (mouseup)="stop()" (mouseleave)="stop()">↑</button>
        <button class="btn icon" title="Up-Right"  (mousedown)="start('up-right')"  (mouseup)="stop()" (mouseleave)="stop()">↗</button>
        <button class="btn icon" title="Left"      (mousedown)="start('left')"      (mouseup)="stop()" (mouseleave)="stop()">←</button>
        <div class="ptz-center mono">PTZ</div>
        <button class="btn icon" title="Right"     (mousedown)="start('right')"     (mouseup)="stop()" (mouseleave)="stop()">→</button>
        <button class="btn icon" title="Down-Left" (mousedown)="start('down-left')" (mouseup)="stop()" (mouseleave)="stop()">↙</button>
        <button class="btn icon" title="Down"      (mousedown)="start('down')"      (mouseup)="stop()" (mouseleave)="stop()">↓</button>
        <button class="btn icon" title="Down-Right"(mousedown)="start('down-right')"(mouseup)="stop()" (mouseleave)="stop()">↘</button>
      </div>

      <!-- Zoom -->
      <div class="zoom-col">
        <button class="btn icon" (mousedown)="start('zoom-in')" (mouseup)="stop()" (mouseleave)="stop()" title="Zoom +">+</button>
        <div class="zoom-track">
          <div class="zoom-knob" [style.top.%]="50 - (zoomLevel - 1) * 25"></div>
        </div>
        <button class="btn icon" (mousedown)="start('zoom-out')" (mouseup)="stop()" (mouseleave)="stop()" title="Zoom -">−</button>
        <div class="mono" style="font-size:8px;color:var(--fg-3);text-align:center">x{{ zoomLevel.toFixed(1) }}</div>
      </div>
    </div>

    <!-- Speed slider -->
    <div class="speed-row glass">
      <span class="mono" style="font-size:9px;color:var(--fg-3)">VEL</span>
      <input type="range" min="0.1" max="1" step="0.1" [(ngModel)]="speed" style="flex:1;accent-color:var(--accent)">
      <span class="mono" style="font-size:9px;color:var(--fg-2)">{{ speed }}</span>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 8px; }

    .ptz-wrapper {
      padding: 10px;
      display: flex;
      gap: 10px;
      align-items: center;
      border-radius: 12px;
    }

    .ptz-grid {
      display: grid;
      grid-template-columns: repeat(3, 30px);
      gap: 4px;
    }

    .ptz-grid .btn.icon {
      width: 30px; height: 30px; padding: 0;
      font-size: 14px;
      justify-content: center;
    }

    .ptz-center {
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: var(--accent-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-xs);
    }

    .zoom-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .zoom-col .btn.icon { width: 26px; height: 26px; padding: 0; font-size: 16px; }

    .zoom-track {
      width: 4px; height: 60px;
      background: var(--bg-3);
      border-radius: 999px;
      position: relative;
    }

    .zoom-knob {
      position: absolute;
      left: -4px;
      width: 12px; height: 12px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-glow);
      transition: top 0.2s;
    }

    .speed-row {
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 8px;
    }
  `]
})
export class PtzControlComponent {
  @Input() cameraId = '';
  speed = 0.5;
  zoomLevel = 1;

  private ptz = inject(PtzService);
  private moving = false;

  start(action: PtzAction): void {
    this.moving = true;
    this.ptz.move(this.cameraId, action, this.speed).subscribe();
    if (action === 'zoom-in') this.zoomLevel = Math.min(10, this.zoomLevel + 0.1);
    if (action === 'zoom-out') this.zoomLevel = Math.max(1, this.zoomLevel - 0.1);
  }

  stop(): void {
    if (!this.moving) return;
    this.moving = false;
    this.ptz.stop(this.cameraId).subscribe();
  }
}

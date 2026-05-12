import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'wc-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="topbar">
      <div class="topbar-title">
        <div style="font-size:18px;font-weight:600;letter-spacing:-0.01em">{{ title }}</div>
        @if (subtitle) {
          <div class="mono" style="font-size:10px;color:var(--fg-3);letter-spacing:0.1em;margin-top:2px">{{ subtitle }}</div>
        }
      </div>
      <div class="topbar-right">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--line-1);
      background: oklch(0.15 0.013 245 / 0.5);
      backdrop-filter: blur(8px);
      flex-shrink: 0;
    }

    .topbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `]
})
export class TopbarComponent {
  @Input() title = '';
  @Input() subtitle = '';
}

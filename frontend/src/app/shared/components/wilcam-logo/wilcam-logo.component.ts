import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'wc-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-wrapper" [style.gap.px]="collapsed ? 0 : 10">
      <svg [attr.width]="size * 1.6" [attr.height]="size * 1.6" viewBox="0 0 32 32"
           style="filter: drop-shadow(0 0 8px oklch(0.70 0.21 250 / 0.6)); flex-shrink:0">
        <defs>
          <linearGradient id="wcg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="oklch(0.82 0.16 200)"/>
            <stop offset="1" stop-color="oklch(0.62 0.22 252)"/>
          </linearGradient>
        </defs>
        <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
              fill="none" stroke="url(#wcg)" stroke-width="1.6"/>
        <path d="M16 8 L22 11.5 L22 18 L16 14.5 Z" fill="url(#wcg)" opacity="0.85"/>
        <path d="M16 8 L10 11.5 L10 18 L16 14.5 Z" fill="oklch(0.82 0.16 200)" opacity="0.35"/>
        <path d="M16 24 L22 20.5 L22 14 L16 17.5 Z" fill="oklch(0.62 0.22 252)" opacity="0.55"/>
        <path d="M16 24 L10 20.5 L10 14 L16 17.5 Z" fill="url(#wcg)" opacity="0.9"/>
        <circle cx="16" cy="16" r="1.6" fill="oklch(0.99 0 0)"/>
      </svg>

      @if (!collapsed) {
        <div class="logo-text" [style.line-height]="1">
          <div [style.font-size.px]="size" style="font-weight:700;letter-spacing:0.16em;color:var(--fg-0);font-family:var(--font-display)">
            WIL<span style="color:var(--accent-2)">CAM</span>
          </div>
          @if (sub) {
            <div class="mono" [style.font-size.px]="size * 0.42"
                 style="letter-spacing:0.2em;color:var(--fg-3);margin-top:4px">{{ sub }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .logo-wrapper {
      display: flex;
      align-items: center;
    }
  `]
})
export class WilcamLogoComponent {
  @Input() size = 16;
  @Input() sub: string | null = 'NETWORK VIDEO RECORDER';
  @Input() collapsed = false;
}

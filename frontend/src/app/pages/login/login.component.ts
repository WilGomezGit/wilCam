import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WilcamLogoComponent } from '../../shared/components/wilcam-logo/wilcam-logo.component';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';

@Component({
  selector: 'wc-login',
  standalone: true,
  imports: [CommonModule, FormsModule, WilcamLogoComponent, CameraFeedComponent],
  template: `
    <div class="login-root">
      <!-- Ambient orbs -->
      <div class="orb" style="width:480px;height:480px;background:oklch(0.50 0.22 250);top:-120px;left:-120px"></div>
      <div class="orb" style="width:380px;height:380px;background:oklch(0.70 0.18 200);bottom:-80px;right:200px;opacity:0.4"></div>
      <div class="grid-bg" style="position:absolute;inset:0;opacity:0.5;mask-image:radial-gradient(80% 70% at 50% 50%,black,transparent)"></div>

      <!-- Topbar -->
      <div class="login-topbar">
        <wc-logo [size]="14" [sub]="null"></wc-logo>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="chip ok"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor"></span> Conexión segura</span>
          <span class="chip">v4.2.1</span>
        </div>
      </div>

      <!-- Decorative lines -->
      <svg width="100%" height="100%" style="position:absolute;inset:0;opacity:0.4;z-index:1;pointer-events:none">
        <defs>
          <linearGradient id="ll" x1="0" x2="1">
            <stop offset="0" stop-color="oklch(0.85 0.14 205)" stop-opacity="0"/>
            <stop offset="0.5" stop-color="oklch(0.85 0.14 205)" stop-opacity="0.7"/>
            <stop offset="1" stop-color="oklch(0.85 0.14 205)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="200" x2="1280" y2="160" stroke="url(#ll)" stroke-width="0.5"/>
        <line x1="0" y1="600" x2="1280" y2="640" stroke="url(#ll)" stroke-width="0.5"/>
        <line x1="0" y1="380" x2="1280" y2="420" stroke="url(#ll)" stroke-width="0.3"/>
      </svg>

      <!-- Main grid -->
      <div class="login-grid">
        <!-- LEFT — hero -->
        <div class="login-hero">
          <div class="mono" style="font-size:11px;color:var(--accent-2);letter-spacing:0.3em;margin-bottom:24px">◆ CENTRO DE MONITOREO</div>
          <h1 class="login-headline">
            Vigilancia<br>
            <span class="gradient-text">en tiempo real,</span><br>
            sin compromisos.
          </h1>
          <p style="font-size:15px;color:var(--fg-2);max-width:460px;line-height:1.55;margin-top:24px">
            Plataforma NVR profesional con detección por IA, grabación continua en 4K y acceso remoto encriptado de extremo a extremo.
          </p>

          <div class="login-stats">
            @for (stat of stats; track stat.n) {
              <div>
                <div style="font-size:28px;font-weight:500;letter-spacing:-0.02em" class="glow">{{ stat.n }}</div>
                <div style="font-size:11px;color:var(--fg-3);text-transform:uppercase;letter-spacing:0.12em;margin-top:4px">{{ stat.l }}</div>
              </div>
            }
          </div>

          <!-- Floating camera previews -->
          <div style="position:absolute;left:0;bottom:60px;width:220px;height:130px;transform:rotate(-2deg)">
            <wc-camera-feed scene="parking" name="LOTE-A · NORTE" tc="14:32:08" quality="4K" status="live" [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
          </div>
          <div style="position:absolute;left:240px;bottom:100px;width:200px;height:118px;transform:rotate(3deg);opacity:0.85">
            <wc-camera-feed scene="entrance" name="LOBBY-01" tc="14:32:08" quality="HD" status="live" [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
          </div>
        </div>

        <!-- RIGHT — login card -->
        <div class="login-card-wrap">
          <div class="glass login-card">
            <!-- Corner glow -->
            <div style="position:absolute;top:-1px;left:40px;right:40px;height:1px;background:linear-gradient(90deg,transparent,var(--accent-2),transparent)"></div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
              <div>
                <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em">Iniciar sesión</div>
                <div class="mono" style="font-size:10px;color:var(--fg-3);letter-spacing:0.12em;margin-top:4px">ACCESO · OPERADOR</div>
              </div>
              <div style="width:36px;height:36px;border-radius:var(--r-sm);border:1px solid var(--line-1);display:flex;align-items:center;justify-content:center;color:var(--accent-2)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>

            <!-- Google -->
            <button class="btn" style="width:100%;justify-content:center;padding:12px 14px;background:var(--bg-2);font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8z"/>
                <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.3v2.8C4 19.9 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.3a11 11 0 0 0 0 9.8l3.6-2.8z"/>
                <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 12 1 11 11 0 0 0 2.3 7.1l3.6 2.8C6.8 7.3 9.2 5.4 12 5.4z"/>
              </svg>
              Continuar con Google
            </button>

            <div class="div-label" style="margin:22px 0">O CONTINÚA CON CORREO</div>

            <!-- Fields -->
            <div style="display:flex;flex-direction:column;gap:12px">
              <label style="display:flex;flex-direction:column;gap:6px">
                <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CORREO</span>
                <input type="email" [(ngModel)]="email" placeholder="operador@empresa.com">
              </label>
              <label style="display:flex;flex-direction:column;gap:6px">
                <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CONTRASEÑA</span>
                <div style="position:relative">
                  <input [type]="showPwd ? 'text' : 'password'" [(ngModel)]="password" style="padding-right:80px">
                  <button class="btn ghost" (click)="showPwd = !showPwd"
                          style="position:absolute;right:4px;top:4px;padding:5px 8px;font-size:11px;color:var(--fg-2);border:none">
                    {{ showPwd ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
              </label>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg-2);cursor:pointer">
                  <span style="width:14px;height:14px;border-radius:3px;border:1px solid var(--line-2);background:var(--accent);display:flex;align-items:center;justify-content:center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 12l5 5 9-13"/></svg>
                  </span>
                  Recordar dispositivo
                </label>
                <a style="font-size:12px;color:var(--accent-2);text-decoration:none;cursor:pointer">¿Olvidaste tu clave?</a>
              </div>
            </div>

            <button class="btn primary" (click)="login()"
                    style="width:100%;justify-content:center;padding:13px 14px;margin-top:20px;font-size:14px;font-weight:600">
              Acceder al sistema →
            </button>

            <!-- 2FA hint -->
            <div style="margin-top:18px;padding:12px;background:oklch(0.20 0.018 245/0.5);border:1px dashed var(--line-2);border-radius:var(--r-sm);display:flex;align-items:center;gap:10px;font-size:11px;color:var(--fg-2)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Autenticación 2FA activa para tu cuenta.
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="login-footer mono">
        <span>© 2026 WILCAM SECURITY — TODOS LOS DERECHOS RESERVADOS</span>
        <span>SERVIDOR: NVR-PRIME-01 · LIMA, PE · TLS 1.3</span>
      </div>
    </div>
  `,
  styles: [`
    .login-root {
      width: 100vw; height: 100vh;
      background: oklch(0.10 0.012 245);
      color: var(--fg-0);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .login-topbar {
      position: absolute; top: 24px; left: 24px; right: 24px;
      display: flex; align-items: center; justify-content: space-between;
      z-index: 10;
    }

    .login-grid {
      position: absolute; inset: 0;
      display: grid; grid-template-columns: 1fr 480px;
      z-index: 5;
    }

    .login-hero {
      display: flex; flex-direction: column; justify-content: center;
      padding: 0 80px;
      position: relative;
    }

    .login-headline {
      font-size: 56px; font-weight: 600; line-height: 1.02;
      letter-spacing: -0.025em; margin: 0;
    }

    .gradient-text {
      background: linear-gradient(90deg, var(--accent-2), var(--accent));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-stats {
      display: flex; gap: 28px; margin-top: 48px;
    }

    .login-card-wrap {
      display: flex; align-items: center; justify-content: center; padding: 0 60px;
    }

    .login-card {
      width: 100%; padding: 36px; position: relative;
    }

    .login-footer {
      position: absolute; bottom: 16px; left: 24px; right: 24px;
      display: flex; justify-content: space-between;
      font-size: 10px; color: var(--fg-3); z-index: 6;
    }
  `]
})
export class LoginComponent {
  email = 'wilfredo@operaciones.cam';
  password = '';
  showPwd = false;

  readonly stats = [
    { n: '128', l: 'Cámaras simultáneas' },
    { n: '99.98%', l: 'Uptime garantizado' },
    { n: 'AES-256', l: 'Encriptación' },
  ];

  private router = new Router();

  constructor(router: Router) {
    this.router = router;
  }

  login(): void {
    // In production: call auth API. For now, navigate to dashboard.
    this.router.navigate(['/dashboard']);
  }
}

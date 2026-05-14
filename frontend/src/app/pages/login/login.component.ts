import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { WilcamLogoComponent } from '../../shared/components/wilcam-logo/wilcam-logo.component';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';

@Component({
  selector: 'wc-login',
  standalone: true,
  imports: [CommonModule, FormsModule, WilcamLogoComponent, CameraFeedComponent],
  template: `
    <div class="login-root">
      <div class="orb" style="width:480px;height:480px;background:oklch(0.50 0.22 250);top:-120px;left:-120px"></div>
      <div class="orb" style="width:380px;height:380px;background:oklch(0.70 0.18 200);bottom:-80px;right:200px;opacity:0.4"></div>
      <div class="grid-bg" style="position:absolute;inset:0;opacity:0.5;mask-image:radial-gradient(80% 70% at 50% 50%,black,transparent)"></div>

      <div class="login-topbar">
        <wc-logo [size]="14" [sub]="null"></wc-logo>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="chip ok"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor"></span> Conexión segura</span>
          <span class="chip">v1.0.0</span>
        </div>
      </div>

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
      </svg>

      <div class="login-grid">
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
          <div style="position:absolute;left:0;bottom:60px;width:220px;height:130px;transform:rotate(-2deg)">
            <wc-camera-feed scene="parking" name="LOTE-A · NORTE" tc="14:32:08" quality="4K" status="live" [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
          </div>
          <div style="position:absolute;left:240px;bottom:100px;width:200px;height:118px;transform:rotate(3deg);opacity:0.85">
            <wc-camera-feed scene="entrance" name="LOBBY-01" tc="14:32:08" quality="HD" status="live" [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
          </div>
        </div>

        <div class="login-card-wrap">
          <div class="glass login-card">
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

            @if (errorMsg()) {
              <div style="padding:10px 12px;background:oklch(0.22 0.06 25/0.8);border:1px solid oklch(0.55 0.18 25/0.4);border-radius:var(--r-sm);font-size:12px;color:oklch(0.85 0.15 25);margin-bottom:16px;display:flex;align-items:center;gap:8px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ errorMsg() }}
              </div>
            }

            @if (!showForgot()) {
              <!-- LOGIN FORM -->
              <div style="display:flex;flex-direction:column;gap:12px">
                <label style="display:flex;flex-direction:column;gap:6px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CORREO</span>
                  <input type="email" [(ngModel)]="email" placeholder="admin@wilcam.local" [disabled]="loading()" (keydown.enter)="login()">
                </label>
                <label style="display:flex;flex-direction:column;gap:6px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CONTRASEÑA</span>
                  <div style="position:relative">
                    <input [type]="showPwd() ? 'text' : 'password'" [(ngModel)]="password" style="padding-right:80px" [disabled]="loading()" (keydown.enter)="login()">
                    <button class="btn ghost" (click)="showPwd.set(!showPwd())"
                            style="position:absolute;right:4px;top:4px;padding:5px 8px;font-size:11px;color:var(--fg-2);border:none">
                      {{ showPwd() ? 'Ocultar' : 'Ver' }}
                    </button>
                  </div>
                </label>
                <div style="text-align:right;margin-top:2px">
                  <a (click)="openForgot()" style="font-size:12px;color:var(--accent-2);text-decoration:none;cursor:pointer">¿Olvidaste tu clave?</a>
                </div>
              </div>

              <button class="btn primary" (click)="login()" [disabled]="loading()"
                      style="width:100%;justify-content:center;padding:13px 14px;margin-top:20px;font-size:14px;font-weight:600">
                @if (loading()) {
                  <span style="display:flex;align-items:center;gap:8px">
                    <span style="width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>
                    Verificando…
                  </span>
                } @else {
                  Acceder al sistema →
                }
              </button>

              <div style="margin-top:10px;text-align:center;font-size:11px;color:var(--fg-3)">
                Demo: <span class="mono" style="color:var(--accent-2)">admin@wilcam.local</span> / <span class="mono">admin123</span>
              </div>

            } @else {
              <!-- FORGOT PASSWORD PANEL -->
              @if (!forgotTempPwd()) {
                <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:20px">
                  <div style="font-size:15px;font-weight:600">Restablecer contraseña</div>
                  <div style="font-size:12px;color:var(--fg-3)">Se generará una contraseña temporal. Cámbiala en Configuración al ingresar.</div>
                </div>
                @if (forgotError()) {
                  <div style="padding:10px 12px;background:oklch(0.22 0.06 25/0.8);border:1px solid oklch(0.55 0.18 25/0.4);border-radius:var(--r-sm);font-size:12px;color:oklch(0.85 0.15 25);margin-bottom:14px">
                    {{ forgotError() }}
                  </div>
                }
                <label style="display:flex;flex-direction:column;gap:6px">
                  <span class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.16em">CORREO REGISTRADO</span>
                  <input type="email" [(ngModel)]="forgotEmail" placeholder="admin@wilcam.local"
                         [disabled]="forgotLoading()" (keydown.enter)="submitForgot()">
                </label>
                <button class="btn primary" (click)="submitForgot()" [disabled]="forgotLoading()"
                        style="width:100%;justify-content:center;padding:13px 14px;margin-top:16px;font-size:14px;font-weight:600">
                  @if (forgotLoading()) {
                    <span style="display:flex;align-items:center;gap:8px">
                      <span style="width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>
                      Procesando…
                    </span>
                  } @else {
                    Generar contraseña temporal
                  }
                </button>
              } @else {
                <!-- TEMP PASSWORD REVEALED -->
                <div style="display:flex;flex-direction:column;gap:14px">
                  <div style="display:flex;align-items:center;gap:10px;padding:12px;background:oklch(0.18 0.04 155/0.5);border:1px solid oklch(0.55 0.17 155/0.4);border-radius:var(--r-sm)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span style="font-size:13px;font-weight:600;color:var(--ok)">Contraseña generada</span>
                  </div>
                  <div style="font-size:12px;color:var(--fg-2)">Tu contraseña temporal es:</div>
                  <div style="padding:14px 16px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:var(--r-sm);text-align:center">
                    <span class="mono" style="font-size:22px;font-weight:700;letter-spacing:0.08em;color:var(--accent-2)">{{ forgotTempPwd() }}</span>
                  </div>
                  <div style="font-size:11px;color:var(--fg-3);text-align:center">
                    Copia esta contraseña. Tendrás que cambiarla en <strong style="color:var(--fg-2)">Configuración</strong> al ingresar.
                  </div>
                  <button class="btn primary" (click)="useTempPwd()" style="width:100%;justify-content:center;padding:11px 14px;font-size:13px;font-weight:600">
                    Iniciar sesión con contraseña temporal →
                  </button>
                </div>
              }
              <button (click)="closeForgot()" style="background:none;border:none;color:var(--fg-3);font-size:12px;cursor:pointer;margin-top:14px;text-align:center;width:100%">
                ← Volver al inicio de sesión
              </button>
            }

            <div style="margin-top:18px;padding:12px;background:oklch(0.20 0.018 245/0.5);border:1px dashed var(--line-2);border-radius:var(--r-sm);display:flex;align-items:center;gap:10px;font-size:11px;color:var(--fg-2)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Sesión protegida con JWT + cifrado TLS 1.3
            </div>
          </div>
        </div>
      </div>

      <div class="login-footer mono">
        <span>© 2026 WILCAM SECURITY — TODOS LOS DERECHOS RESERVADOS</span>
        <span>SERVIDOR: NVR-PRIME-01 · LIMA, PE · TLS 1.3</span>
      </div>
    </div>
  `,
  styles: [`
    .login-root { width:100vw;height:100vh;background:oklch(0.10 0.012 245);color:var(--fg-0);position:relative;overflow:hidden;display:flex;flex-direction:column; }
    .login-topbar { position:absolute;top:24px;left:24px;right:24px;display:flex;align-items:center;justify-content:space-between;z-index:10; }
    .login-grid { position:absolute;inset:0;display:grid;grid-template-columns:1fr 480px;z-index:5; }
    .login-hero { display:flex;flex-direction:column;justify-content:center;padding:0 80px;position:relative; }
    .login-headline { font-size:56px;font-weight:600;line-height:1.02;letter-spacing:-0.025em;margin:0; }
    .gradient-text { background:linear-gradient(90deg,var(--accent-2),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
    .login-stats { display:flex;gap:28px;margin-top:48px; }
    .login-card-wrap { display:flex;align-items:center;justify-content:center;padding:0 60px; }
    .login-card { width:100%;padding:36px;position:relative; }
    .login-footer { position:absolute;bottom:16px;left:24px;right:24px;display:flex;justify-content:space-between;font-size:10px;color:var(--fg-3);z-index:6; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notif = inject(NotificationService);

  email = 'admin@wilcam.local';
  password = '';
  loading = signal(false);
  showPwd = signal(false);
  errorMsg = signal('');

  showForgot = signal(false);
  forgotEmail = '';
  forgotLoading = signal(false);
  forgotError = signal('');
  forgotTempPwd = signal('');

  readonly stats = [
    { n: '128', l: 'Cámaras simultáneas' },
    { n: '99.98%', l: 'Uptime garantizado' },
    { n: 'AES-256', l: 'Encriptación' },
  ];

  openForgot(): void {
    this.forgotEmail = this.email;
    this.forgotError.set('');
    this.forgotTempPwd.set('');
    this.showForgot.set(true);
  }

  closeForgot(): void {
    this.showForgot.set(false);
    this.forgotTempPwd.set('');
    this.forgotError.set('');
  }

  submitForgot(): void {
    if (!this.forgotEmail) { this.forgotError.set('Ingresa tu correo.'); return; }
    this.forgotLoading.set(true);
    this.forgotError.set('');
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: res => {
        this.forgotTempPwd.set(res.tempPassword);
        this.forgotLoading.set(false);
      },
      error: err => {
        this.forgotError.set(err?.error?.error || 'No se encontró una cuenta con ese correo.');
        this.forgotLoading.set(false);
      },
    });
  }

  useTempPwd(): void {
    this.email = this.forgotEmail;
    this.password = this.forgotTempPwd();
    this.showForgot.set(false);
    this.forgotTempPwd.set('');
  }

  login(): void {
    if (!this.email || !this.password) {
      this.errorMsg.set('Ingresa tu correo y contraseña.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.error || 'Error de autenticación. Intenta de nuevo.';
        this.errorMsg.set(msg);
      },
    });
  }
}

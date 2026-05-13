import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'wc-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout">
      <wc-sidebar></wc-sidebar>
      <main class="layout-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout { display:flex;height:100vh;overflow:hidden;background:var(--bg-0); }
    .layout-content { flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden; }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private socketService = inject(SocketService);

  ngOnInit(): void { this.socketService.connect(); }
  ngOnDestroy(): void { this.socketService.disconnect(); }
}

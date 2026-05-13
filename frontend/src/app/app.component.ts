import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsComponent } from './shared/components/notifications/notifications.component';

@Component({
  selector: 'wc-root',
  standalone: true,
  imports: [RouterOutlet, NotificationsComponent],
  template: `<router-outlet></router-outlet><wc-notifications></wc-notifications>`,
})
export class AppComponent {}

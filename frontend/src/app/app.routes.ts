import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'live',
        loadComponent: () => import('./pages/live/live.component').then(m => m.LiveComponent),
      },
      {
        path: 'live/:id',
        loadComponent: () => import('./pages/live/live.component').then(m => m.LiveComponent),
      },
      {
        path: 'dvr',
        loadComponent: () => import('./pages/dvr/dvr.component').then(m => m.DvrComponent),
      },
      {
        path: 'events',
        loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent),
      },
      {
        path: 'map',
        loadComponent: () => import('./pages/map/map.component').then(m => m.MapComponent),
      },
      {
        path: 'heatmap',
        loadComponent: () => import('./pages/heatmap/heatmap.component').then(m => m.HeatmapComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraFeedComponent } from '../../shared/components/camera-feed/camera-feed.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { EventsService } from '../../core/services/events.service';
import { CameraEvent } from '../../core/models/event.model';

const PAGE_SIZE = 10;
const SCENE_LIST = ['parking','entrance','office','warehouse','rooftop','hallway','street','reception','loading'] as const;

function sceneFor(cameraId: string): string {
  const code = cameraId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return SCENE_LIST[code % SCENE_LIST.length];
}

function sevFor(type: string): 'live' | 'warn' | 'acc' {
  if (type.includes('Persona')) return 'live';
  if (type.includes('Vehíc') || type.includes('noche') || type.includes('noc')) return 'warn';
  return 'acc';
}

@Component({
  selector: 'wc-events',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, TopbarComponent],
  template: `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0">
      <wc-topbar title="Historial de Eventos" subtitle="REGISTRO · DETECCIONES IA · 30 DÍAS">
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--line-1);border-radius:8px;padding:6px 10px;min-width:220px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" placeholder="Buscar tipo, cámara…"
                 style="background:transparent;border:0;padding:0;flex:1;font-size:12px">
        </div>
        <button class="btn" (click)="exportCsv()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </wc-topbar>

      <!-- Filter bar -->
      <div style="display:flex;gap:10px;padding:14px 24px;border-bottom:1px solid var(--line-1);align-items:center;flex-wrap:wrap">
        @for (btn of dateFilters; track btn.l) {
          <button class="btn" (click)="setDateFilter(btn.l)"
                  [style.background]="activeDateFilter === btn.l ? 'var(--accent-soft)' : 'var(--bg-2)'"
                  [style.color]="activeDateFilter === btn.l ? 'var(--accent-2)' : 'var(--fg-1)'"
                  [style.border-color]="activeDateFilter === btn.l ? 'oklch(0.70 0.21 250 / 0.4)' : 'var(--line-1)'"
                  style="padding:6px 12px;font-size:12px">{{ btn.l }}</button>
        }
        <div style="width:1px;height:22px;background:var(--line-1);margin:0 6px"></div>
        <button class="btn" (click)="setTypeFilter('')"
                [style.background]="activeTypeFilter === '' ? 'var(--accent-soft)' : 'var(--bg-2)'"
                [style.color]="activeTypeFilter === '' ? 'var(--accent-2)' : 'var(--fg-1)'"
                style="padding:4px 10px;font-size:11px">Todos</button>
        @for (t of typeFilters; track t) {
          <button class="btn" (click)="setTypeFilter(t)"
                  [style.background]="activeTypeFilter === t ? 'var(--accent-soft)' : 'var(--bg-2)'"
                  [style.color]="activeTypeFilter === t ? 'var(--accent-2)' : 'var(--fg-1)'"
                  style="padding:4px 10px;font-size:11px">{{ t }}</button>
        }
        <div style="margin-left:auto;font-size:11px;color:var(--fg-3)" class="mono">{{ totalEvents() }} EVENTOS</div>
      </div>

      <div style="flex:1;display:grid;grid-template-columns:1fr 360px;min-height:0">
        <!-- Events list -->
        <div style="overflow:hidden;display:flex;flex-direction:column">
          <div style="overflow:auto;flex:1">
            @if (loading()) {
              <div style="padding:40px;text-align:center;color:var(--fg-3);font-size:12px">Cargando eventos…</div>
            } @else if (filteredEvents().length === 0) {
              <div style="padding:40px;text-align:center;color:var(--fg-3);font-size:12px">No hay eventos para mostrar.</div>
            } @else {
              <table class="evt">
                <thead>
                  <tr>
                    <th style="width:90px">Hora</th>
                    <th style="width:80px">Preview</th>
                    <th>Evento</th>
                    <th>Cámara · Ubicación</th>
                    <th style="width:90px">Confianza</th>
                    <th style="width:100px">Severidad</th>
                    <th style="width:60px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of pagedEvents(); track e.id; let i = $index) {
                    <tr [style.background]="selectedId() === e.id ? 'oklch(0.65 0.25 25 / 0.06)' : 'transparent'"
                        (click)="selectEvent(e)" style="cursor:pointer">
                      <td class="mono" style="color:var(--accent-2)">{{ formatTime(e.created_at) }}</td>
                      <td>
                        <div style="width:64px;height:36px;border-radius:4px;overflow:hidden;border:1px solid var(--line-1)">
                          <wc-camera-feed [scene]="getScene(e.camera_id)" name="" tc="" quality="" status="rec"
                            [feedStyle]="{'width':'100%','height':'100%'}"></wc-camera-feed>
                        </div>
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <span [style.color]="getSev(e.event_type) === 'live' ? 'var(--live)' : getSev(e.event_type) === 'warn' ? 'var(--warn)' : 'var(--accent-2)'">
                            <ng-container [ngSwitch]="getEventIcon(e.event_type)">
                              <svg *ngSwitchCase="'walk'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="4" r="2"/><path d="M5 10l2-3h7.5l2 3"/><path d="M10 10l-1 6h6l-1-6"/></svg>
                              <svg *ngSwitchCase="'car'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="11" width="22" height="8" rx="2"/><path d="M5 11V7l2-4h10l2 4v4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>
                              <svg *ngSwitchCase="'pkg'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                              <svg *ngSwitchDefault width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            </ng-container>
                          </span>
                          <span style="font-weight:500">{{ e.event_type }}</span>
                          @if (e.reviewed) {
                            <span class="chip ok" style="font-size:9px;padding:1px 5px">✓</span>
                          }
                        </div>
                      </td>
                      <td style="color:var(--fg-2)">
                        <span class="mono" style="color:var(--fg-1)">{{ (e.camera_name || e.camera_id).toUpperCase() }}</span>
                        @if (e.location) { <span style="color:var(--fg-3)"> · {{ e.location }}</span> }
                      </td>
                      <td>
                        @if (e.confidence) {
                          <div style="display:flex;align-items:center;gap:8px">
                            <div style="width:50px;height:4px;background:var(--bg-3);border-radius:999px;overflow:hidden">
                              <div [style.width]="e.confidence + '%'" [style.background]="e.confidence > 90 ? 'var(--ok)' : 'var(--accent-2)'"
                                   style="height:100%;border-radius:999px"></div>
                            </div>
                            <span class="mono" style="font-size:11px">{{ e.confidence }}%</span>
                          </div>
                        } @else {
                          <span class="mono" style="color:var(--fg-3)">—</span>
                        }
                      </td>
                      <td>
                        <span class="chip" [class]="getSev(e.event_type)" style="padding:2px 8px;font-size:10px">
                          {{ getSev(e.event_type) === 'live' ? 'CRÍTICO' : getSev(e.event_type) === 'warn' ? 'MEDIO' : 'INFO' }}
                        </span>
                      </td>
                      <td>
                        @if (e.clip_path) {
                          <button class="btn ghost" style="padding:4px 8px;font-size:11px" (click)="openClip(e); $event.stopPropagation()">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            Clip
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <!-- Pagination -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line-1)">
            <div style="font-size:11px;color:var(--fg-3)">
              Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ totalEvents() }} eventos
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn icon ghost" style="width:28px;height:28px" (click)="prevPage()" [disabled]="currentPage() === 0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              @for (p of pageNumbers(); track p) {
                <button class="btn mono"
                        (click)="goToPage(p)"
                        [style.background]="p === currentPage() ? 'var(--accent-soft)' : 'var(--bg-2)'"
                        [style.color]="p === currentPage() ? 'var(--accent-2)' : 'var(--fg-2)'"
                        style="padding:6px 10px;font-size:11px;min-width:28px;justify-content:center">{{ p + 1 }}</button>
              }
              <button class="btn icon ghost" style="width:28px;height:28px" (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT — event detail -->
        <div style="border-left:1px solid var(--line-1);background:oklch(0.14 0.012 245 / 0.5);display:flex;flex-direction:column;overflow:auto">
          @if (selectedEvent()) {
            <div style="padding:14px 20px;border-bottom:1px solid var(--line-1)">
              <div class="mono" style="font-size:10px;letter-spacing:0.14em;color:var(--fg-3);margin-bottom:4px">EVENTO SELECCIONADO</div>
              <div style="font-size:14px;font-weight:600">{{ selectedEvent()!.event_type }}</div>
              <div class="mono" style="font-size:11px;color:var(--accent-2);margin-top:4px">
                {{ formatDate(selectedEvent()!.created_at) }} · {{ (selectedEvent()!.camera_name || selectedEvent()!.camera_id).toUpperCase() }}
              </div>
            </div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
              <wc-camera-feed [scene]="getScene(selectedEvent()!.camera_id)" name="" status="rec" quality="4K" tc=""
                [feedStyle]="{'width':'100%','aspect-ratio':'16/9','border-radius':'8px'}"></wc-camera-feed>

              <!-- AI detection panel -->
              @if (selectedEvent()!.confidence) {
                <div class="panel" style="padding:12px">
                  <div class="mono" style="font-size:9px;color:var(--fg-3);letter-spacing:0.14em;margin-bottom:8px">DETECCIÓN IA</div>
                  <div style="display:flex;flex-direction:column;gap:6px;font-size:11px">
                    <div style="display:flex;justify-content:space-between">
                      <span style="color:var(--fg-3)">Clasificación</span>
                      <span class="mono">{{ selectedEvent()!.event_type }}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                      <span style="color:var(--fg-3)">Confianza</span>
                      <span class="mono">{{ selectedEvent()!.confidence }}%</span>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                      <span style="color:var(--fg-3)">Fecha/Hora</span>
                      <span class="mono">{{ formatDate(selectedEvent()!.created_at) }}</span>
                    </div>
                  </div>
                </div>
              }

              <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--fg-2)">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer" (click)="toggleReviewed()">
                  <span class="switch" [class.on]="selectedEvent()!.reviewed === 1"></span>
                  Marcar como revisado
                  @if (savingReviewed()) { <span style="font-size:10px;color:var(--fg-3)">Guardando…</span> }
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer" (click)="toggleFalsePositive()">
                  <span class="switch" [class.on]="selectedEvent()!.false_positive === 1"></span>
                  Falso positivo
                  @if (savingFp()) { <span style="font-size:10px;color:var(--fg-3)">Guardando…</span> }
                </label>
              </div>
            </div>
          } @else {
            <div style="padding:40px;text-align:center;color:var(--fg-3);font-size:12px">
              Selecciona un evento para ver los detalles.
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class EventsComponent implements OnInit {
  private eventsService = inject(EventsService);

  loading = signal(false);
  allEvents = signal<CameraEvent[]>([]);
  selectedId = signal<string | null>(null);
  currentPage = signal(0);
  searchQuery = '';
  activeDateFilter = 'Hoy';
  activeTypeFilter = '';
  savingReviewed = signal(false);
  savingFp = signal(false);

  readonly dateFilters = [{ l: 'Hoy' }, { l: 'Últimos 7d' }, { l: '30d' }];
  readonly typeFilters = ['Persona', 'Vehículo', 'Paquete', 'Animal', 'Movimiento'];

  filteredEvents = computed(() => {
    let list = this.allEvents();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(e =>
        e.event_type.toLowerCase().includes(q) ||
        (e.camera_name || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
      );
    }
    if (this.activeTypeFilter) {
      list = list.filter(e => e.event_type.toLowerCase().includes(this.activeTypeFilter.toLowerCase()));
    }
    return list;
  });

  totalEvents = computed(() => this.filteredEvents().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalEvents() / PAGE_SIZE)));
  pagedEvents = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filteredEvents().slice(start, start + PAGE_SIZE);
  });
  pageStart = computed(() => this.totalEvents() === 0 ? 0 : this.currentPage() * PAGE_SIZE + 1);
  pageEnd = computed(() => Math.min((this.currentPage() + 1) * PAGE_SIZE, this.totalEvents()));
  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: Math.min(total, 5) }, (_, i) => i);
  });

  selectedEvent = computed(() => {
    const id = this.selectedId();
    return id ? this.allEvents().find(e => e.id === id) ?? null : null;
  });

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    const filters: { limit: number; date?: string } = { limit: 200 };
    if (this.activeDateFilter === 'Hoy') {
      filters.date = new Date().toISOString().slice(0, 10);
    }
    this.eventsService.getEvents(filters).subscribe({
      next: events => { this.allEvents.set(events); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setDateFilter(label: string): void {
    this.activeDateFilter = label;
    this.currentPage.set(0);
    this.loadEvents();
  }

  setTypeFilter(type: string): void {
    this.activeTypeFilter = type;
    this.currentPage.set(0);
  }

  onSearch(): void { this.currentPage.set(0); }

  selectEvent(e: CameraEvent): void { this.selectedId.set(e.id); }

  prevPage(): void { if (this.currentPage() > 0) this.currentPage.update(p => p - 1); }
  nextPage(): void { if (this.currentPage() < this.totalPages() - 1) this.currentPage.update(p => p + 1); }
  goToPage(p: number): void { this.currentPage.set(p); }

  toggleReviewed(): void {
    const e = this.selectedEvent();
    if (!e) return;
    const newVal = e.reviewed ? 0 : 1;
    this.savingReviewed.set(true);
    this.eventsService.markReviewed(e.id, !!newVal).subscribe({
      next: updated => {
        this.allEvents.update(list => list.map(ev => ev.id === updated.id ? updated : ev));
        this.savingReviewed.set(false);
      },
      error: () => this.savingReviewed.set(false),
    });
  }

  toggleFalsePositive(): void {
    const e = this.selectedEvent();
    if (!e) return;
    const newVal = e.false_positive ? 0 : 1;
    this.savingFp.set(true);
    this.eventsService.markFalsePositive(e.id, !!newVal).subscribe({
      next: updated => {
        this.allEvents.update(list => list.map(ev => ev.id === updated.id ? updated : ev));
        this.savingFp.set(false);
      },
      error: () => this.savingFp.set(false),
    });
  }

  exportCsv(): void {
    const events = this.filteredEvents();
    if (!events.length) return;
    const header = 'ID,Tipo,Cámara,Ubicación,Confianza,Revisado,Falso Positivo,Fecha';
    const rows = events.map(e => [
      e.id,
      `"${e.event_type}"`,
      `"${e.camera_name || e.camera_id}"`,
      `"${e.location || ''}"`,
      e.confidence ?? '',
      e.reviewed ? 'Sí' : 'No',
      e.false_positive ? 'Sí' : 'No',
      `"${this.formatDate(e.created_at)}"`,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wilcam_eventos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openClip(e: CameraEvent): void {
    if (e.clip_path) window.open(e.clip_path, '_blank');
  }

  getScene(cameraId: string): string { return sceneFor(cameraId); }
  getSev(type: string): 'live' | 'warn' | 'acc' { return sevFor(type); }

  getEventIcon(type: string): string {
    if (type.includes('Persona')) return 'walk';
    if (type.includes('Vehícu')) return 'car';
    if (type.includes('Paquete')) return 'pkg';
    return 'zap';
  }

  formatTime(iso: string): string {
    try { return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return iso; }
  }

  formatDate(iso: string): string {
    try { return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
  }
}

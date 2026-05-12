export interface CameraEvent {
  id: string;
  camera_id: string;
  camera_name?: string;
  location?: string;
  event_type: 'Persona' | 'Vehículo' | 'Paquete' | 'Animal' | 'Movimiento' | string;
  confidence?: number;
  snapshot_path?: string;
  clip_path?: string;
  metadata?: Record<string, unknown>;
  reviewed: 0 | 1;
  false_positive: 0 | 1;
  created_at: string;
}

export interface EventStats {
  today: number;
  unreviewed: number;
  byType: Array<{ event_type: string; count: number }>;
}

export interface Recording {
  id: string;
  camera_id: string;
  filename: string;
  path: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  size_bytes?: number;
  has_motion: 0 | 1;
  created_at: string;
}

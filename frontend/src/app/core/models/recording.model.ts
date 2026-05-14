export interface Recording {
  id: string;
  camera_id: string;
  camera_name?: string;
  filename: string;
  filepath: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  size_bytes?: number;
  has_motion: 0 | 1;
  cloud_uploaded?: 0 | 1;
  created_at: string;
}

export interface RecordingFile {
  filename: string;
  url: string;
  startTime: string; // ISO string
  sizeBytes: number;
  date: string; // YYYYMMDD
}

export interface RecordingsPage {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

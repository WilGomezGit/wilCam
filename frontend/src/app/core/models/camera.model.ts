export interface Camera {
  id: string;
  name: string;
  location: string;
  group_name: string;
  rtsp_url: string;
  onvif_host?: string;
  onvif_port?: number;
  username?: string;
  password?: string;
  resolution: string;
  fps: number;
  codec: string;
  recording_enabled: 0 | 1;
  ai_enabled: 0 | 1;
  ptz_enabled: 0 | 1;
  ptz_protocol?: 'auto' | 'cgi' | 'cgi_param' | 'onvif';
  status: 'online' | 'offline';
  streaming?: boolean;
  recording?: boolean;
  hlsUrl?: string;
  created_at?: string;
  updated_at?: string;
}

export type CameraScene =
  | 'parking' | 'entrance' | 'hallway' | 'office'
  | 'warehouse' | 'street' | 'reception' | 'loading' | 'rooftop';

export interface StreamStatus {
  cameraId: string;
  streaming: boolean;
  hlsUrl: string | null;
  ts: number;
}

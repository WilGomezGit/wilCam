import 'package:json_annotation/json_annotation.dart';

part 'camera.g.dart';

@JsonSerializable()
class Camera {
  final String id;
  final String name;
  final String location;
  @JsonKey(name: 'group_name')
  final String groupName;
  @JsonKey(name: 'rtsp_url')
  final String rtspUrl;
  final String status;
  final String resolution;
  final int fps;
  @JsonKey(name: 'recording_enabled')
  final int recordingEnabled;
  @JsonKey(name: 'ai_enabled')
  final int aiEnabled;
  @JsonKey(name: 'ptz_enabled')
  final int ptzEnabled;

  const Camera({
    required this.id,
    required this.name,
    required this.location,
    required this.groupName,
    required this.rtspUrl,
    required this.status,
    required this.resolution,
    required this.fps,
    required this.recordingEnabled,
    required this.aiEnabled,
    required this.ptzEnabled,
  });

  bool get isOnline => status == 'online' || status == 'recording';
  bool get isRecording => status == 'recording';
  bool get hasPtz => ptzEnabled == 1;
  bool get hasAI => aiEnabled == 1;

  String get hlsUrl => '/hls/$id/stream.m3u8';

  factory Camera.fromJson(Map<String, dynamic> json) => _$CameraFromJson(json);
  Map<String, dynamic> toJson() => _$CameraToJson(this);
}

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'camera.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Camera _$CameraFromJson(Map<String, dynamic> json) => Camera(
      id: json['id'] as String,
      name: json['name'] as String,
      location: json['location'] as String,
      groupName: json['group_name'] as String,
      rtspUrl: json['rtsp_url'] as String,
      status: json['status'] as String,
      resolution: json['resolution'] as String,
      fps: (json['fps'] as num).toInt(),
      recordingEnabled: (json['recording_enabled'] as num).toInt(),
      aiEnabled: (json['ai_enabled'] as num).toInt(),
      ptzEnabled: (json['ptz_enabled'] as num).toInt(),
    );

Map<String, dynamic> _$CameraToJson(Camera instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'location': instance.location,
      'group_name': instance.groupName,
      'rtsp_url': instance.rtspUrl,
      'status': instance.status,
      'resolution': instance.resolution,
      'fps': instance.fps,
      'recording_enabled': instance.recordingEnabled,
      'ai_enabled': instance.aiEnabled,
      'ptz_enabled': instance.ptzEnabled,
    };

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _storage = FlutterSecureStorage();

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  late final Dio _dio;
  String? _baseUrl;

  ApiService() {
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Try token refresh
          try {
            await _refreshToken();
            final token = await _storage.read(key: 'access_token');
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $token';
            final response = await _dio.fetch(opts);
            return handler.resolve(response);
          } catch (_) {
            await logout();
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<void> configure(String serverUrl) async {
    _baseUrl = serverUrl.trimRight().replaceAll(RegExp(r'/$'), '');
    await _storage.write(key: 'server_url', value: _baseUrl);
    _dio.options.baseUrl = '$_baseUrl/api';
  }

  Future<void> loadSavedUrl() async {
    final saved = await _storage.read(key: 'server_url');
    if (saved != null) {
      _baseUrl = saved;
      _dio.options.baseUrl = '$saved/api';
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final resp = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    final data = resp.data as Map<String, dynamic>;
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'refresh_token', value: data['refreshToken']);
    return data;
  }

  Future<void> logout() async {
    try {
      final token = await _storage.read(key: 'refresh_token');
      if (token != null) await _dio.post('/auth/logout', data: {'refreshToken': token});
    } catch (_) {}
    await _storage.deleteAll();
  }

  Future<void> _refreshToken() async {
    final token = await _storage.read(key: 'refresh_token');
    if (token == null) throw Exception('No refresh token');
    final resp = await _dio.post('/auth/refresh', data: {'refreshToken': token});
    final data = resp.data as Map<String, dynamic>;
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'refresh_token', value: data['refreshToken']);
  }

  // ── Cameras ────────────────────────────────────────────────────────────
  Future<List<dynamic>> getCameras() async {
    final resp = await _dio.get('/cameras');
    return resp.data as List;
  }

  Future<Map<String, dynamic>> getCameraStream(String cameraId) async {
    final resp = await _dio.get('/streams/$cameraId/status');
    return resp.data as Map<String, dynamic>;
  }

  Future<void> startStream(String cameraId) =>
      _dio.post('/streams/$cameraId/start');

  Future<String> captureSnapshot(String cameraId) async {
    final resp = await _dio.post('/streams/$cameraId/snapshot');
    return resp.data['path'] as String;
  }

  // ── PTZ ────────────────────────────────────────────────────────────────
  Future<void> ptzMove(String cameraId, String action, double speed) =>
      _dio.post('/ptz/$cameraId/$action', data: {'speed': speed});

  // ── Events ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getEvents({
    String? cameraId,
    String? eventType,
    int limit = 50,
    int offset = 0,
  }) async {
    final resp = await _dio.get('/events', queryParameters: {
      if (cameraId != null) 'camera_id': cameraId,
      if (eventType != null) 'type': eventType,
      'limit': limit,
      'offset': offset,
    });
    return resp.data as Map<String, dynamic>;
  }

  // ── Analytics ──────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getAnalyticsOverview({String period = '7d'}) async {
    final resp = await _dio.get('/analytics/overview', queryParameters: {'period': period});
    return resp.data as Map<String, dynamic>;
  }

  // ── Notifications ──────────────────────────────────────────────────────
  Future<void> registerPushToken(String token, String platform) =>
      _dio.post('/notifications/register', data: {'token': token, 'platform': platform});

  // ── Saved server URL ───────────────────────────────────────────────────
  Future<String?> getSavedServerUrl() => _storage.read(key: 'server_url');
  Future<String?> getAccessToken() => _storage.read(key: 'access_token');

  String hlsUrl(String cameraId) => '$_baseUrl/hls/$cameraId/stream.m3u8';
  String snapshotUrl(String path) => '$_baseUrl$path';
}

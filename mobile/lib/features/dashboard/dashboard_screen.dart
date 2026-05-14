import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/services/api_service.dart';
import '../../core/theme.dart';
import '../../core/models/camera.dart';

final camerasProvider = FutureProvider<List<Camera>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.getCameras();
  return data.map((e) => Camera.fromJson(e as Map<String, dynamic>)).toList();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cameras = ref.watch(camerasProvider);

    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      appBar: AppBar(
        title: const Text('WilCam', style: TextStyle(fontFamily: 'SpaceGrotesk', fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(camerasProvider),
          ),
        ],
      ),
      body: cameras.when(
        loading: () => const Center(child: CircularProgressIndicator(color: WilCamTheme.accent)),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, color: WilCamTheme.danger, size: 48),
            const SizedBox(height: 12),
            Text('Error: $e', style: const TextStyle(color: WilCamTheme.danger)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => ref.invalidate(camerasProvider), child: const Text('Reintentar')),
          ]),
        ),
        data: (cams) => _CameraGrid(cameras: cams),
      ),
    );
  }
}

class _CameraGrid extends ConsumerWidget {
  final List<Camera> cameras;
  const _CameraGrid({required this.cameras});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = cameras.where((c) => c.isOnline).length;

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          sliver: SliverToBoxAdapter(
            child: Row(children: [
              _statChip(Icons.videocam_rounded, '${cameras.length}', 'Total', WilCamTheme.fg3),
              const SizedBox(width: 8),
              _statChip(Icons.circle, '$online', 'Online', WilCamTheme.ok),
              const SizedBox(width: 8),
              _statChip(Icons.circle, '${cameras.length - online}', 'Offline', WilCamTheme.danger),
            ]),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 16 / 11,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, i) => _CameraCard(camera: cameras[i]),
              childCount: cameras.length,
            ),
          ),
        ),
      ],
    );
  }

  Widget _statChip(IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: WilCamTheme.bg2,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'JetBrainsMono')),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: WilCamTheme.fg3, fontSize: 11)),
        ]),
      ),
    );
  }
}

class _CameraCard extends StatelessWidget {
  final Camera camera;
  const _CameraCard({required this.camera});

  @override
  Widget build(BuildContext context) {
    final color = camera.isOnline ? WilCamTheme.ok : WilCamTheme.danger;

    return GestureDetector(
      onTap: () => context.go('/live/${camera.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: WilCamTheme.bg2,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: camera.isOnline ? WilCamTheme.ok.withOpacity(0.3) : WilCamTheme.bg3),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                child: Stack(fit: StackFit.expand, children: [
                  Container(color: WilCamTheme.bg3),
                  Center(child: Icon(Icons.videocam_rounded, color: WilCamTheme.bg4, size: 40)),
                  Positioned(
                    top: 8, right: 8,
                    child: Container(
                      width: 8, height: 8,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    ),
                  ),
                  if (camera.isRecording)
                    const Positioned(
                      top: 8, left: 8,
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        child: Text('REC', style: TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.live, fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                    ),
                ]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(camera.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: WilCamTheme.fg0), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(camera.location, style: const TextStyle(fontSize: 10, color: WilCamTheme.fg3), maxLines: 1, overflow: TextOverflow.ellipsis),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

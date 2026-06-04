import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import '../../core/services/api_service.dart';
import '../../core/theme.dart';

class LiveScreen extends ConsumerStatefulWidget {
  final String cameraId;
  const LiveScreen({super.key, required this.cameraId});

  @override
  ConsumerState<LiveScreen> createState() => _LiveScreenState();
}

class _LiveScreenState extends ConsumerState<LiveScreen> {
  VideoPlayerController? _vpCtrl;
  ChewieController? _chewieCtrl;
  bool _loading = true;
  String? _error;
  bool _showPtz = false;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiServiceProvider);
      final hlsUrl = api.hlsUrl(widget.cameraId);

      _vpCtrl = VideoPlayerController.networkUrl(Uri.parse(hlsUrl));
      await _vpCtrl!.initialize();

      _chewieCtrl = ChewieController(
        videoPlayerController: _vpCtrl!,
        autoPlay: true,
        looping: true,
        aspectRatio: 16 / 9,
        allowFullScreen: true,
        allowMuting: true,
        showControls: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: WilCamTheme.accent,
          handleColor: WilCamTheme.accent,
          backgroundColor: WilCamTheme.bg3,
          bufferedColor: WilCamTheme.bg4,
        ),
      );

      if (mounted) setState(() => _loading = false);
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  void dispose() {
    _chewieCtrl?.dispose();
    _vpCtrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: Icon(_showPtz ? Icons.gamepad_rounded : Icons.gamepad_outlined, color: WilCamTheme.accent),
            onPressed: () => setState(() => _showPtz = !_showPtz),
            tooltip: 'PTZ Control',
          ),
          IconButton(
            icon: const Icon(Icons.camera_alt_rounded, color: WilCamTheme.fg2),
            onPressed: () => ref.read(apiServiceProvider).captureSnapshot(widget.cameraId),
            tooltip: 'Capturar snapshot',
          ),
        ],
      ),
      body: Column(
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: WilCamTheme.accent))
                : _error != null
                    ? _ErrorView(error: _error!, onRetry: _initPlayer)
                    : Chewie(controller: _chewieCtrl!),
          ),
          if (_showPtz) _PtzOverlay(cameraId: widget.cameraId),
          const Spacer(),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: WilCamTheme.bg1,
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.videocam_off_rounded, color: WilCamTheme.fg3, size: 48),
          const SizedBox(height: 12),
          const Text('Stream no disponible', style: TextStyle(color: WilCamTheme.fg2)),
          const SizedBox(height: 8),
          Text(error, style: const TextStyle(color: WilCamTheme.fg3, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ]),
      ),
    );
  }
}

class _PtzOverlay extends ConsumerWidget {
  final String cameraId;
  const _PtzOverlay({required this.cameraId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      color: WilCamTheme.bg1.withOpacity(0.95),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.gamepad_rounded, color: WilCamTheme.accent, size: 16),
            const SizedBox(width: 8),
            const Text('Control PTZ', style: TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.accent, fontSize: 12)),
          ]),
          const SizedBox(height: 12),
          _PtzGrid(cameraId: cameraId),
        ],
      ),
    );
  }
}

class _PtzGrid extends ConsumerWidget {
  final String cameraId;
  const _PtzGrid({required this.cameraId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.read(apiServiceProvider);

    Widget btn(String action, IconData icon) => GestureDetector(
      onTapDown: (_) => api.ptzMove(cameraId, action, 0.5),
      onTapUp: (_) => api.ptzMove(cameraId, 'stop', 0),
      onTapCancel: () => api.ptzMove(cameraId, 'stop', 0),
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
          color: WilCamTheme.bg3,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: WilCamTheme.bg4),
        ),
        child: Icon(icon, color: WilCamTheme.fg1, size: 20),
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          btn('up-left', Icons.north_west),
          const SizedBox(width: 4),
          btn('up', Icons.north),
          const SizedBox(width: 4),
          btn('up-right', Icons.north_east),
        ]),
        const SizedBox(height: 4),
        Row(mainAxisSize: MainAxisSize.min, children: [
          btn('left', Icons.west),
          const SizedBox(width: 4),
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: WilCamTheme.bg3, borderRadius: BorderRadius.circular(8)),
            child: const Center(child: Text('PTZ', style: TextStyle(fontFamily: 'JetBrainsMono', fontSize: 10, color: WilCamTheme.accent))),
          ),
          const SizedBox(width: 4),
          btn('right', Icons.east),
        ]),
        const SizedBox(height: 4),
        Row(mainAxisSize: MainAxisSize.min, children: [
          btn('down-left', Icons.south_west),
          const SizedBox(width: 4),
          btn('down', Icons.south),
          const SizedBox(width: 4),
          btn('down-right', Icons.south_east),
        ]),
        const SizedBox(height: 12),
        Row(mainAxisSize: MainAxisSize.min, children: [
          btn('zoom-in', Icons.zoom_in),
          const SizedBox(width: 8),
          btn('zoom-out', Icons.zoom_out),
        ]),
      ],
    );
  }
}

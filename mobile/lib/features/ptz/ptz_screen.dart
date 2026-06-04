import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/api_service.dart';
import '../../core/theme.dart';

class PtzScreen extends ConsumerStatefulWidget {
  final String cameraId;
  const PtzScreen({super.key, required this.cameraId});

  @override
  ConsumerState<PtzScreen> createState() => _PtzScreenState();
}

class _PtzScreenState extends ConsumerState<PtzScreen> {
  double _speed = 0.5;
  double _zoom = 1.0;

  void _move(String action) {
    ref.read(apiServiceProvider).ptzMove(widget.cameraId, action, _speed);
    if (action == 'zoom-in') setState(() => _zoom = (_zoom + 0.1).clamp(1, 10));
    if (action == 'zoom-out') setState(() => _zoom = (_zoom - 0.1).clamp(1, 10));
  }

  void _stop() {
    ref.read(apiServiceProvider).ptzMove(widget.cameraId, 'stop', 0);
  }

  Widget _btn(String action, IconData icon, {double size = 52}) {
    return GestureDetector(
      onTapDown: (_) => _move(action),
      onTapUp: (_) => _stop(),
      onTapCancel: _stop,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          color: WilCamTheme.bg3,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WilCamTheme.bg4),
          boxShadow: [BoxShadow(color: WilCamTheme.accent.withOpacity(0.08), blurRadius: 8)],
        ),
        child: Icon(icon, color: WilCamTheme.fg1, size: size * 0.4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      appBar: AppBar(
        title: const Text('Control PTZ'),
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.pop()),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Direction grid
            Column(children: [
              Row(mainAxisSize: MainAxisSize.min, children: [
                _btn('up-left', Icons.north_west), const SizedBox(width: 8),
                _btn('up', Icons.north), const SizedBox(width: 8),
                _btn('up-right', Icons.north_east),
              ]),
              const SizedBox(height: 8),
              Row(mainAxisSize: MainAxisSize.min, children: [
                _btn('left', Icons.west), const SizedBox(width: 8),
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    color: WilCamTheme.bg2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: WilCamTheme.accent.withOpacity(0.4)),
                  ),
                  child: const Center(child: Text('PTZ', style: TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.accent, fontSize: 11))),
                ),
                const SizedBox(width: 8),
                _btn('right', Icons.east),
              ]),
              const SizedBox(height: 8),
              Row(mainAxisSize: MainAxisSize.min, children: [
                _btn('down-left', Icons.south_west), const SizedBox(width: 8),
                _btn('down', Icons.south), const SizedBox(width: 8),
                _btn('down-right', Icons.south_east),
              ]),
            ]),

            const SizedBox(height: 32),

            // Zoom
            Row(mainAxisSize: MainAxisSize.min, children: [
              _btn('zoom-in', Icons.add, size: 44),
              const SizedBox(width: 16),
              Text('x${_zoom.toStringAsFixed(1)}', style: const TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.accent, fontSize: 18)),
              const SizedBox(width: 16),
              _btn('zoom-out', Icons.remove, size: 44),
            ]),

            const SizedBox(height: 32),

            // Speed
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Row(children: [
                const Text('VEL', style: TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.fg3, fontSize: 11)),
                Expanded(
                  child: Slider(
                    value: _speed,
                    min: 0.1, max: 1.0, divisions: 9,
                    activeColor: WilCamTheme.accent,
                    inactiveColor: WilCamTheme.bg3,
                    onChanged: (v) => setState(() => _speed = v),
                  ),
                ),
                Text(_speed.toStringAsFixed(1), style: const TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.fg2, fontSize: 12)),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

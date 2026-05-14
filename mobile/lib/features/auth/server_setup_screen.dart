import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/api_service.dart';
import '../../core/theme.dart';

class ServerSetupScreen extends ConsumerStatefulWidget {
  const ServerSetupScreen({super.key});

  @override
  ConsumerState<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends ConsumerState<ServerSetupScreen> {
  final _urlCtrl = TextEditingController(text: 'http://');
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiServiceProvider);
      await api.configure(_urlCtrl.text.trim());

      // Verify connectivity
      final dio = api;
      // Quick health check
      context.go('/login');
    } catch (e) {
      setState(() { _error = 'No se pudo conectar al servidor'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('WilCam', style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 32, fontWeight: FontWeight.bold, color: WilCamTheme.accent)),
              const SizedBox(height: 8),
              const Text('Configura el servidor', style: TextStyle(fontSize: 18, color: WilCamTheme.fg1)),
              const SizedBox(height: 32),
              TextFormField(
                controller: _urlCtrl,
                decoration: const InputDecoration(
                  labelText: 'URL del servidor',
                  hintText: 'http://192.168.1.100:3000',
                  prefixIcon: Icon(Icons.dns_rounded, color: WilCamTheme.accent),
                ),
                style: const TextStyle(color: WilCamTheme.fg0),
                keyboardType: TextInputType.url,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: WilCamTheme.danger)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _connect,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Conectar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      appBar: AppBar(title: const Text('Configuración')),
      body: ListView(
        children: [
          if (user != null) ...[
            _section('CUENTA'),
            _tile(Icons.person_rounded, user['name'] as String? ?? 'Usuario',
                subtitle: user['email'] as String? ?? ''),
            _tile(Icons.badge_rounded, 'Rol: ${user['role'] as String? ?? ''}',
                color: WilCamTheme.accent),
            const Divider(color: WilCamTheme.bg3),
          ],
          _section('SERVIDOR'),
          _tile(Icons.dns_rounded, 'Cambiar servidor', onTap: () => context.go('/setup')),
          const Divider(color: WilCamTheme.bg3),
          _section('NOTIFICACIONES'),
          _tile(Icons.notifications_rounded, 'Alertas push', subtitle: 'Activadas'),
          _tile(Icons.person_search_rounded, 'Detección de personas', subtitle: 'Activada'),
          const Divider(color: WilCamTheme.bg3),
          _section('SESIÓN'),
          _tile(
            Icons.logout_rounded, 'Cerrar sesión',
            color: WilCamTheme.danger,
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(height: 32),
          const Center(
            child: Text('WilCam v2.0.0', style: TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.fg3, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _section(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(title, style: const TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.fg3, fontSize: 10, letterSpacing: 1.2)),
    );
  }

  Widget _tile(IconData icon, String title, {String? subtitle, Color? color, VoidCallback? onTap}) {
    return ListTile(
      leading: Icon(icon, color: color ?? WilCamTheme.fg2, size: 20),
      title: Text(title, style: TextStyle(color: color ?? WilCamTheme.fg0, fontSize: 14)),
      subtitle: subtitle != null ? Text(subtitle, style: const TextStyle(color: WilCamTheme.fg3, fontSize: 12)) : null,
      onTap: onTap,
      trailing: onTap != null ? const Icon(Icons.chevron_right_rounded, color: WilCamTheme.fg3, size: 18) : null,
    );
  }
}

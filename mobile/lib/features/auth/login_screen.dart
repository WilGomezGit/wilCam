import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/notification_service.dart';
import '../../core/services/api_service.dart';
import '../../core/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'admin@wilcam.local');
  final _pwdCtrl = TextEditingController(text: 'admin123');
  bool _obscurePwd = true;
  final _localAuth = LocalAuthentication();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _pwdCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final ok = await ref.read(authProvider.notifier).login(_emailCtrl.text.trim(), _pwdCtrl.text);
    if (ok && mounted) {
      // Register push token after login
      final token = await NotificationService.getToken();
      if (token != null) {
        try {
          await ref.read(apiServiceProvider).registerPushToken(token, 'android');
        } catch (_) {}
      }
      context.go('/dashboard');
    }
  }

  Future<void> _biometricLogin() async {
    try {
      final canAuth = await _localAuth.canCheckBiometrics;
      if (!canAuth) return;
      final ok = await _localAuth.authenticate(
        localizedReason: 'Autentícate para acceder a WilCam',
        options: const AuthenticationOptions(stickyAuth: true),
      );
      if (ok && mounted) context.go('/dashboard');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final loading = authState.loading;
    final error = authState.error;

    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              Row(children: [
                Container(width: 4, height: 40, color: WilCamTheme.accent),
                const SizedBox(width: 12),
                const Text('WilCam', style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 36, fontWeight: FontWeight.bold, color: WilCamTheme.fg0)),
              ]),
              const SizedBox(height: 8),
              const Text('Plataforma de vigilancia IA', style: TextStyle(color: WilCamTheme.fg3, fontSize: 14)),
              const SizedBox(height: 48),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.person_rounded, color: WilCamTheme.accent),
                ),
                style: const TextStyle(color: WilCamTheme.fg0),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _pwdCtrl,
                obscureText: _obscurePwd,
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: const Icon(Icons.lock_rounded, color: WilCamTheme.accent),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePwd ? Icons.visibility_rounded : Icons.visibility_off_rounded, color: WilCamTheme.fg3),
                    onPressed: () => setState(() => _obscurePwd = !_obscurePwd),
                  ),
                ),
                style: const TextStyle(color: WilCamTheme.fg0),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(error, style: const TextStyle(color: WilCamTheme.danger, fontSize: 13)),
              ],
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: loading ? null : _login,
                  child: loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: WilCamTheme.bg0))
                      : const Text('Iniciar sesión', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton.icon(
                  onPressed: _biometricLogin,
                  icon: const Icon(Icons.fingerprint_rounded, color: WilCamTheme.accent),
                  label: const Text('Autenticación biométrica', style: TextStyle(color: WilCamTheme.accent)),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/setup'),
                  child: const Text('Cambiar servidor', style: TextStyle(color: WilCamTheme.fg3, fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

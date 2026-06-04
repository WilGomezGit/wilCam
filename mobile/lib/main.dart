import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/services/notification_service.dart';
import 'core/router.dart';
import 'core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase (graceful — doesn't crash if not configured)
  try {
    await Firebase.initializeApp();
    await NotificationService.initialize();
  } catch (_) {}

  runApp(const ProviderScope(child: WilCamApp()));
}

class WilCamApp extends ConsumerWidget {
  const WilCamApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'WilCam',
      theme: WilCamTheme.dark(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

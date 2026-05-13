import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/server_setup_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/live/live_screen.dart';
import '../features/events/events_screen.dart';
import '../features/ptz/ptz_screen.dart';
import '../features/settings/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final isAuth = ref.watch(isAuthenticatedProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      if (!isAuth && state.matchedLocation != '/login' && state.matchedLocation != '/setup') {
        return '/login';
      }
      if (isAuth && state.matchedLocation == '/login') {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/setup', builder: (c, s) => const ServerSetupScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (c, s) => const DashboardScreen()),
          GoRoute(path: '/live/:cameraId', builder: (c, s) => LiveScreen(cameraId: s.pathParameters['cameraId']!)),
          GoRoute(path: '/events', builder: (c, s) => const EventsScreen()),
          GoRoute(path: '/ptz/:cameraId', builder: (c, s) => PtzScreen(cameraId: s.pathParameters['cameraId']!)),
          GoRoute(path: '/settings', builder: (c, s) => const SettingsScreen()),
        ],
      ),
    ],
  );
});

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _navIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx < 0 ? 0 : idx,
        onDestinationSelected: (i) {
          switch (i) {
            case 0: context.go('/dashboard');
            case 1: context.go('/events');
            case 2: context.go('/settings');
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Cámaras'),
          NavigationDestination(icon: Icon(Icons.notifications_rounded), label: 'Eventos'),
          NavigationDestination(icon: Icon(Icons.settings_rounded), label: 'Config'),
        ],
      ),
    );
  }

  int _navIndex(String location) {
    if (location.startsWith('/dashboard') || location.startsWith('/live')) return 0;
    if (location.startsWith('/events')) return 1;
    if (location.startsWith('/settings')) return 2;
    return -1;
  }
}

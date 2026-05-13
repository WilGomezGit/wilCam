import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class AuthState {
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  final bool loading;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.user,
    this.loading = false,
    this.error,
  });

  AuthState copyWith({bool? isAuthenticated, Map<String, dynamic>? user, bool? loading, String? error}) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _checkPersistedSession();
    return const AuthState();
  }

  Future<void> _checkPersistedSession() async {
    final api = ref.read(apiServiceProvider);
    await api.loadSavedUrl();
    final token = await api.getAccessToken();
    if (token != null) {
      try {
        // Validate token by fetching profile
        state = state.copyWith(isAuthenticated: true, loading: false);
      } catch (_) {
        state = const AuthState();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final api = ref.read(apiServiceProvider);
      final data = await api.login(email, password);
      state = AuthState(isAuthenticated: true, user: data['user'] as Map<String, dynamic>?);
      return true;
    } catch (e) {
      state = AuthState(error: _extractError(e));
      return false;
    }
  }

  Future<void> logout() async {
    await ref.read(apiServiceProvider).logout();
    state = const AuthState();
  }

  String _extractError(Object e) {
    if (e is Exception) return e.toString().replaceAll('Exception: ', '');
    return 'Error de conexión';
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(() => AuthNotifier());

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

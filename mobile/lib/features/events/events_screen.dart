import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../core/services/api_service.dart';
import '../../core/theme.dart';

final eventsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(apiServiceProvider).getEvents(limit: 100);
});

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(eventsProvider);

    return Scaffold(
      backgroundColor: WilCamTheme.bg0,
      appBar: AppBar(
        title: const Text('Eventos'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: () => ref.invalidate(eventsProvider)),
        ],
      ),
      body: events.when(
        loading: () => const Center(child: CircularProgressIndicator(color: WilCamTheme.accent)),
        error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: WilCamTheme.danger))),
        data: (data) {
          final items = (data['events'] as List? ?? []);
          if (items.isEmpty) {
            return const Center(child: Text('Sin eventos', style: TextStyle(color: WilCamTheme.fg3)));
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(color: WilCamTheme.bg3, height: 1),
            itemBuilder: (context, i) => _EventTile(event: items[i] as Map<String, dynamic>),
          );
        },
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  final Map<String, dynamic> event;
  const _EventTile({required this.event});

  @override
  Widget build(BuildContext context) {
    final type = event['event_type'] as String? ?? 'unknown';
    final conf = ((event['confidence'] as num?)?.toDouble() ?? 0) * 100;
    final createdAt = DateTime.tryParse(event['created_at'] as String? ?? '') ?? DateTime.now();
    final isPerson = type == 'person_detected';
    final color = isPerson ? WilCamTheme.live : WilCamTheme.warn;

    return ListTile(
      leading: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(isPerson ? Icons.person_rounded : Icons.warning_amber_rounded, color: color, size: 20),
      ),
      title: Text(
        isPerson ? 'Persona detectada' : type.replaceAll('_', ' ').toUpperCase(),
        style: const TextStyle(color: WilCamTheme.fg0, fontSize: 13, fontWeight: FontWeight.w500),
      ),
      subtitle: Text(
        '${event['camera_name'] ?? event['camera_id']} · ${conf.toStringAsFixed(0)}% confianza',
        style: const TextStyle(color: WilCamTheme.fg3, fontSize: 11),
      ),
      trailing: Text(
        timeago.format(createdAt, locale: 'es'),
        style: const TextStyle(fontFamily: 'JetBrainsMono', color: WilCamTheme.fg3, fontSize: 10),
      ),
    );
  }
}

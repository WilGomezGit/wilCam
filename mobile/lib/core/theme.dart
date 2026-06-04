import 'package:flutter/material.dart';

class WilCamTheme {
  // OKLCH palette mapped to sRGB for Flutter
  static const Color bg0 = Color(0xFF080B0F);
  static const Color bg1 = Color(0xFF0E1318);
  static const Color bg2 = Color(0xFF141C25);
  static const Color bg3 = Color(0xFF1C2733);
  static const Color bg4 = Color(0xFF243040);
  static const Color fg0 = Color(0xFFF0F4F8);
  static const Color fg1 = Color(0xFFCDD5DE);
  static const Color fg2 = Color(0xFF8FA4B8);
  static const Color fg3 = Color(0xFF566879);
  static const Color accent = Color(0xFF00D4FF);
  static const Color accent2 = Color(0xFF7B61FF);
  static const Color live = Color(0xFFFF4C6A);
  static const Color ok = Color(0xFF00E5A0);
  static const Color warn = Color(0xFFFFB347);
  static const Color danger = Color(0xFFFF4C6A);

  static ThemeData dark() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg0,
      colorScheme: const ColorScheme.dark(
        primary: accent,
        secondary: accent2,
        surface: bg2,
        background: bg0,
        error: danger,
        onPrimary: bg0,
        onSecondary: fg0,
        onSurface: fg0,
        onBackground: fg0,
        onError: fg0,
      ),
      fontFamily: 'SpaceGrotesk',
      appBarTheme: const AppBarTheme(
        backgroundColor: bg1,
        foregroundColor: fg0,
        elevation: 0,
        centerTitle: false,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: bg1,
        indicatorColor: Color(0x2200D4FF),
      ),
      cardTheme: const CardThemeData(
        color: bg2,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: bg0,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: bg3,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          borderSide: BorderSide(color: Color(0xFF243040)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          borderSide: BorderSide(color: Color(0xFF243040)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          borderSide: BorderSide(color: accent),
        ),
        labelStyle: TextStyle(color: fg2),
        hintStyle: TextStyle(color: fg3),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontFamily: 'SpaceGrotesk', color: fg0, fontWeight: FontWeight.bold),
        headlineMedium: TextStyle(fontFamily: 'SpaceGrotesk', color: fg0, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: fg1),
        bodyMedium: TextStyle(color: fg2),
        labelSmall: TextStyle(fontFamily: 'JetBrainsMono', color: fg3, letterSpacing: 0.5),
      ),
      useMaterial3: true,
    );
  }
}

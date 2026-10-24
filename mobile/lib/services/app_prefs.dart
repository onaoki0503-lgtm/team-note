import 'package:shared_preferences/shared_preferences.dart';

/// Non-secret UI preferences (motion, etc.).
class AppPrefs {
  static const _motionKey = 'tn_motion_paused';
  static const _legacyFaceKey = 'tn_face_login';

  static Future<bool> readMotionPaused() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_motionKey) ?? false;
  }

  static Future<void> writeMotionPaused(bool paused) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_motionKey, paused);
  }

  /// Drops the old camera-based face enrollment blob if present.
  static Future<void> clearLegacyFaceEnrollment() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyFaceKey);
  }
}

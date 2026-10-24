import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Biometric login prefs in Keychain / Keystore.
///
/// Preferred flow (Supabase): keep the auth session on device and require
/// Face ID / fingerprint to unlock the app. Password is only an optional
/// fallback for older installs that stored one.
class SecureCredentialsService {
  SecureCredentialsService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  final FlutterSecureStorage _storage;

  static const _emailKey = 'tn_user_email';
  static const _passwordKey = 'tn_user_password';
  static const _enabledKey = 'tn_biometric_login_enabled';
  static const _legacyPasswordModeKey = 'tn_biometric_password_mode';

  Future<void> enable({required String email}) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return;
    await _storage.write(key: _emailKey, value: trimmed);
    await _storage.write(key: _enabledKey, value: 'true');
    // Soft-lock mode — drop any previously saved password vault.
    await _storage.delete(key: _passwordKey);
    await _storage.delete(key: _legacyPasswordModeKey);
  }

  /// Legacy CareStart-style password vault (email accounts only).
  Future<void> savePasswordCredentials(String email, String password) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty || password.isEmpty) return;
    await _storage.write(key: _emailKey, value: trimmed);
    await _storage.write(key: _passwordKey, value: password);
    await _storage.write(key: _enabledKey, value: 'true');
    await _storage.write(key: _legacyPasswordModeKey, value: 'true');

    // Read-back check so a bad write cannot silently break next login.
    final stored = await _storage.read(key: _passwordKey);
    if (stored != password) {
      await clearCredentials();
      throw StateError('ログイン情報を端末に保存できませんでした。もう一度お試しください。');
    }
  }

  Future<bool> isEnabled() async {
    return (await _storage.read(key: _enabledKey)) == 'true';
  }

  Future<void> setEnabled(bool enabled) async {
    await _storage.write(key: _enabledKey, value: enabled ? 'true' : 'false');
  }

  Future<String?> peekEmail() async {
    return _storage.read(key: _emailKey);
  }

  Future<bool> hasStoredPassword() async {
    final password = await _storage.read(key: _passwordKey);
    return password != null && password.isNotEmpty;
  }

  /// Password pair only when legacy password mode is on and biometric is enabled.
  Future<Map<String, String>?> getPasswordCredentials() async {
    if (!await isEnabled()) return null;
    if ((await _storage.read(key: _legacyPasswordModeKey)) != 'true') {
      return null;
    }
    final email = await _storage.read(key: _emailKey);
    final password = await _storage.read(key: _passwordKey);
    if (email == null || email.isEmpty || password == null || password.isEmpty) {
      return null;
    }
    return {'email': email, 'password': password};
  }

  Future<void> clearPasswordOnly() async {
    await _storage.delete(key: _passwordKey);
    await _storage.delete(key: _legacyPasswordModeKey);
  }

  /// Full wipe — only from Settings when the user removes biometric login.
  Future<void> clearCredentials() async {
    await _storage.delete(key: _emailKey);
    await _storage.delete(key: _passwordKey);
    await _storage.delete(key: _enabledKey);
    await _storage.delete(key: _legacyPasswordModeKey);
  }

  /// Logout helper: drop password vault only. Keep Face ID on/off preference.
  Future<void> clearSecretsKeepPreference() async {
    await clearPasswordOnly();
  }
}

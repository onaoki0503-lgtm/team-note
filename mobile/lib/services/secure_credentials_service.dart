import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keychain (iOS) / Keystore (Android) credentials for biometric quick login.
/// Password is never read until OS biometric succeeds.
class SecureCredentialsService {
  SecureCredentialsService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            );

  final FlutterSecureStorage _storage;

  static const _emailKey = 'tn_user_email';
  static const _passwordKey = 'tn_user_password';
  static const _enabledKey = 'tn_biometric_login_enabled';

  Future<void> saveCredentials(String email, String password) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty || password.isEmpty) return;
    await _storage.write(key: _emailKey, value: trimmed);
    await _storage.write(key: _passwordKey, value: password);
    await _storage.write(key: _enabledKey, value: 'true');
  }

  /// Returns credentials only when biometric login is enabled.
  Future<Map<String, String>?> getCredentials() async {
    if (!await isEnabled()) return null;
    final email = await _storage.read(key: _emailKey);
    final password = await _storage.read(key: _passwordKey);
    if (email == null || email.isEmpty || password == null || password.isEmpty) {
      return null;
    }
    return {'email': email, 'password': password};
  }

  Future<String?> peekEmail() async {
    return _storage.read(key: _emailKey);
  }

  Future<bool> hasStoredPassword() async {
    final password = await _storage.read(key: _passwordKey);
    return password != null && password.isNotEmpty;
  }

  Future<bool> isEnabled() async {
    return (await _storage.read(key: _enabledKey)) == 'true';
  }

  Future<void> setEnabled(bool enabled) async {
    await _storage.write(key: _enabledKey, value: enabled ? 'true' : 'false');
  }

  Future<void> clearCredentials() async {
    await _storage.delete(key: _emailKey);
    await _storage.delete(key: _passwordKey);
    await _storage.delete(key: _enabledKey);
  }
}

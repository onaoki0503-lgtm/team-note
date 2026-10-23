import 'package:flutter_test/flutter_test.dart';
import 'package:team_note_mobile/theme/tokens.dart';

void main() {
  test('shared primary token matches web theme', () {
    expect(TnTokens.primary.toARGB32(), 0xFF285782);
  });
}

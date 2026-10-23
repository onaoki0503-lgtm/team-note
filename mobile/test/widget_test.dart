import 'package:flutter_test/flutter_test.dart';
import 'package:team_note_mobile/models/models.dart';
import 'package:team_note_mobile/theme/tokens.dart';

void main() {
  test('primary token', () {
    expect(TnTokens.primary.toARGB32(), 0xFF285782);
  });

  test('profile json matches web join shape', () {
    final p = MemberProfile(
      id: 'x',
      name: '太郎',
      role: 'HL',
      building: 'rosemary',
      floor: 3,
      unit: '301-A',
      bio: 'hello',
    );
    final j = p.toProfileJson();
    expect(j['building'], 'rosemary');
    expect(j['floor'], '3');
    expect(j['bio'], 'hello');
  });
}

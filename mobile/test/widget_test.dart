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
      name: ' 太郎 ',
      role: 'HL',
      building: 'rosemary',
      floor: 3,
      unit: ' 301-A ',
      bio: 'hello',
    );
    final j = p.toProfileJson();
    expect(j['name'], '太郎');
    expect(j['building'], 'rosemary');
    expect(j['floor'], 3);
    expect(j['unit'], '301-A');
    expect(j['bio'], 'hello');
  });

  test('empty profile fields get safe defaults', () {
    final p = MemberProfile(
      id: 'x',
      name: '',
      role: 'HL',
      building: 'rosemary',
      floor: 3,
      unit: '',
    );
    final j = p.normalizedCopy(fallbackName: 'alan').toProfileJson();
    expect(j['name'], 'alan');
    expect(j['unit'], '未設定');
  });
}

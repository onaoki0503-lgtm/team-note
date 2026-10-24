import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:team_note_mobile/screens/ideas_screen.dart';
import 'package:team_note_mobile/widgets/home_scene.dart';
import 'support/home_preview.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  for (final size in [
    const Size(320, 568),
    const Size(390, 844),
    const Size(430, 932),
    const Size(844, 390),
    const Size(768, 900),
  ]) {
    testWidgets('12 clouds fit without overlap or scrolling at $size', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = size;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const HomePreviewApp());
      await tester.pump(const Duration(milliseconds: 100));
      for (var frame = 0; frame < 8; frame++) {
        await tester.pump(const Duration(milliseconds: 1000));
        expect(tester.takeException(), isNull);
        final boxes = [
          for (var i = 0; i < 12; i++)
            tester.getRect(find.byKey(ValueKey('cloud-preview-$i'))),
        ];
        for (var i = 0; i < 12; i++) {
          expect(boxes[i].width, greaterThanOrEqualTo(44));
          expect(boxes[i].height, greaterThanOrEqualTo(40));
          expect((Offset.zero & size).contains(boxes[i].topLeft), isTrue);
          expect((Offset.zero & size).contains(boxes[i].bottomRight), isTrue);
          final centre = tester.getRect(find.bySemanticsLabel('企画を作成'));
          expect(boxes[i].overlaps(centre), isFalse);
          for (var j = 0; j < i; j++) {
            expect(boxes[i].overlaps(boxes[j]), isFalse);
          }
        }
      }
      for (final state in tester.stateList<ScrollableState>(
        find.byType(Scrollable),
      )) {
        expect(state.position.maxScrollExtent, 0);
      }
      await tester.pumpWidget(const SizedBox());
    });
  }
  testWidgets(
    'one cloud disappears and pops every four seconds; reduced motion stops it',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const HomePreviewApp());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 4000));
      await tester.pump(const Duration(milliseconds: 130));
      final fading = tester
          .widgetList<Opacity>(find.byType(Opacity))
          .where((o) => o.opacity == 0)
          .length;
      expect(fading, 1);
      await tester.pump(const Duration(milliseconds: 800));
      expect(
        tester
            .widgetList<Opacity>(find.byType(Opacity))
            .where((o) => o.opacity == 0),
        isEmpty,
      );
      await tester.pumpWidget(
        const HomePreviewApp(key: ValueKey('reduced'), reducedMotion: true),
      );
      await tester.pump();
      final before = tester.getRect(
        find.byKey(const ValueKey('cloud-preview-0')),
      );
      await tester.pump(const Duration(seconds: 5));
      expect(
        tester.getRect(find.byKey(const ValueKey('cloud-preview-0'))),
        before,
      );
      expect(
        tester
            .widgetList<Opacity>(find.byType(Opacity))
            .where((o) => o.opacity == 0),
        isEmpty,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('whole text, likes, own-only delete and proposal are usable', (
    tester,
  ) async {
    await tester.pumpWidget(const HomePreviewApp(reducedMotion: true));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.byKey(const ValueKey('cloud-preview-1')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('アイデアを削除'), findsNothing);
    expect(find.text('企画にする'), findsOneWidget);
    await tester.tap(find.text('いいね 1件'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const ValueKey('cloud-preview-0')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('アイデアを削除'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('削除する'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('cloud-preview-0')), findsNothing);
    await tester.tap(find.bySemanticsLabel('企画を作成'));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('企画フォーム: '), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'posting appends a cloud and preserves other text; failed save retains draft',
    (tester) async {
      await tester.pumpWidget(const HomePreviewApp(reducedMotion: true));
      await tester.pump();
      await tester.enterText(find.byType(TextField), '中庭で星を観察したい');
      await tester.pump();
      await tester.tap(find.byTooltip('アイデアを投稿'));
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byKey(const ValueKey('cloud-preview-12')), findsOneWidget);
      expect(find.text('朝ごはん会を開こう'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: IdeaHome(
              userId: 'failed-user',
              ideas: const [],
              motionPaused: true,
              onPost: (_) async => throw StateError('offline'),
              onLike: (_) async {},
              onDelete: (_) async {},
              onRefresh: () async {},
              onCreate: (_) {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.enterText(find.byType(TextField), '失敗しても消さない入力内容');
      await tester.pump();
      await tester.tap(find.byTooltip('アイデアを投稿'));
      await tester.pump(const Duration(milliseconds: 500));
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '失敗しても消さない入力内容',
      );
      expect(find.textContaining('入力内容は残っています'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'keyboard and large text do not overflow; loading uses a skeleton',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        const HomePreviewApp(textScale: 1.6, keyboard: 260),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(IdeaCloudBoard), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(MaterialApp(home: const HomeLoadingScaffold()));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.bySemanticsLabel('ホームを読み込み中'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}

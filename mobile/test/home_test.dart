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
    testWidgets('history scrolls at $size and keeps composer reachable', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = size;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        const HomePreviewApp(reducedMotion: true, ideaCount: 40),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('message-preview-39')), findsOneWidget);
      final scroll = tester.widget<ListView>(find.byType(ListView)).controller!;
      expect(scroll.position.maxScrollExtent, greaterThan(0));
      scroll.jumpTo(scroll.position.maxScrollExtent);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('message-preview-0')), findsOneWidget);
      final button = tester.getRect(
        find.byKey(const ValueKey('idea-post-trigger')),
      );
      final nav = tester.getRect(find.byType(GlassBottomNav));
      expect(button.bottom, lessThanOrEqualTo(nav.top));
      expect(button.top, greaterThan(0));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }
  testWidgets('reduced motion stops the original bubbles; metadata is absent', (
    tester,
  ) async {
    await tester.pumpWidget(
      const HomePreviewApp(ideaCount: 2, reducedMotion: true),
    );
    await tester.pumpAndSettle();
    final first = tester.getRect(
      find.byKey(const ValueKey('message-preview-0')),
    );
    await tester.pump(const Duration(seconds: 5));
    expect(
      tester.getRect(find.byKey(const ValueKey('message-preview-0'))),
      first,
    );
    expect(find.textContaining('年'), findsNothing);
    expect(find.text('プレビュー'), findsNothing);
    expect(find.byType(IdeaTimeline), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('history detail, likes, own deletion and proposal stay usable', (
    tester,
  ) async {
    await tester.pumpWidget(const HomePreviewApp(reducedMotion: true));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('message-preview-11')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('アイデアを削除'), findsNothing);
    await tester.tap(find.text('いいね 3件'));
    await tester.pumpAndSettle();
    final scroll = tester.widget<ListView>(find.byType(ListView)).controller!;
    scroll.jumpTo(scroll.position.maxScrollExtent);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('message-preview-0')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('アイデアを削除'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('削除する'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('message-preview-0')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('idea-post-trigger')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('企画を作成'));
    await tester.pumpAndSettle();
    expect(find.text('企画フォーム: '), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'posting appends a message and preserves other text; failed save retains draft',
    (tester) async {
      await tester.pumpWidget(const HomePreviewApp(reducedMotion: true));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('idea-post-trigger')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '中庭で星を観察したい');
      await tester.pump();
      await tester.tap(find.text('投稿する'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byKey(const ValueKey('message-preview-12')), findsOneWidget);
      final view = tester.widget<ListView>(find.byType(ListView));
      expect(view.controller!.position.maxScrollExtent, greaterThan(0));
      view.controller!.jumpTo(view.controller!.position.maxScrollExtent);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('message-preview-0')), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.byKey(const ValueKey('idea-post-trigger')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,
      );
      await tester.tap(find.byTooltip('投稿欄を閉じる'));
      await tester.pumpAndSettle();
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
      await tester.tap(find.byKey(const ValueKey('idea-post-trigger')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '失敗しても消さない入力内容');
      await tester.pump();
      await tester.tap(find.text('投稿する'));
      await tester.pumpAndSettle();
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
    'large text and keyboard fit, full loading uses history skeleton',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        const HomePreviewApp(textScale: 1.6, keyboard: 260),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const MaterialApp(home: HomeLoadingScaffold()));
      await tester.pump();
      expect(find.bySemanticsLabel('ホームを読み込み中'), findsOneWidget);
      expect(find.byType(IdeaTimelineSkeleton), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('floating bubbles briefly disappear and pop every four seconds', (
    tester,
  ) async {
    await tester.pumpWidget(const HomePreviewApp());
    await tester.pump();
    await tester.pump(const Duration(seconds: 4));
    await tester.pump(const Duration(milliseconds: 130));
    expect(
      tester
          .widgetList<Opacity>(find.byType(Opacity))
          .where((o) => o.opacity == 0)
          .length,
      1,
    );
    await tester.pump(const Duration(milliseconds: 800));
    expect(
      tester
          .widgetList<Opacity>(find.byType(Opacity))
          .where((o) => o.opacity == 0),
      isEmpty,
    );
    expect(find.text('プレビュー'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}

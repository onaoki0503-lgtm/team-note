// Test-only entry point. No authentication, network, or shared DB is initialized.
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:team_note_mobile/models/models.dart';
import 'package:team_note_mobile/screens/ideas_screen.dart';
import 'package:team_note_mobile/theme/app_theme.dart';
import 'package:team_note_mobile/widgets/home_scene.dart';

void main() => runApp(const HomePreviewApp());

List<IdeaItem> previewIdeas() => [
  for (var i = 0; i < 12; i++)
    IdeaItem(
      id: 'preview-$i',
      body: [
        '中庭で映画を見たい',
        '朝ごはん会を開こう',
        'みんなで防災訓練',
        '本を交換できる棚',
        '寮の写真を残したい',
        '共用キッチンの整理',
        '新入寮生と交流会',
        'スポーツの日を作る',
        '花壇のお手入れ',
        'ボードゲームの夜',
        '自転車点検をしたい',
        '音楽を楽しむ会',
      ][i],
      authorId: i == 0 ? 'preview-user' : 'other-$i',
      authorName: 'プレビュー',
      likes: i % 4,
    ),
];

class HomePreviewApp extends StatefulWidget {
  const HomePreviewApp({
    super.key,
    this.reducedMotion = false,
    this.textScale = 1,
    this.keyboard = 0,
  });
  final bool reducedMotion;
  final double textScale, keyboard;
  @override
  State<HomePreviewApp> createState() => _HomePreviewAppState();
}

class _HomePreviewAppState extends State<HomePreviewApp> {
  final ideas = previewIdeas();
  int serial = 12, index = 0;
  String? created;
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    locale: const Locale('ja'),
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [Locale('ja')],
    home: Builder(
      builder: (context) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          disableAnimations: widget.reducedMotion,
          textScaler: TextScaler.linear(widget.textScale),
          viewInsets: EdgeInsets.only(bottom: widget.keyboard),
        ),
        child: Scaffold(
          body: GlassBackdrop(
            child: SafeArea(
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(12, 8, 12, 6),
                    child: GlassSurface(
                      padding: EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.lightbulb_outline),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'チームノート',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  'H-Village · プレビュー',
                                  style: TextStyle(fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.settings_outlined),
                          SizedBox(width: 18),
                          CircleAvatar(radius: 20, child: Text('寮')),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: index != 0
                        ? Center(
                            child: Text(['', '進行中', 'はたらく', '保管する'][index]),
                          )
                        : created != null
                        ? Center(child: Text('企画フォーム: $created'))
                        : IdeaHome(
                            userId: 'preview-user',
                            keyboardVisible: widget.keyboard > 0,
                            ideas: ideas,
                            onPost: (text) async {
                              setState(() {
                                ideas.add(
                                  IdeaItem(
                                    id: 'preview-${serial++}',
                                    body: text,
                                    authorId: 'preview-user',
                                  ),
                                );
                                if (ideas.length > 12) ideas.removeAt(0);
                              });
                            },
                            onLike: (idea) async {
                              setState(() {
                                idea.likedByMe = !idea.likedByMe;
                                idea.likes += idea.likedByMe ? 1 : -1;
                              });
                            },
                            onDelete: (idea) async {
                              setState(() => ideas.remove(idea));
                            },
                            onRefresh: () async {},
                            onCreate: (text) => setState(() => created = text),
                          ),
                  ),
                  if (widget.keyboard == 0)
                    GlassBottomNav(
                      index: index,
                      onSelected: (i) => setState(() => index = i),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../services/teamnote_api.dart';
import '../config/environment.dart';
import '../theme/tokens.dart';

/// 西松地所向け月次提出レポート — mirrors web WorkStorageViews modal.
class NishimatsuReportSheet extends StatefulWidget {
  const NishimatsuReportSheet({
    super.key,
    required this.profile,
    required this.reports,
  });

  final MemberProfile profile;
  final List<Map<String, dynamic>> reports;

  static Future<void> show(
    BuildContext context, {
    required MemberProfile profile,
    required List<Map<String, dynamic>> reports,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: TnTokens.bgSurface,
      builder: (_) => NishimatsuReportSheet(profile: profile, reports: reports),
    );
  }

  @override
  State<NishimatsuReportSheet> createState() => _NishimatsuReportSheetState();
}

class _NishimatsuReportSheetState extends State<NishimatsuReportSheet> {
  final _studentYear = TextEditingController();
  final _studentId = TextEditingController();
  final _absencePeriod = TextEditingController();
  final _absenceReason = TextEditingController();
  final _feedback = TextEditingController();
  final _extraTrouble = TextEditingController();
  final _extraEntry = TextEditingController();

  var _copied = false;
  var _submitting = false;
  String? _submissionNotice;
  String? _submissionError;

  Future<void> _submit() async {
    if (_submitting || !Environment.isConfigured) return;
    final now = DateTime.now();
    final month = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    setState(() { _submitting = true; _submissionNotice = null; _submissionError = null; });
    try {
      await TeamNoteApi().submitMonthlyReport(month, _buildPlainText());
      if (mounted) { setState(() { _submissionNotice = '月次報告書を管理側に提出しました。同じ月の再提出は最新の内容に置き換わります。'; }); }
    } catch (_) {
      if (mounted) { setState(() { _submissionError = '提出できませんでした。接続を確認して再度お試しください。'; }); }
    } finally {
      if (mounted) { setState(() { _submitting = false; }); }
    }
  }

  @override
  void dispose() {
    _studentYear.dispose();
    _studentId.dispose();
    _absencePeriod.dispose();
    _absenceReason.dispose();
    _feedback.dispose();
    _extraTrouble.dispose();
    _extraEntry.dispose();
    super.dispose();
  }

  String _activityKey(Map<String, dynamic> r) {
    final category = '${r['category'] ?? ''}';
    switch (category) {
      case '役職固有業務':
        return 'inherent';
      case '役職連携業務':
        return 'cooperation';
      case '役職共通業務':
        return 'common';
      case 'トラブル対応':
        return 'trouble';
      case 'ユニット立ち入り':
        return 'unit_entry';
      default:
        return 'inherent';
    }
  }

  List<Map<String, dynamic>> get _monthReports {
    final ym = DateFormat('yyyy-MM').format(DateTime.now());
    return widget.reports
        .where((r) => '${r['reportDate'] ?? ''}'.startsWith(ym))
        .toList();
  }

  List<Map<String, dynamic>> _by(String key) =>
      _monthReports.where((r) => _activityKey(r) == key).toList();

  String _buildPlainText() {
    final now = DateTime.now();
    final p = widget.profile;
    final inherent = _by('inherent');
    final coop = _by('cooperation');
    final common = _by('common');
    final trouble = _by('trouble');
    final entry = _by('unit_entry');

    String linesFor(List<Map<String, dynamic>> list) {
      if (list.isEmpty) return '該当なし';
      return [
        for (var i = 0; i < list.length; i++)
          '${i + 1}. 日時: ${list[i]['reportDate'] ?? ''} | 業務: ${list[i]['title'] ?? ''}\n   アクションと結果: ${list[i]['body'] ?? ''}',
      ].join('\n');
    }

    final troubleLines = [
      for (var i = 0; i < trouble.length; i++)
        '${i + 1}. 日時: ${trouble[i]['reportDate'] ?? ''} | 内容: ${trouble[i]['title'] ?? ''} - ${trouble[i]['body'] ?? ''}',
      if (_extraTrouble.text.trim().isNotEmpty) '追加記入. ${_extraTrouble.text.trim()}',
    ];

    final entryLines = [
      for (var i = 0; i < entry.length; i++)
        '${i + 1}. 日時: ${entry[i]['reportDate'] ?? ''} | 棟・ユニット: ${entry[i]['locationLabel'] ?? entry[i]['title'] ?? ''} | 内容: ${entry[i]['body'] ?? ''}',
      if (_extraEntry.text.trim().isNotEmpty) '追加記入. ${_extraEntry.text.trim()}',
    ];

    return [
      '西松地所株式会社 御中',
      'H ヴィレッジ 役職者活動報告書 ${now.year}年${now.month}月分',
      '',
      '【基本情報】',
      '役職: ${p.role}',
      '担当フロア: ${p.floor}F',
      'ハウス・部屋番号: ${p.buildingLabel} ${p.unit}号室',
      '学年: ${_studentYear.text.trim().isEmpty ? '—' : _studentYear.text.trim()} | 学籍番号: ${_studentId.text.trim().isEmpty ? '—' : _studentId.text.trim()} | 氏名: ${p.name}',
      '不在日・期間: ${_absencePeriod.text.trim().isEmpty ? 'なし' : _absencePeriod.text.trim()} 理由: ${_absenceReason.text.trim().isEmpty ? 'なし' : _absenceReason.text.trim()}',
      '',
      '1. 活動報告:',
      '■ 役職固有業務:',
      linesFor(inherent),
      '',
      '■ 役職連携業務:',
      linesFor(coop),
      '',
      '■ 役職共通業務:',
      linesFor(common),
      '',
      '2. トラブル対応など報告:',
      troubleLines.isEmpty ? '記入なし' : troubleLines.join('\n'),
      '',
      '3. ユニット立ち入り記録:',
      entryLines.isEmpty ? '記入なし' : entryLines.join('\n'),
      '',
      '4. 学生寮について気づいたこと・要望・意見など:',
      _feedback.text.trim().isEmpty ? '特になし' : _feedback.text.trim(),
    ].join('\n');
  }

  String _buildMailBody() {
    final now = DateTime.now();
    final p = widget.profile;
    final activity = _monthReports.where((r) {
      final k = _activityKey(r);
      return k == 'inherent' || k == 'cooperation' || k == 'common';
    }).toList();
    final trouble = _by('trouble');
    final entry = _by('unit_entry');

    String label(String key) => switch (key) {
          'inherent' => '固有',
          'cooperation' => '連携',
          'common' => '共通',
          _ => key,
        };

    return [
      '西松地所株式会社 ご担当者様',
      '',
      'Hヴィレッジ ${p.buildingLabel}の${p.name}です。',
      '${now.year}年${now.month}月分の役職者活動報告書を送付いたします。',
      '',
      '【役職】${p.role} (担当フロア: ${p.floor}F)',
      '【学年・学籍番号・氏名】${_studentYear.text.trim().isEmpty ? '—' : _studentYear.text.trim()} / ${_studentId.text.trim().isEmpty ? '—' : _studentId.text.trim()} / ${p.name}',
      '【不在期間】${_absencePeriod.text.trim().isEmpty ? 'なし' : _absencePeriod.text.trim()} (理由: ${_absenceReason.text.trim().isEmpty ? 'なし' : _absenceReason.text.trim()})',
      '',
      '【1. 活動報告】',
      if (activity.isEmpty)
        '記入なし'
      else
        for (final r in activity)
          '・[${label(_activityKey(r))}] ${r['reportDate'] ?? ''} ${r['title'] ?? ''}\n  アクションと結果: ${r['body'] ?? ''}',
      '',
      '【2. トラブル対応】',
      if (trouble.isEmpty && _extraTrouble.text.trim().isEmpty)
        '記入なし'
      else ...[
        for (final r in trouble) '・${r['reportDate'] ?? ''} ${r['title'] ?? ''}: ${r['body'] ?? ''}',
        if (_extraTrouble.text.trim().isNotEmpty) '・${_extraTrouble.text.trim()}',
      ],
      '',
      '【3. ユニット立ち入り記録】',
      if (entry.isEmpty && _extraEntry.text.trim().isEmpty)
        '記入なし'
      else ...[
        for (final r in entry)
          '・${r['reportDate'] ?? ''} ${r['locationLabel'] ?? r['title'] ?? ''}: ${r['body'] ?? ''}',
        if (_extraEntry.text.trim().isNotEmpty) '・${_extraEntry.text.trim()}',
      ],
      '',
      '【4. 気づいたこと・要望・意見】',
      _feedback.text.trim().isEmpty ? '特になし' : _feedback.text.trim(),
      '',
      'ご確認のほどよろしくお願い申し上げます。',
    ].join('\n');
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: _buildPlainText()));
    if (!mounted) return;
    setState(() => _copied = true);
    Future<void>.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _share() async {
    await SharePlus.instance.share(
      ShareParams(text: _buildPlainText(), subject: _mailSubject()),
    );
  }

  String _mailSubject() {
    final now = DateTime.now();
    return '【Hヴィレッジ役職者活動報告書】${now.year}年${now.month}月分_${widget.profile.name}';
  }

  Future<void> _mail() async {
    final uri = Uri(
      scheme: 'mailto',
      path: 'nishimatsu-info@example.com',
      queryParameters: {
        'subject': _mailSubject(),
        'body': _buildMailBody(),
      },
    );
    final ok = await launchUrl(uri);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('メールアプリを開けませんでした。テキストコピーをお使いください。')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final p = widget.profile;
    final month = _monthReports;
    final inherent = _by('inherent');
    final coop = _by('cooperation');
    final common = _by('common');
    final trouble = _by('trouble');
    final entry = _by('unit_entry');

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.92,
      minChildSize: 0.55,
      maxChildSize: 0.98,
      builder: (context, scrollController) {
        return Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 14),
              color: TnTokens.primary,
              child: Row(
                children: [
                  const Icon(Icons.description_outlined, color: Color(0xFF38BDF8)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '西松地所 提出用業務報告レポート',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        Text(
                          '対象月 ${now.year}年${now.month}月度 · 今月 ${month.length}件',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF94A3B8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('H ヴィレッジ', style: TextStyle(letterSpacing: 2, fontSize: 12, color: TnTokens.textMuted)),
                                  Text(
                                    '役職者活動報告書 ${now.year}年${now.month}月分',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 140,
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDC2626),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                '提出期限 翌月5日\n締切までにご提出がない場合、当月の手当は支給されません',
                                style: TextStyle(color: Colors.white, fontSize: 10, height: 1.35),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _infoRow('役職', p.role, '担当フロア', '${p.floor}F'),
                        _infoRow('ハウス・部屋', '${p.buildingLabel} ${p.unit}号室', null, null),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _studentYear,
                                decoration: const InputDecoration(labelText: '学年', isDense: true),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _studentId,
                                decoration: const InputDecoration(labelText: '学籍番号', isDense: true),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('氏名: ${p.name}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _absencePeriod,
                          decoration: const InputDecoration(
                            labelText: '不在日・期間',
                            hintText: '例: 10月10日〜10月12日',
                            isDense: true,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _absenceReason,
                          decoration: const InputDecoration(
                            labelText: '不在理由',
                            hintText: '帰省、合宿など',
                            isDense: true,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('1. 活動報告', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        _sectionTable('役職固有業務', inherent),
                        _sectionTable('役職連携業務', coop),
                        _sectionTable('役職共通業務', common),
                        const SizedBox(height: 14),
                        const Text('2. トラブル対応など報告', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        _sectionTable(null, trouble, emptyLabel: '記入なし'),
                        TextField(
                          controller: _extraTrouble,
                          decoration: const InputDecoration(
                            labelText: '追加のトラブル記入（任意）',
                            isDense: true,
                          ),
                          maxLines: 2,
                        ),
                        const SizedBox(height: 14),
                        const Text('3. ユニット立ち入り記録', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        _sectionTable(null, entry, emptyLabel: '記入なし', showLocation: true),
                        TextField(
                          controller: _extraEntry,
                          decoration: const InputDecoration(
                            labelText: '追加の立ち入り記入（任意）',
                            isDense: true,
                          ),
                          maxLines: 2,
                        ),
                        const SizedBox(height: 14),
                        const Text('4. 気づいたこと・要望・意見', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _feedback,
                          decoration: const InputDecoration(
                            hintText: '特になしの場合は空欄で構いません',
                            isDense: true,
                          ),
                          maxLines: 4,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Column(
                  children: [
                    if (_submissionNotice != null)
                      Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_submissionNotice!, style: const TextStyle(fontSize: 12, color: Color(0xFF183181)))),
                    if (_submissionError != null)
                      Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_submissionError!, style: const TextStyle(fontSize: 12, color: Colors.red))),
                    if (_copied)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text(
                          '提出テキストをコピーしました',
                          style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                      ),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: [
                        FilledButton.icon(
                          onPressed: _submitting || !Environment.isConfigured ? null : _submit,
                          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF183181)),
                          icon: _submitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send, size: 16),
                          label: Text(_submitting ? '提出中…' : '管理側に提出'),
                        ),
                        OutlinedButton.icon(
                          onPressed: _copy,
                          icon: const Icon(Icons.copy, size: 16),
                          label: const Text('テキストコピー'),
                        ),
                        FilledButton.tonalIcon(
                          onPressed: _share,
                          icon: const Icon(Icons.ios_share, size: 16),
                          label: const Text('共有 / PDF'),
                        ),
                        FilledButton.icon(
                          onPressed: _mail,
                          icon: const Icon(Icons.mail_outline, size: 16),
                          label: const Text('メールで送信'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _infoRow(String k1, String v1, String? k2, String? v2) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(child: Text('$k1: $v1', style: const TextStyle(fontSize: 12))),
          if (k2 != null && v2 != null)
            Expanded(child: Text('$k2: $v2', style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  Widget _sectionTable(
    String? title,
    List<Map<String, dynamic>> items, {
    String emptyLabel = '該当なし',
    bool showLocation = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF334155)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              color: TnTokens.bgTint,
              child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
            ),
          if (items.isEmpty)
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(emptyLabel, style: const TextStyle(color: TnTokens.textMuted, fontSize: 12)),
            )
          else
            for (final r in items)
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${r['reportDate'] ?? ''}',
                      style: const TextStyle(fontSize: 11, color: TnTokens.textMuted),
                    ),
                    Text('${r['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    if (showLocation && '${r['locationLabel'] ?? ''}'.trim().isNotEmpty)
                      Text(
                        '${r['locationLabel']}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF0E7490)),
                      ),
                    Text('${r['body'] ?? ''}', style: const TextStyle(fontSize: 12, height: 1.4)),
                    const Divider(height: 12),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

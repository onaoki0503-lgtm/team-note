// Mirrors web `src/lib/proposalForm.ts` — do not strip fields.

class ProposalFieldDef {
  const ProposalFieldDef({
    required this.key,
    required this.label,
    required this.hint,
    required this.required,
    required this.max,
    this.aliases = const [],
  });

  final String key;
  final String label;
  final String hint;
  final bool required;
  final int max;
  final List<String> aliases;
}

const proposalFields = <ProposalFieldDef>[
  ProposalFieldDef(key: 'title', label: '企画名', hint: '何を実施・改善する企画か', required: true, max: 120, aliases: ['企画名', 'タイトル']),
  ProposalFieldDef(key: 'background', label: '背景・課題', hint: '現状と、解決したいこと', required: true, max: 1800, aliases: ['背景・課題', '背景', '課題']),
  ProposalFieldDef(key: 'objective', label: '目的', hint: '何のために行うか', required: true, max: 1200, aliases: ['目的']),
  ProposalFieldDef(key: 'proposalOverview', label: '実施内容', hint: '何を、どのように行うか', required: true, max: 1800, aliases: ['実施内容', '内容']),
  ProposalFieldDef(key: 'implementationDate', label: '実施日時', hint: '予定日・時間。決まっていない場合は「未定」', required: true, max: 200, aliases: ['実施日時', '開催日時', '日時', '日程']),
  ProposalFieldDef(key: 'location', label: '場所', hint: '棟・部屋・会場。未定の場合は「未定」', required: true, max: 200, aliases: ['開催場所', '実施場所', '場所']),
  ProposalFieldDef(key: 'targetAudience', label: '対象・人数', hint: '誰が参加するか・予定人数', required: true, max: 400, aliases: ['対象・人数', '対象者', '対象', '参加人数']),
  ProposalFieldDef(key: 'responsible', label: '担当・役割', hint: '責任者と各担当。未定の役割も記載', required: true, max: 1000, aliases: ['担当・役割', '責任者', '担当者', '担当']),
  ProposalFieldDef(key: 'actionSteps', label: '準備・当日の手順', hint: '準備、実施、片づけの順に1行ずつ', required: true, max: 1800, aliases: ['準備・当日の手順', '導入手順', '準備手順', '手順']),
  ProposalFieldDef(key: 'requirements', label: '安全・確認事項', hint: '危険への対策、使用許可、関係者への確認', required: true, max: 1800, aliases: ['安全・確認事項', '安全対策', '確認事項', '安全']),
  ProposalFieldDef(key: 'totalCostEstimate', label: '予算・調達方法', hint: '概算費用・支出元・必要な物。未確認は「未確認」', required: true, max: 1000, aliases: ['予算・調達方法', '予算', '費用']),
  ProposalFieldDef(key: 'expectedImpact', label: '成果・振り返り方法', hint: '実施後に何を確認するか', required: false, max: 1000, aliases: ['成果・振り返り方法', '期待する効果', '振り返り', '成果']),
  ProposalFieldDef(key: 'submittedTo', label: '提出先', hint: '確認・承認を依頼する相手', required: false, max: 200, aliases: ['提出先']),
  ProposalFieldDef(key: 'submittedDate', label: '提出日', hint: '提出予定日', required: false, max: 100, aliases: ['提出日']),
];

const maxDistributionInput = 2400;

class ProposalForm {
  ProposalForm({
    this.projectType = 'operation',
    Map<String, String>? values,
  }) : values = {
          for (final f in proposalFields) f.key: values?[f.key] ?? '',
        };

  String projectType; // operation | event
  final Map<String, String> values;

  String operator [](String key) => values[key] ?? '';
  void operator []=(String key, String v) => values[key] = v;

  List<String> errors() {
    final out = <String>[];
    for (final f in proposalFields) {
      final v = values[f.key] ?? '';
      if (f.required && v.trim().isEmpty) out.add('${f.label}を入力してください。');
      if (v.length > f.max) out.add('${f.label}は${f.max}文字以内で入力してください。');
    }
    return out;
  }

  Map<String, dynamic> toJson() => {
        'projectType': projectType,
        ...values,
      };

  factory ProposalForm.fromJson(Map<String, dynamic> json) {
    final form = ProposalForm(projectType: '${json['projectType'] ?? 'operation'}');
    for (final f in proposalFields) {
      form[f.key] = '${json[f.key] ?? ''}';
    }
    return form;
  }
}

class ProposalAssignment {
  ProposalAssignment({required this.field, required this.quote});
  final String field;
  final String quote;
}

/// Local shortcut when memo contains labeled lines (same idea as web localAssignments).
List<ProposalAssignment> localAssignments(String text) {
  final aliases = <({String alias, String field})>[];
  for (final f in proposalFields) {
    for (final a in f.aliases) {
      aliases.add((alias: a, field: f.key));
    }
  }
  aliases.sort((a, b) => b.alias.length.compareTo(a.alias.length));
  final pattern = RegExp(
    '(?:^|[\\n。！？!?、\\s])\\s*(${aliases.map((e) => RegExp.escape(e.alias)).join('|')})(?:は|が|[:：])\\s*',
  );
  final markers = pattern.allMatches(text).toList();
  if (markers.isEmpty) return [];
  final leading = text.substring(0, markers.first.start).trim();
  if (leading.isNotEmpty) return [];

  final result = <ProposalAssignment>[];
  for (var i = 0; i < markers.length; i++) {
    final m = markers[i];
    final alias = m.group(1)!;
    final field = aliases.firstWhere((e) => e.alias == alias).field;
    final end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    final quote = text.substring(m.end, end).replaceAll(RegExp(r'[。\s]+$'), '').trim();
    if (quote.isEmpty) continue;
    final existing = result.where((e) => e.field == field).firstOrNull;
    if (existing != null) {
      result[result.indexOf(existing)] = ProposalAssignment(field: field, quote: '${existing.quote}\n$quote');
    } else {
      result.add(ProposalAssignment(field: field, quote: quote));
    }
  }
  return result;
}

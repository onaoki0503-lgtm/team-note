import '../models/models.dart';

/// Web `INITIAL_RESIDENTS` from `src/lib/db.ts` — dorm directory for 名簿.
class DemoRoster {
  static final residents = <MemberProfile>[
    MemberProfile(id: 'r1', name: '岡本 直樹', role: 'HL', building: 'rosemary', floor: 3, unit: 'Unit 301 - A室', bio: 'キッチン布巾改善PJ / 玄関共通化提案', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r2', name: '伊藤 雄吉', role: 'EA', building: 'rosemary', floor: 3, unit: 'Unit 301 - B室', bio: '夜間イベント企画・サイレントフェス検討', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r3', name: '佐藤 健太', role: 'IA', building: 'rosemary', floor: 2, unit: 'Unit 202 - A室', bio: '玄関美化・靴箱プロトタイプ担当', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-oa-rosemary', name: '高橋 涼平', role: 'OA', building: 'rosemary', floor: 3, unit: 'Unit 301 - C室', bio: '広報・写真記録・SNS運用担当', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-fl-4f', name: '佐々木 陸', role: 'FL', building: 'rosemary', floor: 4, unit: 'Unit 401', bio: '4Fフロアリーダー', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-fl-2f', name: '森本 健', role: 'FL', building: 'rosemary', floor: 2, unit: 'Unit 201', bio: '2Fフロアリーダー', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-fl-1f', name: '田村 啓介', role: 'FL', building: 'rosemary', floor: 1, unit: 'Unit 101', bio: '1Fフロアリーダー', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r4', name: '生熊 翔太', role: 'FL', building: 'paprika', floor: 3, unit: 'Unit 303 - A室', bio: '布巾改善の申請書連携・西松窓口', avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r5', name: '宗司 涼介', role: 'HL', building: 'paprika', floor: 2, unit: 'Unit 201 - A室', bio: 'パプリカ棟ハウスリーダー・全体自治会担当', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r6', name: '山田 大地', role: 'FL', building: 'turmeric', floor: 3, unit: 'Unit 302 - B室', bio: 'BBQ大会企画・機材管理', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r7', name: '渡辺 陽奈', role: 'FL', building: 'basil', floor: 2, unit: 'Unit 203 - A室', bio: '中庭植栽・ハーブ菜園PJ', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-401-2', name: '松本 玲奈', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 401', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-401-3', name: '井上 陽介', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 401', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-401-4', name: '木村 拓也', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 401', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-401-5', name: '林 彩花', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 401', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-402-1', name: '加藤 航', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 402', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-402-2', name: '清水 大輝', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 402', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-402-3', name: '池田 萌', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 402', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-403-1', name: '吉田 健', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 403', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-403-2', name: '山口 舞', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 403', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-403-3', name: '斉藤 翔', role: '一般寮生', building: 'rosemary', floor: 4, unit: 'Unit 403', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-303-1', name: '前田 龍', role: '一般寮生', building: 'rosemary', floor: 3, unit: 'Unit 303', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-303-2', name: '藤田 詩織', role: '一般寮生', building: 'rosemary', floor: 3, unit: 'Unit 303', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-302-1', name: '三浦 剛', role: '一般寮生', building: 'rosemary', floor: 3, unit: 'Unit 302', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-201-2', name: '阿部 さくら', role: '一般寮生', building: 'rosemary', floor: 2, unit: 'Unit 201', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-101-2', name: '上田 七海', role: '一般寮生', building: 'rosemary', floor: 1, unit: 'Unit 101', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80'),
    MemberProfile(id: 'r-103-1', name: '中村 遥', role: '一般寮生', building: 'rosemary', floor: 1, unit: 'Unit 103', bio: '1人部屋利用', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'),
  ];
}

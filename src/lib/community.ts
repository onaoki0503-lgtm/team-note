// H-Village is the first deployment. Shared UI reads terminology and motion here.
// Future organisation profiles can supply these values without changing navigation or the idea board.
export const community = {
  id: 'h-village',
  name: 'H-Village',
  memberLabel: '寮生',
  homeLabel: 'イータを変える',
  scenes: { courtyard: './courtyard_monochrome.png', commons: './commons_monochrome.png' },
  ideas: { maxLength: 140, storageKey: 'tn_db_bubble_ideas' }
} as const;

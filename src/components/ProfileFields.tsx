import type { CurrentUser } from '../lib/db';
export type ProfileForm = Pick<CurrentUser, 'name' | 'role' | 'building' | 'floor' | 'unit'>;
export function ProfileFields({ value, onChange, disabled = false }: { value: ProfileForm; onChange: (value: ProfileForm) => void; disabled?: boolean }) {
  return <fieldset className="shared-profile-fields" disabled={disabled}>
    <label>名前<input required maxLength={60} autoComplete="name" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></label>
    <label>役職<select value={value.role} onChange={e => onChange({ ...value, role: e.target.value })}>{['一般寮生', 'HL', 'EA', 'IA', 'OA', 'FL'].map(role => <option key={role}>{role}</option>)}</select></label>
    <div className="shared-profile-row"><label>棟<select value={value.building} onChange={e => onChange({ ...value, building: e.target.value as ProfileForm['building'] })}>{Object.entries({ rosemary: 'ローズマリー', basil: 'バジル', turmeric: 'ターメリック', paprika: 'パプリカ' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>階<select value={value.floor} onChange={e => onChange({ ...value, floor: Number(e.target.value) })}>{[1, 2, 3, 4].map(floor => <option key={floor} value={floor}>{floor}階</option>)}</select></label></div>
    <label>部屋番号<input required maxLength={60} autoComplete="off" placeholder="301-A" value={value.unit} onChange={e => onChange({ ...value, unit: e.target.value })} /></label>
  </fieldset>;
}

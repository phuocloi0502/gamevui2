import type { CombatVfxTrigger, State } from '../../../packages/asset-core/src/types';

export const stateLabels: Record<State, string> = { idle: 'Đứng yên', walk: 'Di chuyển', attack: 'Tấn công' };
export const propertyLabels: Record<string, string> = {
  x: 'Dịch ngang · pixel', y: 'Dịch dọc · pixel', angle: 'Góc xoay · độ', scaleX: 'Co giãn ngang · hệ số', scaleY: 'Co giãn dọc · hệ số', alpha: 'Độ trong suốt · 0 đến 1',
};
const layerLabels: Record<string, string> = {
  'effect-back': 'Hiệu ứng phía sau',
  tail: 'Đuôi',
  'tail-left-outer': 'Đuôi trái ngoài',
  'tail-left-inner': 'Đuôi trái trong',
  'tail-center': 'Đuôi giữa',
  'tail-right-inner': 'Đuôi phải trong',
  'tail-right-outer': 'Đuôi phải ngoài',
  'tail-back': 'Đuôi phía sau',
  'tail-front': 'Đuôi phía trước',
  'rear-far': 'Chân sau · phía đuôi · xa người xem',
  'rear-near': 'Chân sau · phía đuôi · gần người xem',
  body: 'Thân',
  'front-far': 'Chân trước · phía đầu · xa người xem',
  'front-near': 'Chân trước · phía đầu · gần người xem',
  head: 'Đầu',
  'eyes-open': 'Đôi mắt mở',
  'eyes-closed': 'Đôi mắt nhắm',
  'effect-front': 'Hiệu ứng phía trước',
  particles: 'Hạt hiệu ứng',
};
export const layerLabel = (id: string) => layerLabels[id] ?? id;

const LAYER_GROUPS = [
  { id: 'legs', label: 'Chân', test: (id: string) => /^(rear-far|rear-near|front-far|front-near|hind-leg|front-paw|rear-feet|front-feet|rear-leg|front-leg|legs|talons)(-|$)/.test(id) },
  { id: 'body-tail', label: 'Thân và đuôi', test: (id: string) => /^(body|tail|torso|core|blob|shell|inner-core)(-|$)/.test(id) || /^(tail-feathers|tail-fan|shell-runes)$/.test(id) },
  { id: 'head', label: 'Đầu', test: (id: string) => /^(head|eyes|jaw|mane|horns|crest|face|rear-ear|front-ear|forehead)(-|$)/.test(id) || /ear/.test(id) },
  { id: 'wings-arms', label: 'Cánh và tay', test: (id: string) => /wing/.test(id) || /^(rear-arm|front-arm)(-|$)/.test(id) },
  { id: 'effects', label: 'Hiệu ứng', test: (id: string) => /^(effect|particles|rock-fragments|top-effect|front-gloss)/.test(id) || /aura/.test(id) },
] as const;

export function groupPetLayers<T extends { id: string }>(layers: T[]) {
  const buckets = LAYER_GROUPS.map(group => ({ id: group.id, label: group.label, layers: [] as T[] }));
  const other = { id: 'other', label: 'Khác', layers: [] as T[] };
  for (const layer of layers) {
    const bucket = buckets.find((_, index) => LAYER_GROUPS[index].test(layer.id));
    (bucket ?? other).layers.push(layer);
  }
  return [...buckets, other].filter(group => group.layers.length);
}
const combatVfxLabels: Record<string, string> = {
  cast: 'Combat VFX · tích năng',
  trail: 'Combat VFX · vệt tấn công',
  projectile: 'Combat VFX · đạn bay',
  impact: 'Combat VFX · va chạm',
  meteor: 'Combat VFX · thiên thạch',
  vortex: 'Combat VFX · lốc xoáy',
  'ground-wave': 'Combat VFX · sóng chấn động',
  cage: 'Combat VFX · lồng khống chế',
  pulse: 'Combat VFX · vòng xung kích',
  beam: 'Combat VFX · tia xuyên',
};
export const combatVfxLabel = (semantic: string) => combatVfxLabels[semantic] ?? `Combat VFX · ${semantic}`;
export const combatTriggerLabels: Record<CombatVfxTrigger, string> = {
  'attack-start': 'Bắt đầu tấn công',
  'attack-release': 'Thời điểm tung đòn',
  'after-primary': 'Sau hiệu ứng chính',
};
export function keyframeLabel(index: number, count: number) {
  const percent = Math.round(index / Math.max(1, count - 1) * 100);
  if (index === 0) return 'Đầu · 0%';
  if (index === count - 1) return 'Cuối · 100%';
  if (percent === 50) return 'Giữa · 50%';
  return `${percent}%`;
}

export const selectedPetKey = 'asset-studio:selected-pet';

import type { EvolutionLevel, Layer } from './types';

export type PetArchetypeId = 'quadruped' | 'hopper' | 'tank' | 'winged' | 'blob' | 'serpent';
export type PetSpeciesId = 'fox' | 'wolf' | 'bunny' | 'turtle' | 'golem' | 'dragon' | 'owl' | 'hawk' | 'slime' | 'serpent';
export type PetElement = 'fire' | 'water' | 'wind' | 'light' | 'shadow';

export interface UploadSlot {
  id: string;
  label: string;
  file: string;
  folder: 'layers' | 'effects';
  optional?: boolean;
  combatVfx?: string;
  instances?: Array<Omit<Layer, 'src'>>;
}

export interface SpeciesTemplate {
  id: PetSpeciesId;
  name: string;
  archetype: PetArchetypeId;
  rig: string;
  validated: boolean;
  slots: UploadSlot[];
  evolutionSlots?: Partial<Record<EvolutionLevel, { replace: string[]; slots: UploadSlot[] }>>;
}

const layer = (id: string, x: number, y: number, originX: number, originY: number, z: number, scale = 1, parent?: string) =>
  ({ id, x, y, originX, originY, z, scale, ...(parent ? { parent } : {}) });
const upload = (id: string, label: string, instances: Array<Omit<Layer, 'src'>>, optional = false): UploadSlot =>
  ({ id, label, file: `${id}.png`, folder: 'layers', instances, optional });
const effect = (id: string, label: string, instance: Omit<Layer, 'src'>): UploadSlot =>
  ({ id, label, file: `${id}.png`, folder: 'effects', instances: [instance], optional: true });
const combat = (id: string, label: string, semantic = id): UploadSlot =>
  ({ id, label, file: `${id}.png`, folder: 'effects', optional: true, combatVfx: semantic });
const eyeStates = (originX: number, originY: number, z: number): UploadSlot[] => [
  upload('eyes-open', 'Đôi mắt mở', [{ ...layer('eyes-open', 0, 0, originX, originY, z, 1, 'head'), blink: 'open' }]),
  upload('eyes-closed', 'Đôi mắt nhắm', [{ ...layer('eyes-closed', 0, 0, originX, originY, z + .01, 1, 'head'), blink: 'closed' }]),
];

export const PET_ARCHETYPES = [
  { id: 'quadruped', name: 'Bốn chân', rig: 'quadruped-base', species: ['fox', 'wolf'], validated: true },
  { id: 'hopper', name: 'Nhảy / lao', rig: 'hopper-base', species: ['bunny'], validated: false },
  { id: 'tank', name: 'Nặng / phòng thủ', rig: 'tank-base', species: ['turtle', 'golem'], validated: false },
  { id: 'winged', name: 'Bay', rig: 'winged-base', species: ['dragon', 'owl', 'hawk'], validated: false },
  { id: 'blob', name: 'Khối mềm', rig: 'blob-base', species: ['slime'], validated: false },
  { id: 'serpent', name: 'Thân dài', rig: 'serpent-base', species: ['serpent'], validated: false },
] as const;

export const PET_ELEMENTS: Array<{ id: PetElement; name: string; color: number }> = [
  { id: 'fire', name: 'Fire', color: 0xff9a28 },
  { id: 'water', name: 'Water', color: 0x5ad0ff },
  { id: 'wind', name: 'Wind', color: 0xaae8cf },
  { id: 'light', name: 'Light', color: 0xffe49a },
  { id: 'shadow', name: 'Shadow', color: 0xab9cff },
];

export const SPECIES_TEMPLATES: SpeciesTemplate[] = [
  {
    id: 'fox', name: 'Fox', archetype: 'quadruped', rig: 'fox-quadruped', validated: true,
    slots: [
      effect('effect-back', 'Effect phía sau', layer('effect-back', 0, -120, .5, .5, 1)),
      upload('tail', 'Đuôi', [layer('tail', -65, -105, .85, .85, 2, .75)]),
      upload('rear-far', 'Chân sau · phía đuôi · xa người xem', [layer('rear-far', -53, -79, .5, .15, 3, .72)]),
      upload('rear-near', 'Chân sau · phía đuôi · gần người xem', [layer('rear-near', -74, -87, .5, .15, 4, .84)]),
      upload('body', 'Thân / bụng / ngực · không chân hoặc đùi', [layer('body', 0, -117, .5, .5, 5, .68)]),
      upload('front-far', 'Chân trước · phía đầu · xa người xem', [layer('front-far', 59, -81, .5, .15, 6, .74)]),
      upload('front-near', 'Chân trước · phía đầu · gần người xem', [layer('front-near', 28, -90, .5, .15, 7, .86)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 39, -151, .5, .88, 8, .78)]),
      ...eyeStates(.5, .88, 8.1),
      effect('effect-front', 'Effect visual phía trước', layer('effect-front', 90, -145, .5, .5, 9)),
      effect('particles', 'Particles', layer('particles', 0, -135, .5, .5, 10)),
      combat('attack-cast', 'Combat VFX · tích năng ở đuôi', 'cast'),
      combat('projectile', 'Combat VFX · đạn bay'),
      combat('impact', 'Combat VFX · va chạm'),
    ],
    evolutionSlots: {
      2: {
        replace: [],
        slots: [
          combat('splash', 'Combat VFX · vòng splash tại impact', 'splash'),
        ],
      },
      3: {
        replace: ['tail'],
        slots: [
          upload('tail', 'Đuôi đơn (chọn đuôi đơn hoặc multi-tail)', [layer('tail', -65, -105, .85, .85, 2, .75)], true),
          upload('tail-left-outer', 'Đuôi trái ngoài', [layer('tail-left-outer', -102, -104, .88, .86, 2, .75)], true),
          upload('tail-left-inner', 'Đuôi trái trong', [layer('tail-left-inner', -84, -106, .87, .86, 2.1, .75)], true),
          upload('tail-center', 'Đuôi giữa', [layer('tail-center', -65, -108, .85, .86, 2.2, .75)], true),
          upload('tail-right-inner', 'Đuôi phải trong', [layer('tail-right-inner', -46, -106, .83, .86, 2.3, .75)], true),
          upload('tail-right-outer', 'Đuôi phải ngoài', [layer('tail-right-outer', -28, -104, .82, .86, 2.4, .75)], true),
        ],
      },
    },
  },
  {
    id: 'wolf', name: 'Wolf', archetype: 'quadruped', rig: 'quadruped-base', validated: false,
    slots: [
      upload('shadow', 'Bóng tiếp đất', [layer('shadow', 8, -22, .5, .85, 0, .8)], true),
      upload('tail', 'Đuôi', [layer('tail', -72, -108, .82, .82, 1, .8)]),
      upload('rear-far', 'Chân sau · phía đuôi · xa người xem', [layer('rear-far', -55, -82, .5, .15, 2, .8)]),
      upload('front-far', 'Chân trước · phía đầu · xa người xem', [layer('front-far', 62, -84, .5, .15, 3, .8)]),
      upload('body', 'Thân dài / bụng / ngực · không chân hoặc đùi', [layer('body', 0, -122, .5, .5, 4, .75)]),
      upload('mane', 'Bờm', [layer('mane', 25, -140, .5, .6, 5, .8)], true),
      upload('rear-near', 'Chân sau · phía đuôi · gần người xem', [layer('rear-near', -72, -90, .5, .15, 6, .9)]),
      upload('front-near', 'Chân trước · phía đầu · gần người xem', [layer('front-near', 35, -92, .5, .15, 7, .9)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 55, -154, .5, .82, 8, .76)]), ...eyeStates(.5, .82, 8.1),
      upload('jaw', 'Hàm dưới', [layer('jaw', 72, -132, .45, .2, 9, .76, 'head')], true),
      combat('attack-cast', 'Combat VFX · tích năng ở nanh', 'cast'),
      combat('attack-trail', 'Combat VFX · vệt lao/cắn', 'trail'),
      combat('impact', 'Combat VFX · va chạm cắn'),
    ],
  },
  {
    id: 'bunny', name: 'Bunny', archetype: 'hopper', rig: 'hopper-base', validated: false,
    slots: [
      upload('shadow', 'Bóng tiếp đất', [layer('shadow', 8, -22, .5, .85, 0, .8)], true),
      upload('rear-ear', 'Tai sau', [layer('rear-ear', 8, -210, .5, .9, 1, .8)]),
      upload('body', 'Thân / bụng / ngực · không chân hoặc đùi', [layer('body', 0, -105, .5, .5, 2, .8)]),
      upload('hind-leg', 'Chân sau dùng lại', [layer('hind-leg-far', -45, -72, .5, .25, 3, .78), layer('hind-leg-near', -58, -76, .5, .25, 5, .9)]),
      upload('front-paw', 'Chân trước dùng lại', [layer('front-paw-far', 45, -78, .5, .2, 4, .75), layer('front-paw-near', 56, -82, .5, .2, 7, .85)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 30, -145, .5, .78, 6, .82)]), ...eyeStates(.5, .78, 6.1),
      upload('front-ear', 'Tai trước', [layer('front-ear', 38, -212, .5, .9, 8, .82)]),
      upload('tail', 'Đuôi nhỏ', [layer('tail', -72, -105, .7, .7, 9, .65)]),
      combat('attack-trail', 'Combat VFX · vệt lao', 'trail'),
      combat('impact', 'Combat VFX · va chạm ram'),
    ],
  },
  {
    id: 'turtle', name: 'Turtle', archetype: 'tank', rig: 'tank-base', validated: false,
    slots: [
      upload('shadow', 'Bóng tiếp đất', [layer('shadow', 8, -18, .5, .85, 0, .85)], true),
      upload('rear-feet', 'Hai chân sau', [layer('rear-feet', -35, -58, .5, .2, 1, .8)]),
      upload('body', 'Thân dưới / bụng / ngực · không chân hoặc đùi', [layer('body', 0, -75, .5, .5, 2, .8)]),
      upload('shell', 'Mai', [layer('shell', -10, -105, .5, .6, 3, .85)]),
      upload('front-feet', 'Hai chân trước', [layer('front-feet', 42, -58, .5, .2, 4, .8)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 78, -92, .3, .65, 5, .72)]),
      ...eyeStates(.3, .65, 5.1),
      upload('shell-runes', 'Rune trên mai', [layer('shell-runes', -10, -110, .5, .6, 6, .85, 'shell')], true),
      combat('attack-cast', 'Combat VFX · tích năng trên mai', 'cast'),
      combat('cage', 'Combat VFX · lồng nguyên tố'),
      combat('impact', 'Combat VFX · khóa mục tiêu'),
    ],
  },
  {
    id: 'golem', name: 'Golem', archetype: 'tank', rig: 'tank-base', validated: false,
    slots: [
      upload('shadow', 'Bóng tiếp đất', [layer('shadow', 0, -20, .5, .85, 0, .9)], true),
      upload('rear-arm', 'Tay sau', [layer('rear-arm', -62, -130, .55, .18, 1, .85)]),
      upload('rear-leg', 'Chân sau', [layer('rear-leg', -35, -70, .5, .2, 2, .85)]),
      upload('torso', 'Thân', [layer('torso', 0, -125, .5, .5, 3, .85)]),
      upload('core', 'Lõi', [layer('core', 0, -130, .5, .5, 4, .75, 'torso')]),
      upload('front-leg', 'Chân trước', [layer('front-leg', 35, -70, .5, .2, 5, .9)]),
      upload('front-arm', 'Tay trước', [layer('front-arm', 62, -130, .45, .18, 6, .9)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 0, -185, .5, .8, 7, .72)]),
      ...eyeStates(.5, .8, 7.1),
      effect('rock-fragments', 'Đá bay', layer('rock-fragments', 0, -145, .5, .5, 8, 1)),
      combat('attack-cast', 'Combat VFX · tích năng ở lõi', 'cast'),
      combat('ground-wave', 'Combat VFX · sóng chấn động'),
      combat('impact', 'Combat VFX · va chạm mặt đất'),
    ],
  },
  {
    id: 'dragon', name: 'Dragon', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [upload('back-wing', 'Cánh sau', [layer('back-wing', -45, -145, .65, .65, 1, .8)]), upload('tail', 'Đuôi', [layer('tail', -75, -105, .82, .7, 2, .8)]), upload('leg-far', 'Chân xa người xem', [layer('leg-far', 62, 11.36, .5, .2, 2.5, .8)]), upload('body', 'Thân / bụng / ngực · không chân hoặc đùi', [layer('body', 0, -120, .5, .5, 3, .78)]), upload('leg-near', 'Chân gần người xem', [layer('leg-near', -80.4, 7.84, .5, .2, 4, .8)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 25, -145, .35, .65, 5, .85)]), upload('head', 'Đầu (không chứa mắt)', [layer('head', 55, -165, .5, .82, 6, .8)]), ...eyeStates(.5, .82, 6.1), upload('horns', 'Sừng', [layer('horns', 52, -205, .5, .85, 7, .8, 'head')], true), combat('attack-cast', 'Combat VFX · tích năng ở miệng', 'cast'), combat('meteor', 'Combat VFX · thiên thạch'), combat('impact', 'Combat VFX · thiên thạch va chạm')],
  },
  {
    id: 'owl', name: 'Owl', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [upload('back-wing', 'Cánh sau', [layer('back-wing', -55, -125, .75, .5, 1, .82)]), upload('tail-feathers', 'Lông đuôi', [layer('tail-feathers', 0, -72, .5, .25, 2, .78)]), upload('body', 'Thân / bụng / ngực · không chân hoặc cánh', [layer('body', 0, -125, .5, .5, 3, .82)]), upload('talons', 'Móng', [layer('talons', 0, -62, .5, .2, 4, .72)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 55, -125, .25, .5, 5, .85)]), upload('head', 'Đầu / face disc (không chứa mắt)', [layer('head', 0, -175, .5, .75, 6, .85)]), ...eyeStates(.5, .75, 6.1), upload('forehead-rune', 'Rune trán', [layer('forehead-rune', 0, -190, .5, .5, 7, .85, 'head')], true), combat('attack-cast', 'Combat VFX · tích năng orb', 'cast'), combat('projectile', 'Combat VFX · orb bay'), combat('impact', 'Combat VFX · orb va chạm')],
  },
  {
    id: 'hawk', name: 'Hawk', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [upload('rear-wing', 'Cánh sau', [layer('rear-wing', -65, -130, .75, .5, 1, .82)]), upload('tail-fan', 'Đuôi quạt', [layer('tail-fan', -25, -75, .5, .2, 2, .8)]), upload('body', 'Thân / bụng / ngực · không chân hoặc cánh', [layer('body', 0, -120, .5, .5, 3, .8)]), upload('talons', 'Móng', [layer('talons', 15, -68, .5, .2, 4, .72)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 55, -130, .25, .5, 5, .86)]), upload('head', 'Đầu (không chứa mắt)', [layer('head', 48, -165, .5, .75, 6, .76)]), ...eyeStates(.5, .75, 6.1), upload('crest', 'Mào', [layer('crest', 42, -198, .5, .8, 7, .78, 'head')], true), combat('attack-trail', 'Combat VFX · vệt bổ nhào', 'trail'), combat('vortex', 'Combat VFX · lốc xoáy'), combat('impact', 'Combat VFX · va chạm lốc')],
  },
  {
    id: 'slime', name: 'Slime', archetype: 'blob', rig: 'blob-base', validated: false,
    slots: [
      upload('blob', 'Khối slime · không lõi, mặt hoặc highlight', [layer('blob', 0, -90, .5, .7, 1, .9)]),
      upload('inner-core', 'Lõi nguyên tố bên trong', [layer('inner-core', 0, -100, .5, .5, 2, .75, 'blob')], true),
      upload('face', 'Biểu cảm · chân mày, miệng và má · không mắt', [layer('face', 12, -105, .5, .5, 3, .85, 'blob')]),
      upload('eyes-open', 'Đôi mắt mở · chỉ chứa mắt', [{ ...layer('eyes-open', 12, -105, .5, .5, 3.1, .85, 'blob'), blink: 'open' }]),
      upload('eyes-closed', 'Đôi mắt nhắm · chỉ chứa mí mắt', [{ ...layer('eyes-closed', 12, -105, .5, .5, 3.11, .85, 'blob'), blink: 'closed' }]),
      upload('front-gloss', 'Highlight bề mặt phía trước', [layer('front-gloss', -15, -125, .5, .5, 4, .85, 'blob')], true),
      effect('top-effect', 'Effect nguyên tố trên đỉnh', layer('top-effect', 0, -175, .5, .8, 5, .8)),
      combat('attack-cast', 'Combat VFX · nén năng lượng', 'cast'),
      combat('pulse', 'Combat VFX · vòng xung kích 360°'),
      combat('impact', 'Combat VFX · xung kích trúng đích'),
    ],
  },
  {
    id: 'serpent', name: 'Serpent', archetype: 'serpent', rig: 'serpent-base', validated: false,
    slots: [
      upload('shadow', 'Bóng tiếp đất', [layer('shadow', 0, -18, .5, .85, 0, .85)], true),
      upload('tail', 'Đuôi', [layer('tail', -65, -60, .8, .5, 1, .8)]),
      upload('body-lower', 'Thân dưới / cuộn', [layer('body-lower', 0, -75, .5, .5, 2, .85)]),
      upload('body-upper', 'Thân trên / cổ', [layer('body-upper', 15, -135, .5, .8, 3, .82)]),
      upload('head', 'Đầu (không chứa mắt)', [layer('head', 35, -190, .5, .8, 4, .8)]),
      ...eyeStates(.5, .8, 4.1),
      upload('jaw', 'Hàm', [layer('jaw', 58, -170, .45, .2, 5, .8, 'head')], true),
      upload('crest', 'Mào', [layer('crest', 30, -215, .5, .85, 6, .8, 'head')], true),
      combat('attack-cast', 'Combat VFX · tích năng ở miệng', 'cast'),
      combat('beam', 'Combat VFX · tia xuyên'),
      combat('impact', 'Combat VFX · tia va chạm'),
    ],
  },
];

export const speciesTemplate = (id: string) => SPECIES_TEMPLATES.find(item => item.id === id);
export const archetypeFor = (id: string) => PET_ARCHETYPES.find(item => item.id === id);
export function slotsForEvolution(template: SpeciesTemplate, level: EvolutionLevel): UploadSlot[] {
  const override = template.evolutionSlots?.[level];
  if (!override) return template.slots;
  const replace = new Set(override.replace);
  const firstReplacement = template.slots.findIndex(slot => replace.has(slot.id));
  const slots = template.slots.filter(slot => !replace.has(slot.id));
  slots.splice(firstReplacement < 0 ? slots.length : firstReplacement, 0, ...override.slots);
  return slots;
}

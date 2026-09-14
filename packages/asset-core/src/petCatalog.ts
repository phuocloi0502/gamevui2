import type { Layer } from './types';

export type PetArchetypeId = 'quadruped' | 'hopper' | 'tank' | 'winged' | 'blob' | 'serpent';
export type PetSpeciesId = 'fox' | 'wolf' | 'bunny' | 'turtle' | 'golem' | 'dragon' | 'owl' | 'hawk' | 'slime' | 'serpent';
export type PetElement = 'fire' | 'water' | 'wind' | 'light' | 'shadow';

export interface UploadSlot {
  id: string;
  label: string;
  file: string;
  folder: 'layers' | 'effects';
  optional?: boolean;
  closedFor?: string;
  projectile?: boolean;
  runtimeSize?: { width: number; height: number };
  instances?: Array<Omit<Layer, 'src' | 'closedSrc'>>;
}

export interface SpeciesTemplate {
  id: PetSpeciesId;
  name: string;
  archetype: PetArchetypeId;
  rig: string;
  validated: boolean;
  slots: UploadSlot[];
}

const layer = (id: string, x: number, y: number, originX: number, originY: number, z: number, scale = 1, parent?: string) =>
  ({ id, x, y, originX, originY, z, scale, ...(parent ? { parent } : {}) });
const upload = (id: string, label: string, instances: Array<Omit<Layer, 'src' | 'closedSrc'>>, optional = false, runtimeSize?: { width: number; height: number }): UploadSlot =>
  ({ id, label, file: `${id}.png`, folder: 'layers', instances, optional, ...(runtimeSize ? { runtimeSize } : {}) });
const effect = (id: string, label: string, instance: Omit<Layer, 'src' | 'closedSrc'>, projectile = false, runtimeSize?: { width: number; height: number }): UploadSlot =>
  ({ id, label, file: `${id}.png`, folder: 'effects', instances: [instance], optional: true, projectile, ...(runtimeSize ? { runtimeSize } : {}) });
const closed = (target: string, runtimeSize?: { width: number; height: number }): UploadSlot =>
  ({ id: `${target}-closed`, label: 'Đầu / mắt nhắm (blink)', file: `${target}-closed.png`, folder: 'layers', optional: true, closedFor: target, ...(runtimeSize ? { runtimeSize } : {}) });
const shadow = (runtimeSize?: { width: number; height: number }) => upload('shadow', 'Bóng dưới chân', [layer('shadow', 0, 0, .5, .5, 0, .85)], true, runtimeSize);

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
    id: 'fox', name: 'Fox', archetype: 'quadruped', rig: 'quadruped-base', validated: true,
    slots: [
      shadow({ width: 320, height: 64 }),
      upload('tail', 'Đuôi', [layer('tail', -65, -105, .85, .85, 1, .75)], false, { width: 228, height: 220 }),
      effect('elemental-effect', 'Effect nguyên tố ở đuôi', layer('element-effect', -158, -145, .5, .95, 2, .95, 'tail'), true, { width: 101, height: 163 }),
      upload('leg', 'Một chân dùng lại 4 lần', [
        layer('rear-far', -53, -79, .5, .15, 3, .72), layer('front-far', 59, -81, .5, .15, 4, .74),
        layer('rear-near', -74, -87, .5, .15, 6, .84), layer('front-near', 28, -90, .5, .15, 7, .86),
      ], false, { width: 70, height: 123 }),
      upload('body', 'Thân', [layer('body', 0, -117, .5, .5, 5, .68)], false, { width: 308, height: 225 }),
      upload('head', 'Đầu mở mắt', [layer('head', 39, -151, .5, .88, 8, .78)], false, { width: 302, height: 318 }),
      closed('head', { width: 302, height: 318 }),
    ],
  },
  {
    id: 'wolf', name: 'Wolf', archetype: 'quadruped', rig: 'quadruped-base', validated: false,
    slots: [
      shadow(), upload('tail', 'Đuôi', [layer('tail', -72, -108, .82, .82, 1, .8)]),
      upload('leg', 'Một chân dùng lại 4 lần', [layer('rear-far', -55, -82, .5, .15, 2, .8), layer('front-far', 62, -84, .5, .15, 3, .8), layer('rear-near', -72, -90, .5, .15, 6, .9), layer('front-near', 35, -92, .5, .15, 7, .9)]),
      upload('body', 'Thân dài', [layer('body', 0, -122, .5, .5, 4, .75)]),
      upload('mane', 'Bờm', [layer('mane', 25, -140, .5, .6, 5, .8)], true),
      upload('head', 'Đầu', [layer('head', 55, -154, .5, .82, 8, .76)]), closed('head'),
      upload('jaw', 'Hàm dưới', [layer('jaw', 72, -132, .45, .2, 9, .76, 'head')], true),
      effect('fang-effect', 'Effect nanh', layer('fang-effect', 95, -145, .5, .5, 10, .8), true),
    ],
  },
  {
    id: 'bunny', name: 'Bunny', archetype: 'hopper', rig: 'hopper-base', validated: false,
    slots: [
      shadow(), upload('rear-ear', 'Tai sau', [layer('rear-ear', 8, -210, .5, .9, 1, .8)]),
      upload('body', 'Thân', [layer('body', 0, -105, .5, .5, 2, .8)]),
      upload('hind-leg', 'Chân sau dùng lại', [layer('hind-leg-far', -45, -72, .5, .25, 3, .78), layer('hind-leg-near', -58, -76, .5, .25, 5, .9)]),
      upload('front-paw', 'Chân trước dùng lại', [layer('front-paw-far', 45, -78, .5, .2, 4, .75), layer('front-paw-near', 56, -82, .5, .2, 7, .85)]),
      upload('head', 'Đầu', [layer('head', 30, -145, .5, .78, 6, .82)]), closed('head'),
      upload('front-ear', 'Tai trước', [layer('front-ear', 38, -212, .5, .9, 8, .82)]),
      upload('tail', 'Đuôi nhỏ', [layer('tail', -72, -105, .7, .7, 9, .65)]),
      effect('element-trail', 'Vệt lao nguyên tố', layer('element-trail', -90, -95, .7, .5, 10, .9), true),
    ],
  },
  {
    id: 'turtle', name: 'Turtle', archetype: 'tank', rig: 'tank-base', validated: false,
    slots: [shadow(), upload('rear-feet', 'Hai chân sau', [layer('rear-feet', -35, -58, .5, .2, 1, .8)]), upload('body', 'Thân dưới', [layer('body', 0, -75, .5, .5, 2, .8)]), upload('shell', 'Mai', [layer('shell', -10, -105, .5, .6, 3, .85)]), upload('front-feet', 'Hai chân trước', [layer('front-feet', 42, -58, .5, .2, 4, .8)]), upload('head', 'Đầu', [layer('head', 78, -92, .3, .65, 5, .72)]), closed('head'), upload('shell-runes', 'Rune trên mai', [layer('shell-runes', -10, -110, .5, .6, 6, .85, 'shell')], true), effect('element-aura', 'Aura / lồng nguyên tố', layer('element-aura', 0, -85, .5, .5, 7, 1), true)],
  },
  {
    id: 'golem', name: 'Golem', archetype: 'tank', rig: 'tank-base', validated: false,
    slots: [shadow(), upload('rear-arm', 'Tay sau', [layer('rear-arm', -62, -130, .55, .18, 1, .85)]), upload('rear-leg', 'Chân sau', [layer('rear-leg', -35, -70, .5, .2, 2, .85)]), upload('torso', 'Thân', [layer('torso', 0, -125, .5, .5, 3, .85)]), upload('core', 'Lõi', [layer('core', 0, -130, .5, .5, 4, .75, 'torso')]), upload('front-leg', 'Chân trước', [layer('front-leg', 35, -70, .5, .2, 5, .9)]), upload('front-arm', 'Tay trước', [layer('front-arm', 62, -130, .45, .18, 6, .9)]), upload('head', 'Đầu', [layer('head', 0, -185, .5, .8, 7, .72)]), effect('rock-fragments', 'Đá bay', layer('rock-fragments', 0, -145, .5, .5, 8, 1)), effect('ground-effect', 'Effect chấn động', layer('ground-effect', 0, -10, .5, .5, 9, 1), true)],
  },
  {
    id: 'dragon', name: 'Dragon', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [shadow(), upload('back-wing', 'Cánh sau', [layer('back-wing', -45, -145, .65, .65, 1, .8)]), upload('tail', 'Đuôi', [layer('tail', -75, -105, .82, .7, 2, .8)]), upload('body', 'Thân', [layer('body', 0, -120, .5, .5, 3, .78)]), upload('legs', 'Chân', [layer('legs', 12, -72, .5, .2, 4, .8)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 25, -145, .35, .65, 5, .85)]), upload('head', 'Đầu', [layer('head', 55, -165, .5, .82, 6, .8)]), closed('head'), upload('horns', 'Sừng', [layer('horns', 52, -205, .5, .85, 7, .8, 'head')], true), effect('mouth-effect', 'Effect miệng / cast', layer('mouth-effect', 105, -160, .5, .5, 8, .8), true), effect('element-aura', 'Aura nguyên tố', layer('element-aura', 0, -125, .5, .5, 9, 1))],
  },
  {
    id: 'owl', name: 'Owl', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [shadow(), upload('back-wing', 'Cánh sau', [layer('back-wing', -55, -125, .75, .5, 1, .82)]), upload('tail-feathers', 'Lông đuôi', [layer('tail-feathers', 0, -72, .5, .25, 2, .78)]), upload('body', 'Thân', [layer('body', 0, -125, .5, .5, 3, .82)]), upload('talons', 'Móng', [layer('talons', 0, -62, .5, .2, 4, .72)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 55, -125, .25, .5, 5, .85)]), upload('head', 'Đầu / face disc', [layer('head', 0, -175, .5, .75, 6, .85)]), closed('head'), upload('forehead-rune', 'Rune trán', [layer('forehead-rune', 0, -190, .5, .5, 7, .85, 'head')], true), effect('orb-effect', 'Orb nguyên tố', layer('orb-effect', 65, -155, .5, .5, 8, .8), true)],
  },
  {
    id: 'hawk', name: 'Hawk', archetype: 'winged', rig: 'winged-base', validated: false,
    slots: [shadow(), upload('rear-wing', 'Cánh sau', [layer('rear-wing', -65, -130, .75, .5, 1, .82)]), upload('tail-fan', 'Đuôi quạt', [layer('tail-fan', -25, -75, .5, .2, 2, .8)]), upload('body', 'Thân', [layer('body', 0, -120, .5, .5, 3, .8)]), upload('talons', 'Móng', [layer('talons', 15, -68, .5, .2, 4, .72)]), upload('front-wing', 'Cánh trước', [layer('front-wing', 55, -130, .25, .5, 5, .86)]), upload('head', 'Đầu', [layer('head', 48, -165, .5, .75, 6, .76)]), closed('head'), upload('crest', 'Mào', [layer('crest', 42, -198, .5, .8, 7, .78, 'head')], true), effect('wing-trail', 'Vệt cánh', layer('wing-trail', -75, -125, .5, .5, 8, .9)), effect('vortex', 'Lốc nguyên tố', layer('vortex', 70, -55, .5, .5, 9, 1), true)],
  },
  {
    id: 'slime', name: 'Slime', archetype: 'blob', rig: 'blob-base', validated: false,
    slots: [shadow(), upload('blob', 'Khối slime', [layer('blob', 0, -90, .5, .7, 1, .9)]), upload('inner-core', 'Lõi trong', [layer('inner-core', 0, -100, .5, .5, 2, .75, 'blob')], true), upload('face', 'Khuôn mặt', [layer('face', 12, -105, .5, .5, 3, .85, 'blob')]), upload('front-gloss', 'Highlight phía trước', [layer('front-gloss', -15, -125, .5, .5, 4, .85, 'blob')], true), effect('top-effect', 'Effect trên đỉnh', layer('top-effect', 0, -175, .5, .8, 5, .8), true)],
  },
  {
    id: 'serpent', name: 'Serpent', archetype: 'serpent', rig: 'serpent-base', validated: false,
    slots: [shadow(), upload('tail', 'Đuôi', [layer('tail', -65, -60, .8, .5, 1, .8)]), upload('body-lower', 'Thân dưới / cuộn', [layer('body-lower', 0, -75, .5, .5, 2, .85)]), upload('body-upper', 'Thân trên / cổ', [layer('body-upper', 15, -135, .5, .8, 3, .82)]), upload('head', 'Đầu', [layer('head', 35, -190, .5, .8, 4, .8)]), closed('head'), upload('jaw', 'Hàm', [layer('jaw', 58, -170, .45, .2, 5, .8, 'head')], true), upload('crest', 'Mào', [layer('crest', 30, -215, .5, .85, 6, .8, 'head')], true), effect('mouth-effect', 'Effect miệng / tia', layer('mouth-effect', 92, -185, .5, .5, 7, .85), true)],
  },
];

export const speciesTemplate = (id: string) => SPECIES_TEMPLATES.find(item => item.id === id);
export const archetypeFor = (id: string) => PET_ARCHETYPES.find(item => item.id === id);

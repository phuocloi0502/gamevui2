import { useEffect, useRef, type RefObject } from 'react';
import Phaser from 'phaser';
import { combatVfxPresentation, volleyShotAngles } from '../../../packages/asset-core/src/resolve';
import type { CombatVfxAnchor, CombatVfxTrigger, State } from '../../../packages/asset-core/src/types';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { stateLabels } from './labels';
import type { ResolvedPet } from './studioTypes';

function rotateToward(start: { x: number; y: number }, end: { x: number; y: number }, degrees: number) {
  if (!degrees) return end;
  const rad = degrees * Math.PI / 180;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    x: start.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: start.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function textureReady(scene: Phaser.Scene, key: string) {
  if (!scene.textures.exists(key) || key === '__MISSING') return false;
  const source = scene.textures.get(key).source[0];
  return !!source?.width;
}

export function PhaserStage({ pet, remountKey, background, playingRef, onView }: {
  pet: ResolvedPet;
  remountKey: number;
  background: string;
  playingRef: RefObject<HTMLSpanElement | null>;
  onView: (view: PetView | undefined) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | undefined>(undefined);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent) return;
    let view: PetView | undefined;
    const preview = pet.preview ?? { x: 420, y: 440, scale: 1 };
    class Preview extends Phaser.Scene {
      preload() {
        if (!pet.layers.length) this.load.image('reference', pet.reference);
        for (const layer of pet.layers) {
          if (layer.sheet) this.load.spritesheet(layer.src, layer.src, { frameWidth: layer.sheet.width, frameHeight: layer.sheet.height });
          else this.load.image(layer.src, layer.src);
        }
        for (const src of Object.values(pet.effects?.attack ?? {})) if (src) this.load.image(src, src);
      }
      create() {
        this.cameras.main.setBackgroundColor(background);
        if (pet.layers.length) {
          this.add.line(400, 447, -290, 0, 290, 0, 0x5a6476, .25);
          view = new PetView(this, preview.x, preview.y, pet);
          view.setScale(preview.scale);
          onViewRef.current(view);
          const attack = pet.effects?.attack;
          const combatEntries = Object.entries(attack ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
          const point = (anchor: CombatVfxAnchor, x: number, y: number, mirror: boolean) => {
            if (!view) return { x, y };
            const direction = Math.sign(view.scaleX) || 1;
            const scaleX = Math.abs(view.scaleX), scaleY = Math.abs(view.scaleY);
            const target = { x: view.x + direction * 330 * scaleX, y: view.y - 95 * scaleY };
            const base = anchor === 'pet' ? { x: view.x, y: view.y } : target;
            return { x: base.x + x * scaleX * (mirror ? direction : 1), y: base.y + y * scaleY };
          };
          const targetGuide = this.add.container().setDepth(100).setVisible(combatEntries.length > 0);
          targetGuide.add([
            this.add.circle(0, 0, 17, 0x91b8c7, .08).setStrokeStyle(1, 0x91b8c7, .45),
            this.add.text(0, 24, 'MỤC TIÊU', { color: '#91a9b5', fontFamily: 'sans-serif', fontSize: '8px' }).setOrigin(.5, 0),
          ]);
          const aoeRing = this.add.circle(0, 0, 65, 0x91b8c7, .04).setStrokeStyle(1, 0x91b8c7, .35).setDepth(99).setVisible(false);
          const chainGuides = [0, 1].map(() => this.add.circle(0, 0, 10, 0xab9cff, .1).setStrokeStyle(1, 0xab9cff, .4).setDepth(99).setVisible(false));
          const volleyDots = [0, 1, 2, 3, 4].map(() => this.add.circle(0, 0, 4, 0xff9a28, .35).setDepth(99).setVisible(false));

          const spawnCombatVfx = (semantic: string, src: string, shotIndex = 0, shotCount = 1) => {
            const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
            if (!config.enabled || !textureReady(this, src)) return 0;
            const meta = pet.effects?.attackMeta;
            const traveling = semantic === 'projectile' || semantic === 'trail';
            const landing = semantic === 'impact' || semantic === 'splash';
            const angles = traveling || (landing && meta?.pattern === 'volley')
              ? volleyShotAngles(meta, shotIndex, shotCount)
              : [0];
            const chainCount = semantic === 'impact' && meta?.pattern === 'chain' ? Math.max(0, meta.chainCount ?? 0) : 0;
            let longest = 0;
            for (const [index, angle] of angles.entries()) {
              const extraDelay = traveling && shotCount <= 1 && angles.length > 1 ? index * 40 : 0;
              const wait = Math.max(0, config.delay) + extraDelay;
              this.time.delayedCall(wait, () => {
                if (!view) return;
                const direction = config.mirror ? Math.sign(view.scaleX) || 1 : 1;
                const start = point(config.startAnchor, config.startX, config.startY, config.mirror);
                const rawEnd = point(config.endAnchor, config.endX, config.endY, config.mirror);
                const end = traveling ? rotateToward(start, rawEnd, angle) : rawEnd;
                const origin = traveling || landing ? point('pet', 0, -110, true) : start;
                const impactAt = landing && meta?.pattern === 'volley' ? rotateToward(origin, point('target', 0, 0, true), angle) : end;
                const place = landing ? impactAt : start;
                const dest = landing ? impactAt : end;
                const rootScale = Math.abs(view.scaleY);
                const image = this.add.image(place.x, place.y, src)
                  .setOrigin(config.originX, config.originY)
                  .setScale(config.startScale * rootScale)
                  .setAngle((config.startAngle + angle) * direction)
                  .setAlpha(config.startAlpha)
                  .setDepth(config.depth);
                this.tweens.add({
                  targets: image, x: dest.x, y: dest.y,
                  scaleX: config.endScale * rootScale, scaleY: config.endScale * rootScale,
                  angle: (config.endAngle + angle) * direction, alpha: config.endAlpha,
                  duration: Math.max(0, config.duration),
                  ease: config.ease,
                  onComplete: () => image.destroy(),
                });
              });
              longest = Math.max(longest, wait + Math.max(0, config.duration));
            }
            for (let hop = 1; hop <= chainCount; hop++) {
              const wait = Math.max(0, config.delay) + hop * 180;
              this.time.delayedCall(wait, () => {
                if (!view) return;
                const direction = Math.sign(view.scaleX) || 1;
                const scaleX = Math.abs(view.scaleX), scaleY = Math.abs(view.scaleY);
                const target = point('target', 0, 0, true);
                const hopAt = { x: target.x + direction * hop * 78 * scaleX, y: target.y + (hop % 2 ? -22 : 18) * scaleY };
                const rootScale = Math.abs(view.scaleY);
                const image = this.add.image(hopAt.x, hopAt.y, src)
                  .setOrigin(config.originX, config.originY)
                  .setScale(config.startScale * rootScale)
                  .setAlpha(config.startAlpha)
                  .setDepth(config.depth);
                this.tweens.add({
                  targets: image,
                  scaleX: config.endScale * rootScale, scaleY: config.endScale * rootScale,
                  alpha: config.endAlpha,
                  duration: Math.max(0, config.duration),
                  ease: config.ease,
                  onComplete: () => image.destroy(),
                });
              });
              longest = Math.max(longest, wait + Math.max(0, config.duration));
            }
            return longest;
          };
          const playTrigger = (trigger: CombatVfxTrigger, shotIndex = 0, shotCount = 1) => combatEntries
            .filter(([semantic]) => {
              const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
              return config.enabled && config.trigger === trigger;
            })
            .map(([semantic, src]) => spawnCombatVfx(semantic, src, shotIndex, shotCount));
          view.on('state-start', (state: State) => {
            if (state === 'attack') playTrigger('attack-start');
          });
          view.on('marker', (_name: string, index: number, total: number) => {
            const releaseDurations = playTrigger('attack-release', index, total);
            this.time.delayedCall(Math.max(0, ...releaseDurations), () => {
              const primaryDurations = playTrigger('after-primary', index, total);
              this.time.delayedCall(Math.max(0, ...primaryDurations), () => playTrigger('after-impact', index, total));
            });
          });
          this.events.on('update', () => {
            if (!view) return;
            if (playingRef.current) playingRef.current.textContent = stateLabels[view.state];
            const target = point('target', 0, 0, true);
            targetGuide.setPosition(target.x, target.y);
            const meta = pet.effects?.attackMeta;
            const scaleX = Math.abs(view.scaleX);
            const aoe = meta?.pattern === 'splash' || meta?.pattern === 'aoe';
            aoeRing.setVisible(!!aoe).setPosition(target.x, target.y);
            if (aoe) aoeRing.setRadius(Math.max(12, (meta?.radius ?? 65) * scaleX));
            const chainCount = meta?.pattern === 'chain' ? Math.max(0, meta.chainCount ?? 0) : 0;
            const direction = Math.sign(view.scaleX) || 1;
            chainGuides.forEach((dot, hop) => {
              const show = hop < chainCount;
              dot.setVisible(show);
              if (show) {
                dot.setPosition(
                  target.x + direction * (hop + 1) * 78 * scaleX,
                  target.y + ((hop + 1) % 2 ? -22 : 18) * Math.abs(view.scaleY),
                );
              }
            });
            const volleyCount = meta?.pattern === 'volley' ? Math.max(1, meta.volleyCount ?? 1) : 0;
            const origin = point('pet', 0, -110, true);
            const angles = volleyCount ? volleyShotAngles(meta, 0, 1) : [];
            volleyDots.forEach((dot, i) => {
              const show = i < volleyCount && i < angles.length;
              dot.setVisible(show);
              if (show) {
                const land = rotateToward(origin, target, angles[i]);
                dot.setPosition(land.x, land.y);
              }
            });
          });
        } else {
          const ref = this.add.image(400, 275, 'reference');
          ref.setScale(Math.min(780 / ref.width, 520 / ref.height));
          onViewRef.current(undefined);
        }
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent, backgroundColor: background,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 550 },
      scene: Preview,
    });
    gameRef.current = game;
    const resize = new ResizeObserver(() => game.scale.refresh());
    resize.observe(parent);
    return () => {
      resize.disconnect();
      onViewRef.current(undefined);
      gameRef.current = undefined;
      game.destroy(true);
    };
  }, [pet.id, remountKey]);

  useEffect(() => {
    gameRef.current?.scene.getScenes(true)[0]?.cameras.main.setBackgroundColor(background);
  }, [background]);

  return <div id="stage" ref={hostRef} />;
}

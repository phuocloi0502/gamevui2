import { useEffect, useRef, type RefObject } from 'react';
import Phaser from 'phaser';
import { combatVfxPresentation } from '../../../packages/asset-core/src/resolve';
import type { CombatVfxAnchor, CombatVfxTrigger, State } from '../../../packages/asset-core/src/types';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { stateLabels } from './labels';
import type { ResolvedPet } from './studioTypes';

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
            const baseX = anchor === 'pet' ? view.x : view.x + direction * 330 * scaleX;
            const baseY = anchor === 'pet' ? view.y : view.y - 95 * scaleY;
            return { x: baseX + x * scaleX * (mirror ? direction : 1), y: baseY + y * scaleY };
          };
          const targetGuide = this.add.container().setDepth(100).setVisible(combatEntries.length > 0);
          targetGuide.add([
            this.add.circle(0, 0, 17, 0x91b8c7, .08).setStrokeStyle(1, 0x91b8c7, .45),
            this.add.text(0, 24, 'MỤC TIÊU', { color: '#91a9b5', fontFamily: 'sans-serif', fontSize: '8px' }).setOrigin(.5, 0),
          ]);
          const spawnCombatVfx = (semantic: string, src: string) => {
            const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
            if (!config.enabled) return 0;
            this.time.delayedCall(Math.max(0, config.delay), () => {
              if (!view) return;
              const direction = config.mirror ? Math.sign(view.scaleX) || 1 : 1;
              const start = point(config.startAnchor, config.startX, config.startY, config.mirror);
              const end = point(config.endAnchor, config.endX, config.endY, config.mirror);
              const rootScale = Math.abs(view.scaleY);
              const image = this.add.image(start.x, start.y, src)
                .setOrigin(config.originX, config.originY)
                .setScale(config.startScale * rootScale)
                .setAngle(config.startAngle * direction)
                .setAlpha(config.startAlpha)
                .setDepth(config.depth);
              this.tweens.add({
                targets: image, x: end.x, y: end.y,
                scaleX: config.endScale * rootScale, scaleY: config.endScale * rootScale,
                angle: config.endAngle * direction, alpha: config.endAlpha,
                duration: Math.max(0, config.duration),
                ease: config.ease,
                onComplete: () => image.destroy(),
              });
            });
            return Math.max(0, config.delay) + Math.max(0, config.duration);
          };
          const playTrigger = (trigger: CombatVfxTrigger) => combatEntries
            .filter(([semantic]) => {
              const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
              return config.enabled && config.trigger === trigger;
            })
            .map(([semantic, src]) => spawnCombatVfx(semantic, src));
          view.on('state-start', (state: State) => {
            if (state === 'attack') playTrigger('attack-start');
          });
          view.on('marker', () => {
            const durations = playTrigger('attack-release');
            this.time.delayedCall(Math.max(0, ...durations), () => playTrigger('after-primary'));
          });
          this.events.on('update', () => {
            if (!view) return;
            if (playingRef.current) playingRef.current.textContent = stateLabels[view.state];
            const target = point('target', 0, 0, true);
            targetGuide.setPosition(target.x, target.y);
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
    return () => {
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

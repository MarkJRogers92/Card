import { useEffect, useRef, useState } from "react";
import { AnimatedSprite, Application, Assets, Graphics, Rectangle, Texture } from "pixi.js";

/**
 * Development-only PixiJS surface for the Morrow character asset.
 *
 * This is deliberately separate from the production battle UI: it exists so the approved sprite
 * sheet and its manifest can be loaded through the real runtime, at real scale, before any of it is
 * wired into combat. Reachable at `/?preview=morrow`.
 */

const SHEET_DIRECTORY = "/assets/characters/morrow";
const MANIFEST_FILE = "morrow_walk.manifest.json";
const STAGE_SIZE = 320;
const GROUND_Y = 266;

type MorrowManifest = {
  character: string;
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  animations: Record<string, number[]>;
  totalFrames: number;
  fps?: number;
};

type PreviewProbe = {
  ready: boolean;
  character: string;
  animations: string[];
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  scaleMode: string;
  stageSize: number;
  groundY: number;
  spriteBounds: { x: number; y: number; width: number; height: number };
  currentFrame: () => number;
};

declare global {
  interface Window {
    __morrowPreview?: PreviewProbe;
  }
}

export function MorrowPreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let initialized = false;
    const app = new Application();

    // Pixi 8 cannot be destroyed before init() resolves: the resize plugin has not installed its
    // handlers yet, and destroying early throws. StrictMode mounts, cleans up, then remounts, so
    // teardown is only valid once init has actually completed.
    function teardown(): void {
      if (!initialized) return;
      initialized = false;
      try {
        app.destroy(true);
      } catch {
        // The application was already torn down.
      }
    }

    async function start(): Promise<void> {
      await app.init({
        width: STAGE_SIZE,
        height: STAGE_SIZE,
        background: 0x111217,
        antialias: false,
        resolution: 1,
        autoDensity: false,
      });
      initialized = true;
      if (disposed) {
        teardown();
        return;
      }
      const host = hostRef.current;
      if (!host) {
        teardown();
        return;
      }
      host.appendChild(app.canvas);

      const manifestResponse = await fetch(`${SHEET_DIRECTORY}/${MANIFEST_FILE}`);
      if (!manifestResponse.ok) {
        throw new Error(`Manifest request failed with ${manifestResponse.status}.`);
      }
      const manifest = (await manifestResponse.json()) as MorrowManifest;
      const sheet = await Assets.load<Texture>(`${SHEET_DIRECTORY}/${manifest.sheet}`);
      if (disposed) return;

      // Nearest-neighbour is the whole point: pixel art must not be smoothed when it is scaled.
      sheet.source.scaleMode = "nearest";

      const animationName = "walk";
      const indices = manifest.animations[animationName] ?? [];
      const frames = indices.map(
        (index) =>
          new Texture({
            source: sheet.source,
            frame: new Rectangle(index * manifest.frameWidth, 0, manifest.frameWidth, manifest.frameHeight),
          }),
      );
      if (frames.length === 0) {
        throw new Error(`Manifest has no frames for "${animationName}".`);
      }

      const ground = new Graphics().rect(24, GROUND_Y, STAGE_SIZE - 48, 1).fill(0x33343d);
      app.stage.addChild(ground);

      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(manifest.anchor.x, manifest.anchor.y);
      sprite.position.set(STAGE_SIZE / 2, GROUND_Y);
      sprite.animationSpeed = (manifest.fps ?? 8) / 60;
      sprite.play();
      app.stage.addChild(sprite);

      app.ticker.add(() => {
        if (disposed) return;
        const bounds = sprite.getBounds();
        window.__morrowPreview = {
          ready: true,
          character: manifest.character,
          animations: Object.keys(manifest.animations),
          frameCount: frames.length,
          frameWidth: manifest.frameWidth,
          frameHeight: manifest.frameHeight,
          anchor: { x: sprite.anchor.x, y: sprite.anchor.y },
          scaleMode: String(sheet.source.scaleMode),
          stageSize: STAGE_SIZE,
          groundY: GROUND_Y,
          spriteBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          currentFrame: () => sprite.currentFrame,
        };
      });

      setStatus(`playing ${manifest.character} ${animationName}`);
    }

    start().catch((cause: unknown) => {
      if (disposed) return;
      setError(cause instanceof Error ? cause.message : "Preview failed.");
      setStatus("error");
    });

    return () => {
      disposed = true;
      delete window.__morrowPreview;
      teardown();
    };
  }, []);

  return (
    <section className="morrow-preview" aria-label="Morrow sprite preview">
      <h1>Morrow — sprite preview</h1>
      <div ref={hostRef} data-testid="morrow-canvas" />
      <p data-testid="morrow-preview-status">{status}</p>
      {error === null ? null : <p role="alert">{error}</p>}
    </section>
  );
}

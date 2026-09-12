# Morrow sprite handoff

Status: first production character asset is **generated, palette-controlled, and running in the
actual PixiJS runtime**. One art fix is outstanding (ground contact during the walk), and one
production decision is open (runtime scale).

## What exists now

```text
canonical 2D master  ──►  approved walk key poses  ──►  Aseprite (48-colour palette)
                                                          │
                                                          ├─ sprite sheet  (1024x256, indexed 48)
                                                          ├─ PixiJS manifest
                                                          └─ art_review QA report
                                                                   │
                                                                   └─►  Card runtime (?preview=morrow)
```

The canonical Morrow design is **2D pixel art**, not a Blender model. Re-modelling Morrow in Blender
would produce a different character, so the Blender stage was deliberately not used for this asset.

## Files in this repository

| File | Purpose |
| --- | --- |
| `public/assets/characters/morrow/morrow_walk.png` | 1024x256 indexed sprite sheet, 4 frames |
| `public/assets/characters/morrow/morrow_walk.manifest.json` | PixiJS manifest (frames, size, anchor, fps) |
| `assets/palettes/card-game-48.gpl` | Reusable 48-colour game palette (GIMP `.gpl`, Aseprite-readable) |
| `src/client/MorrowPreview.tsx` | Development-only PixiJS surface that loads the sheet |
| `src/main.tsx` | `?preview=morrow` switch; production UI is unchanged without it |
| `tests/browser/morrow-preview.spec.ts` | Runtime verification (load, anchor, nearest-neighbour, animation, console) |

## Generated working files (bridge workspace)

Base: `/Users/markrogers/Developer/ai-agent-bridge` (symlinked from `~/Tools/deepseek-mcp-bridge`)

| File | Purpose |
| --- | --- |
| `art/renders/morrow/walk/v001/frame_000..003.png` | Source key poses as staged (256x256 RGBA) |
| `art/sprites/morrow/walk/v001/morrow_walk.png` | Sheet export (indexed, 48 colours) |
| `art/sprites/morrow/walk/v001/morrow_walk.json` | Aseprite json-array frame metadata |
| `art/sprites/morrow/walk/v001/frames/frame_000..003.png` | Palette-converted per-frame PNGs |
| `art/pixel/morrow/walk/v001/look.png` | Single indexed sample used for palette validation |
| `art/manifests/morrow_walk.json` / `.ts` | Bridge manifest + TypeScript constants |
| `art/manifests/morrow_walk.review.json` | Full `art_review` QA report |
| `art/manifests/morrow_walk.preview.png` | In-game screenshot of the runtime preview |
| `art/palettes/card-game-48.gpl` | Palette source |

## Canonical design source

`/Users/markrogers/.codex/.chatgpt-projects/g-p-6aa23bb0d018819194acdfe5a2c5fceb/art/prototypes/morrow_2d_master/`

- `source/morrow_master.aseprite` — canonical identity source
- `exports/morrow_idle_master.png` — locked reference export
- `production/walk/keyposes/walk_{contact,down,passing,up}_R.png` — the approved key poses used here
- `docs/NOTES.md` — canvas/palette conventions (256x256 cell, 184px character, 48 colours, no dithering)

Read-only reference. `MORROW_PROTOTYPE_HANDOFF.md` in that archive labels the Blender prototypes as
earlier/superseded and the idle animation attempts as rejected/experimental.

## Sprite specification (reproducible for other characters)

```text
cell            256 x 256
character       184 px tall
ground row      y = 208 inside the cell
anchor          x = 0.5, y = 0.8125
palette         48 colours + transparency, no dithering
background      transparent
scaling         nearest-neighbour
frames          4 (contact, down, passing, up)
display         1x native (see open item 2)
```

## Identity features that must survive pixel reduction

1. Head silhouette — dark spiky hair plus heavy stubble.
2. Open grey-blue industrial work coat.
3. Chest harness with red tubing and canister reservoir.
4. The red-handled industrial saw in the tool hand.
5. Ivory/bloodied colour block across the torso and apron.

## How to view and verify

```sh
cd "/Users/markrogers/Documents/Github Code/Card"
npm run dev            # then open http://localhost:5173/?preview=morrow
npm run check          # types + generated content types
npm run test:browser   # includes the Morrow runtime spec
npm run build
```

The browser spec asserts: the sheet loads through PixiJS, 4 frames at 256x256, anchor (0.5, 0.8125),
`scaleMode === "nearest"`, the character's feet land on the runtime ground line, the animation
advances through its frames, and the console stays error-free.

## Verification evidence (as run)

```text
npm run check           pass (types + content types)
npm run build           pass (PixiJS now bundles; first time it is actually imported)
npm run test:browser    5/5 pass (4 existing + morrow-preview.spec.ts)
bridge npm test         121/121 pass
art_review (sheet)      10 pass / 0 warn / 1 fail / 1 skip
art_review (indexed)    palette budget PASS at 48 colours
```

## Open items

1. **Ground contact drifts during the walk (art fix needed).** Across the four key poses
   `min_x = 73` and `min_y = 24` are perfectly stable, but `max_y = 207, 207, 200, 200`. The
   character therefore lifts 5-7px off the ground during *passing* and *up* instead of keeping the
   support foot planted. `art_review` reports this as a 7px `origin_stability` failure and it was
   deliberately left visible rather than tuned away. Fix in the pixel art (lower the passing/up
   poses back to row 207) before in-between frames are drawn, or record that the lift is intended.
2. **Runtime scale decision.** The character is 184px tall against a stated 96-160px runtime
   target. Displaying at 1x is crisp; scaling to ~0.6 introduces nearest-neighbour shimmer. Decide
   whether to re-author at a smaller cell or accept the larger native size.
3. **Blender stage.** Morrow has no Blender source. If a Blender-authored Morrow is wanted, it is a
   separate re-model that will not match the approved 2D art exactly.
4. **`art_delegate` flakiness (bridge, unrelated to this asset).** Two calls returned
   `PROVIDER_PROTOCOL` ("no usable text response") while `deepseek_ask` succeeded with an equivalent
   system prompt and `reasoning: high`. Looks specific to the thinking-enabled delegation path.

## Known limitations

- The review pass reads greyscale/truecolour PNGs at pixel level. **Indexed** frames are checked at
  header level only (size, alpha flag, palette count), which is why the indexed run reports four
  `frame_decode` warnings.
- The palette ceiling is 48 plus transparency; adding shades means retiring others.
- Only the walk keys exist. No idle clip is approved (the earlier idle attempts are rejected).

## Provenance

- Card commit: `92fe516` — feat: add production Morrow character sprite and PixiJS preview
- Bridge commit: `0345bd7` — fix: apply Aseprite palette before indexed conversion
  (this fixed a real export bug: Aseprite must load `--palette` *before* `--color-mode indexed`,
  otherwise the image is re-indexed against the wrong palette and is destroyed)

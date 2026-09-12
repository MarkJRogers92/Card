# Morrow sprite handoff

Status: first production character asset is **generated, palette-controlled, and running in the
actual PixiJS runtime**. The walk ground-contact defect is corrected — every frame of the loop now
plants the support foot on the ground. Scale is settled at 184 px native 1x.

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
| `assets/characters/morrow/source/keyposes_fixed/*.png` | Corrected source key poses the sheet is built from |
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

## Ground-contact correction (walk)

The original key poses left the **support (viewer-right) boot resting at row 200 in every frame**,
while the ground row is 208. In `contact`/`down` the left foot was planted at row 207 so the
character read as standing; once the left leg lifts in `passing`/`up`, nothing touched the ground and
Morrow visibly floated.

Fix: the support boot band (`x 148-181`, rows `183-200`) was shifted down 7 rows and the vacated rows
were filled by repeating the last shin row (rows 180-182 are already identical), which lengthens the
support shin as the leg straightens — the physically expected motion at passing. Only existing
pixels are copied, so no colour is invented. The head (`min_y = 24`) and horizontal placement
(`min_x = 73`) were untouched; nothing was translated as a whole.

Measurements after the fix — all four poses identical:

```text
                 min_x  min_y  max_x  max_y   w    h
contact            73     24    181    207   109  184
down               73     24    181    207   109  184
passing            73     24    181    207   109  184   (was max_y = 200)
up                 73     24    181    207   109  184   (was max_y = 200)
```

Verified in the running game as well: every frame of the live preview reports its lowest sprite
pixel at row 265 against a stage ground line at 266.

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
art_review (sheet)      11 pass / 0 warn / 0 fail / 1 skip
art_review (indexed)    palette budget PASS at 48 colours
```

## Open items

1. **Walk frame count.** The four corrected keys form a valid minimal loop. The next decision is
   whether four strong frames are sufficient or whether Morrow benefits from 6-8 final frames —
   that is a deliberate choice, not a defect.
2. **Blender stage.** Morrow has no Blender source. If a Blender-authored Morrow is wanted, it is a
   separate re-model that will not match the approved 2D art exactly.
3. **`art_delegate` flakiness (bridge, unrelated to this asset).** Two calls returned
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

# Working on COSMOS content in Godot (writers, artists, testers)

This is the practical guide for people who will write, draw, animate or test COSMOS without changing its code. Everything in the current build (art, dialogue, layout, colours) is **provisional**. See the human-led creative production principle in `docs/production/human-led-creative-production.md` ([PR #6](https://github.com/tiagodinis90/cosmos-humboldt-rpg/pull/6)). You can replace any of it.

You need [Godot 4.7.x Standard](https://godotengine.org/download) (not the .NET version). Open `godot/project.godot` and press **F5** (Run Project).

## Where things live

| You want to change… | Edit | Code needed? |
| --- | --- | --- |
| Any line of dialogue, narration, choice label or inner voice | `godot/content/text/dialogue.csv` | No |
| Place names, hotspot labels, remarks, speaker names, dates | `godot/content/text/world.csv` | No |
| Fieldbook entries (what a measurement or testimony says) | `godot/content/text/evidence.csv` | No |
| Buttons, hints and other interface words | `godot/content/text/ui.csv` | No |
| Who says what, in which order; choices; checks; flags | `godot/content/dialogue/<conversation>.json` | No (JSON, see below) |
| What a hotspot does (conversation, remark, which variant) | `"interactions"` in `godot/content/scenes/cumana.json` | No |
| Building and object positions, sizes, heights | `"structures"` in `godot/content/scenes/cumana.json` | No |
| How a building, object or person looks | a scene of your own in `godot/art/…`, linked from `"visual"` | No |
| Interface colours, fonts, panel styles | `godot/ui/theme/cosmos_theme.tres` (Godot's theme editor) | No |
| Interface layout | `godot/scenes/ui/*.tscn` (Godot's 2D/Control editor). The dialogue panel's position follows the window: set `wide_left` and `tall_top` on its root node in the Inspector | No |
| Which language is shown | Project Settings → `cosmos/text/locale`, or F1 → Language | No |
| Rules: walking, checks, saving | `godot/src/domain/*.gd` | Yes (programmers) |

The text files are ordinary CSV and open in LibreOffice Calc, Excel or Google Sheets. Keep the first column (`key`) as it is and edit the `en` column. Text containing commas, quotes or line breaks must be in double quotes (spreadsheets do this for you); a quote that is opened and never closed is reported with its file and line.

**To add a language**, add a column named after it (for example `pt`) and fill it in. Choose the language with F1 → Language while playing, or for good in Project Settings → `cosmos/text/locale` (or start the game with `-- --locale=pt`). Any empty cell shows the English text, so a half-finished translation is playable.

## The loop: edit → check → see it

1. Edit a file in `godot/content`.
2. In the running game, press **F5** to reload all content. Humboldt stays where he is and the save is kept; an open conversation is redrawn with your new text. If the scene file cannot be read (a missing comma, say), the game keeps the version it has and tells you, so you can fix the file and press F5 again.
3. Press **F1** (playtest tools) to:
   - check the content for mistakes ("Check content");
   - switch language;
   - jump between July and November;
   - raise or lower skills to see gated lines;
   - open any conversation directly;
   - open its **graph** view.
4. Without opening the game, run `godot --headless --path godot -s res://tools/validate_content.gd`. It lists problems in plain sentences and exits with an error when something is wrong. CI runs the same check. Examples of what it catches:
   - `Missing text 'bonpland.line.bon.helped' (used by bonpland / card bon.helped)…`
   - `dialogue/bonpland.json, card 'bon.helped': unknown field 'text_kye' (did you mean 'text_key'?).`
   - `dialogue/bonpland.json, card 'bon.start': 'otherwise' is missing.`
   - `… check: unknown skill 'empaty' (use one of: logic, empathy, aesthetics, political).`
   - `Structure 'well': the visual … needs a Sprite2D child named "Sprite" with a picture.`

Missing text never crashes the game: it shows up in-game as `⟦the.key⟧` so you can spot it. A conversation file with problems is left out of the game until it is fixed; walking up to that character shows a message pointing to Check content.

The automated tests run on a frozen copy of the original content (`godot/tests/parity/content`), not on `godot/content`, so your edits never make them fail; only the content check does, when something is actually broken.

## Reading and changing a conversation

Open the graph view (F1 → `graph` next to a conversation, or run `res://scenes/tools/graph_inspector.tscn` with F6 in the editor). Each box is a **card**; arrows show where it can lead.

A conversation file has:

- `title_key`, `place_key`: the header.
- `exits`: the choice ids that just end the conversation (for example "Leave him to the press").
- `graph.start`: the first card.
- `graph.cards`, one of each type:
  - `line`: someone speaks or narration happens. Fields: `speaker` (an id such as `bonpland`, `narrator`, `logic`), `text_key`, `next`. Optionally `sets`: flags recorded when this line is reached.
  - `choice`: the player chooses. Each choice has `id`, `label_key` and `next`, plus optional:
    - `when`: only offered if the condition holds.
    - `flags`: recorded when chosen.
    - `check`: a dice check. It has `kind` (`white` or `red`), `skill`, `difficulty`, the `success` and `failure` cards, and optional `modifiers`.
  - `passive`: inner voices that speak if a skill is high enough (`probes`).
  - `fork`: goes to the first route whose condition holds, otherwise to `otherwise`.
  - `end`: the conversation ends.
- `consequences`: what changes when the conversation closes. Each rule has `when` (a condition over flags) or `when_new` (a flag first set in this conversation), and gives `evidence` (a fieldbook entry) or `bonpland` (relationship/morale change).

Conditions look like `{"op": "flag", "name": "cumana_fieldwork_complete"}`, `{"op": "skill", "skill": "logic", "atLeast": 2}`, `{"op": "all", "conditions": [...]}`, `{"op": "any", ...}`, `{"op": "not", "condition": ...}`. The graph view writes them out in words.

**Check rules (the same as the browser prototype):**
- A check rolls 2d6 + skill + modifiers against the difficulty.
- A double six always passes; a double one always fails.
- A **red** check can be tried only once, ever.
- A **white** check can be retried only after the player's score for it has gone up.
- Tried checks are remembered across conversations and saves.

### Safe edits and edits that need care

- **Always safe:** changing any text in the CSV files, adding a language column, reordering CSV rows.
- **Safe:** adding new cards, choices, flags or keys with new ids.
- **Needs care:** renaming or deleting an existing card id, choice id, check id or flag. Old saves refer to them. A conversation saved in the middle of a deleted card is closed when the save loads (the player starts it again; checks already tried stay tried), and a renamed flag is simply not set in old saves. If you rename something players have already reached, tell a programmer so a save migration can be written.
- **Run the check** (F1 → Check content, or the validator) after any JSON edit. A missing comma is reported with its line number.

### History and invention

Facts and inventions are recorded in [`docs/source-ledger.md`](source-ledger.md). Writers are free to change tone and dialogue; when a line states a historical fact (a date, a reading, who was where), keep it consistent with the ledger or update the ledger with the source. Values that are illustrative (for example the shade temperature) are marked as such in the fieldbook text; keep that marking unless you have a source.

## Replacing art

Nothing visual is baked into the game rules. Each building, object and person is drawn by a **visual scene** that the game creates and positions. Today they are drawn by provisional vector scripts in `godot/art/provisional/`. To replace one:

1. **Start from a template.** `godot/art/templates/structures/<id>.png` is the current look of each building, at the size the game draws it. The matching `<id>.json` gives `anchor_px`: the pixel that must sit on the building's front ground corner. `godot/art/templates/characters/humboldt_sheet.png` is a sprite sheet with 8 rows (directions e, se, s, sw, w, nw, n, ne) and 9 columns (idle, then 8 walk frames). Each cell is 64×96 with the feet at (32, 88). To regenerate the templates from the provisional art, run `godot --path godot -s res://tools/export_art_templates.gd` (it needs a display).
2. **Paint** over the template, or make something entirely new at a similar scale. Save it under `godot/art/painted/…`; never save over `art/templates`, which can be regenerated.
3. **Make a visual scene.** In Godot: New Scene → Node2D → attach the right script, then add your painting as a child named `Sprite`:
   - **Buildings and objects:** script `res://art/sprite_structure.gd`; a `Sprite2D` named `Sprite`. Set `anchor_px` in the Inspector to the pixel of the front ground corner. For variants that should appear after a story event, add more `Sprite2D` children named after the period (`november`) or a flag (`cumana_survey_complete`); the game shows the matching one.
   - **Characters:** script `res://art/sprite_figure.gd`; an `AnimatedSprite2D` named `Sprite` with animations named `idle_s`, `walk_s`, `idle_se`, `walk_se` and so on. Paint `s`, `n` and the east side (`e`, `se`, `ne`); the west side (`w`, `sw`, `nw`) is mirrored automatically. Or add plain `idle` and `walk` animations, used for any direction you have not painted. The content check lists any direction with nothing to show. Put the origin at the feet.
4. **Link it** in `godot/content/scenes/cumana.json`: set `"visual": "res://art/painted/…tscn"` on the structure or figure, or under `"player"` for Humboldt. Leave `"visual": ""` to keep the provisional drawing. A scene that does not follow these steps (no script, or the child not named `Sprite`) is reported by the content check, and the game shows the provisional drawing instead of crashing.
5. Press **F5** in the running game, or restart it, to see your art in place. Walk around it: the game sorts depth and fades a building when it hides Humboldt, using the building's footprint, so you never edit draw orders.

Two worked examples are included:
- **`art/examples/well_painted.tscn`** is already used in the game for the well.
- **`art/examples/humboldt_sprites.tscn`** is not used by default; set `"player": {"visual": "res://art/examples/humboldt_sprites.tscn"}` to try it.

They show the structure of a replacement scene. The pictures are still the provisional art.

**Replacing the ground.** The ground (sand, sea, lanes, backdrop) is drawn by `art/provisional/ground_visual.gd`. A painted ground can replace it later. Ask a programmer to add a `"ground"` visual to the scene file, as was done for structures; it is a small change, but it is not done yet.

**Interface.** Open `godot/ui/theme/cosmos_theme.tres` in Godot's theme editor to change colours, fonts and panel styles. The labels use named styles (`SmallCaps`, `HeaderLarge`, `Muted`, `Ink…` for the fieldbook page), so one change restyles every screen. Do not run `tools/build_theme.gd` after editing the theme by hand: it regenerates the provisional theme and would overwrite your work.

## What is not yet editable without code

- New hotspot behaviours beyond: open a conversation, show a remark (with an optional inner voice) or point to a chapter.
- New kinds of consequence beyond fieldbook entries, flags and Bonpland's relationship/morale.
- The ground visual (see above).
- Sound and music: there is no audio system yet.
- The July–November chapter with Inés (`cumana-fieldwork`): it is only playable in the browser prototype. In Godot, Inés gives a note saying so.

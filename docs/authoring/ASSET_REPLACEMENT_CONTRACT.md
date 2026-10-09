# COSMOS asset replacement contract

Asset records are part of portable content data and are independent of engine scenes. Each record uses a stable `id`, a semantic `role`, a project-relative or Godot `res://` path, `status`, pixel dimensions, file `format`, and human-readable `importNotes`.

## Authoring and replacement

- Replace the file behind an existing asset ID when the replacement serves the same role. Do not change dialogue, graph IDs, conditions, or gameplay code to swap art.
- Add a new ID when the role or meaning changes. Update references in a deliberate content change.
- Keep source artwork outside generated/imported engine caches. Preserve the layered source (for example, Krita, SVG, or PSD) where licensing permits and commit the export used by the game.
- Check framing, transparency, color profile, dimensions, animation frame order, and readable silhouette at the intended in-game display size. Preview the replacement in the actual UI before marking it reviewed.
- Respect each artist's credit, rights, attribution, and agreed usage. Never replace provisional art with generated or borrowed art and present it as a human collaborator's approved work.

## Provisional example

The synthetic example includes `researcher.portrait`: PNG, 512 × 512, transparent-background portrait placeholder. It is marked `draft`; it is not a request for a particular character design and is not final art. Future project asset records should specify their own intended display dimensions and import needs.

## Godot import notes

Godot imports images as textures and animation sources according to project settings. Keep resource paths stable where possible, avoid editing `.godot/imported` outputs, and verify filtering, mipmaps, compression, alpha handling, and pixel-art filtering in the Godot import dock for each asset class. Sprite sheets must document frame width/height, rows/columns, frame order, and loop expectations in `importNotes`. Portraits should document crop/safe area; UI art should document nine-slice margins when applicable.

The schema intentionally records requirements rather than hard-coding renderer settings. The Godot project owner should establish the project's import presets and share them with artists before production assets are commissioned.

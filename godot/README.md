# COSMOS: Humboldt (Godot 4.7)

The first Godot vertical slice: Cumaná, 1799, as a walkable isometric scene. You can walk Humboldt around the town, talk to Bonpland, take a skill check, see the consequence and reload the save.

**All art and dialogue are provisional placeholders** for human writers and artists to replace; see [the content workflow](../docs/godot-content-workflow.md).

## Open and play

1. Install **Godot 4.7.x Standard** (not .NET).
2. Open Godot, choose **Import**, and select this folder's `project.godot`.
3. Press **F5**.

| Action | Control |
| --- | --- |
| Walk / run | click / double-click the ground |
| Walk (relative to the screen) | WASD or arrow keys |
| Talk to / examine | click a person or object (Humboldt walks up first) |
| Show everything you can use | hold Tab |
| Dialogue | 1–9 choose, Space continue |
| Fieldbook | J |
| Playtest tools (reload content, check content, language, skills, July/November, open any conversation, graph view) | F1 |
| Reload edited content | F5 (in game) |

**Try:** walk to Bonpland at his plant press. Help him with the boards, then tell him the walls matter more than the plants: that is a red check, which can be tried only once. Close the conversation, quit and start again: Humboldt is where you left him, and Bonpland remembers. Then examine the field instruments for a white check that you can retry only when your Logic improves (F1 → Logic +).

## Tests

```
godot --headless --path godot --import                       # first time / after adding files
godot --headless --path godot -s res://tests/run_tests.gd    # 50 tests: parity, robustness and scene tests
godot --headless --path godot -s res://tools/validate_content.gd
```

How it is built and how it is checked against the browser prototype: [docs/godot-architecture.md](../docs/godot-architecture.md).

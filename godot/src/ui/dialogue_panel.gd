extends PanelContainer
## Conversation log over the right side of the scene (bottom on tall
## screens), so Cumaná stays visible while you talk. Keys: 1–9 choose,
## Space/Enter continue. Layout lives in res://scenes/ui/dialogue_panel.tscn
## and colours in the theme, so both can be restyled without code.

signal evidence_gained(count: int)

const SKILL_COLOURS := {
	"logic": "#8fb8d8", "empathy": "#e0a2a8", "aesthetics": "#c7a6e2", "political": "#e4b766",
}

## Where the panel sits. On wide screens it takes the right side from
## `wide_left` (a fraction of the width); on tall screens the bottom from
## `tall_top`. Edit these in the Inspector; the panel follows the window.
@export_range(0.0, 1.0) var wide_left := 0.58
@export_range(0.0, 1.0) var tall_top := 0.38
## Screens wider than this ratio (width / height) use the side layout.
@export var wide_ratio := 1.2

@onready var _place: Label = %Place
@onready var _title: Label = %Title
@onready var _log: RichTextLabel = %Log
@onready var _prompt: Label = %Prompt
@onready var _choices: VBoxContainer = %Choices
@onready var _continue: Button = %Continue

var _rendered_key := ""


func _ready() -> void:
	_continue.focus_mode = Control.FOCUS_NONE
	_continue.pressed.connect(_on_continue)
	Session.state_changed.connect(render)
	Session.content_reloaded.connect(func():
		_rendered_key = ""
		render())
	get_viewport().size_changed.connect(_layout)
	_layout()
	render()


func _layout() -> void:
	var size := get_viewport_rect().size
	if size.x >= size.y * wide_ratio:
		anchor_left = wide_left
		anchor_top = 0.0
	else:
		anchor_left = 0.0
		anchor_top = tall_top
	anchor_right = 1.0
	anchor_bottom = 1.0
	offset_left = 0
	offset_top = 0
	offset_right = 0
	offset_bottom = 0


func _active() -> Dictionary:
	return CosmosEncounters.active(Session.state, Session.content)


func _esc(s: String) -> String:
	return s.replace("[", "[lb]")


func render() -> void:
	var a := _active()
	visible = not a.is_empty()
	if a.is_empty():
		_rendered_key = ""
		return
	var c := Session.content
	var progress: Dictionary = a.progress
	var key := "%s|%d|%s|%s" % [a.id, progress.get("transcript", []).size(), progress.nodeId, progress.finished]
	if key == _rendered_key:
		return
	_rendered_key = key
	_place.text = c.t(a.encounter.place_key).to_upper()
	_title.text = c.t(a.encounter.title_key)
	var lines := PackedStringArray()
	for entry in progress.get("transcript", []):
		lines.append(_entry_text(entry, a))
	_log.text = "\n\n".join(lines)
	_log.scroll_to_line(_log.get_line_count())
	for child in _choices.get_children():
		child.queue_free()
	var card: Dictionary = a.encounter.graph.cards.get(progress.nodeId, {})
	_prompt.visible = false
	_continue.visible = false
	if progress.finished:
		_continue.text = c.t("ui.dialogue.end") + "   (space)"
		_continue.visible = true
	elif card.get("type") == "line":
		_continue.text = c.t("ui.dialogue.continue") + "   (space)"
		_continue.visible = true
	elif card.get("type") == "choice":
		if card.has("prompt_key"):
			_prompt.text = c.t(card.prompt_key)
			_prompt.visible = true
		var ctx := CosmosEncounters.context(Session.state)
		var i := 0
		for choice in CosmosGraph.available_choices(a.encounter.graph, progress, ctx):
			i += 1
			var button := Button.new()
			button.name = "Choice_" + choice.id.replace(".", "_")
			button.alignment = HORIZONTAL_ALIGNMENT_LEFT
			button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			button.flat = true
			button.focus_mode = Control.FOCUS_NONE
			var label: String = c.t(choice.label_key)
			if choice.has("check"):
				var chance := CosmosGraph.success_chance(CosmosGraph.check_score(choice.check, ctx, progress), choice.check.difficulty)
				label = "[%s · %s %d%%]  %s" % [c.t("ui.check." + choice.check.kind), String(choice.check.skill).to_upper(), int(round(chance * 100.0)), label]
				button.add_theme_color_override("font_color", Color("#ffd6cf") if choice.check.kind == "red" else Color("#f4f0e4"))
			button.text = "%d.  %s" % [i, label]
			button.set_meta("choice_id", choice.id)
			button.pressed.connect(_on_choose.bind(choice.id))
			_choices.add_child(button)


func _entry_text(entry: Dictionary, a: Dictionary) -> String:
	var c := Session.content
	match entry.type:
		"choice":
			return "[color=#b9ad95]— %s[/color]" % _esc(c.t(entry.get("label_key", "")))
		"roll":
			var r: Dictionary = entry.roll
			var skill_value := float(Session.state.skills.get(r.skill, 0))
			var mod := ""
			if r.modifier != 0:
				mod = ("+" if r.modifier > 0 else "−") + str(int(absf(r.modifier)))
			var outcome := c.t("ui.dialogue.success") if r.passed else c.t("ui.dialogue.failure")
			var reasons := PackedStringArray()
			for e in r.get("explanations", []):
				reasons.append("%s %+d" % [c.t(e.reason_key), int(e.amount)])
			var text := "[font_size=13][color=%s][%s · %s %d+%d+%d%s = %d / %d — %s][/color][/font_size]" % [
				SKILL_COLOURS.get(r.skill, "#ffffff"), c.t("ui.check." + r.kind), String(r.skill).to_upper(),
				int(r.first), int(r.second), int(skill_value), mod, int(r.total), int(r.difficulty), outcome]
			if not reasons.is_empty():
				text += "\n[font_size=12][color=#9d937f]%s[/color][/font_size]" % _esc(" · ".join(reasons))
			return text
		"insight":
			for i in a.progress.insights:
				if i.id == entry.id:
					return "[color=%s]%s[/color]  %s" % [SKILL_COLOURS.get(i.skill, "#ffffff"), String(i.skill).to_upper(), _esc(c.t(i.get("text_key", "")))]
			return ""
		"line":
			var card: Dictionary = a.encounter.graph.cards.get(entry.card, {})
			var text := _esc(c.t(card.get("text_key", "")))
			var speaker: String = card.get("speaker", "narrator")
			if card.get("type") == "end" or speaker == "narrator":
				return "[i][color=#cfc3ab]%s[/color][/i]" % text
			var colour: String = SKILL_COLOURS.get(speaker, "#e4be52")
			return "[color=%s]%s[/color]  %s" % [colour, c.t("speaker." + speaker).to_upper(), text]
	return ""


func _apply(next) -> void:
	if next == null:
		push_warning("Dialogue: " + CosmosGraph.last_error)
		return
	Session.set_state(next)


func _on_continue() -> void:
	var a := _active()
	if a.is_empty():
		return
	if a.progress.finished:
		var before: int = Session.state.get("evidence", []).size()
		Session.set_state(CosmosEncounters.close(Session.state, Session.content))
		var gained: int = Session.state.get("evidence", []).size() - before
		if gained > 0:
			evidence_gained.emit(gained)
	else:
		_apply(CosmosEncounters.continue_line(Session.state, Session.content))


func _on_choose(id: String) -> void:
	_apply(CosmosEncounters.choose(Session.state, id, Session.dice, Session.content))


func _unhandled_input(event: InputEvent) -> void:
	if not visible or Session.ui_blocking or not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.is_action("cosmos_continue") and _continue.visible:
		_on_continue()
		get_viewport().set_input_as_handled()
		return
	var n: int = event.physical_keycode - KEY_0
	var buttons := _choices.get_children().filter(func(b): return not b.is_queued_for_deletion())
	if n >= 1 and n <= 9 and n <= buttons.size():
		_on_choose(buttons[n - 1].get_meta("choice_id"))
		get_viewport().set_input_as_handled()


## Choice ids currently offered (used by tests and the dev panel).
func offered_choices() -> Array:
	return _choices.get_children().filter(func(b): return not b.is_queued_for_deletion()).map(func(b): return b.get_meta("choice_id"))

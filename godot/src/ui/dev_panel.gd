extends PanelContainer
## Playtest tools for writers, artists and testers (F1). Lets you reload
## edited content without restarting, check it for mistakes, jump the story
## state, change skills and open any conversation directly. Nothing here is
## part of the game rules; it only edits Session.state like the game does.

signal inspect_requested(encounter_id: String)

var _box: VBoxContainer
var _status: Label
var _problems: RichTextLabel


func _ready() -> void:
	visible = false
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 16)
	add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	_box = VBoxContainer.new()
	_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_box)
	Session.state_changed.connect(func(): if visible: _render())


func toggle() -> void:
	visible = not visible
	Session.ui_blocking = visible
	if visible:
		_render()


func _button(text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(action)
	return b


func _row(children: Array) -> HBoxContainer:
	var row := HBoxContainer.new()
	for c in children:
		row.add_child(c)
	return row


func _render() -> void:
	for child in _box.get_children():
		child.queue_free()
	var c := Session.content
	var title := Label.new()
	title.text = c.t("ui.dev.title")
	title.theme_type_variation = "HeaderMedium"
	_box.add_child(title)
	_status = Label.new()
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status.theme_type_variation = "Muted"
	var p: Dictionary = Session.state.get("exploration", {}).get("position", {}) if Session.state.get("exploration") is Dictionary else {}
	_status.text = "Save: %s (%s)\nPeriod: %s · Position: %s\nFlags: %s" % [
		ProjectSettings.globalize_path(Session.save_path), Session.last_load_status,
		CosmosEncounters.period(Session.state.flags),
		"(%.0f, %.0f)" % [p.get("x", 0.0), p.get("y", 0.0)] if not p.is_empty() else "spawn",
		", ".join(PackedStringArray(Session.state.flags)) if not Session.state.flags.is_empty() else "none"]
	_box.add_child(_status)
	_box.add_child(_row([
		_button("Reload content (F5)", func(): Session.reload_content()),
		_button("Check content", _check),
		_button("New game", func(): Session.new_game()),
	]))
	var november: bool = Session.state.flags.has("cumana_fieldwork_complete")
	_box.add_child(_button("Switch to July" if november else "Switch to November (skip the browser-only chapter)", _toggle_period))
	for skill in ["logic", "empathy", "aesthetics", "political"]:
		var label := Label.new()
		label.text = "%s %d" % [skill.capitalize(), int(Session.state.skills.get(skill, 0))]
		label.custom_minimum_size.x = 120
		_box.add_child(_row([label, _button("−", _skill.bind(skill, -1)), _button("+", _skill.bind(skill, 1))]))
	var heading := Label.new()
	heading.text = "Open a conversation here"
	heading.theme_type_variation = "SmallCaps"
	_box.add_child(heading)
	var ids: Array = c.encounters.keys()
	ids.sort()
	for id in ids:
		_box.add_child(_row([_button(id, _open.bind(id)), _button("graph", func(): inspect_requested.emit(id))]))
	_problems = RichTextLabel.new()
	_problems.fit_content = true
	_problems.bbcode_enabled = true
	_box.add_child(_problems)


func _check() -> void:
	var problems := Session.content.validate()
	_problems.text = "[color=#94d4ad]Content OK: no problems found.[/color]" if problems.is_empty() else "[color=#f0a090]%d problem(s):[/color]\n• %s" % [problems.size(), "\n• ".join(PackedStringArray(problems))]


func _toggle_period() -> void:
	var state := Session.state.duplicate()
	var flags: Array = state.flags.duplicate()
	if flags.has("cumana_fieldwork_complete"):
		flags.erase("cumana_fieldwork_complete")
	else:
		flags.append("cumana_fieldwork_complete")
	state.flags = flags
	Session.set_state(state)


func _skill(skill: String, delta: int) -> void:
	var state := Session.state.duplicate()
	state.skills = state.skills.duplicate()
	state.skills[skill] = clampi(int(state.skills.get(skill, 0)) + delta, 0, 6)
	Session.set_state(state)


func _open(id: String) -> void:
	toggle()
	Session.set_state(CosmosEncounters.open(Session.state, id, Session.content))

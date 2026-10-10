extends CanvasLayer
## Heads-up display: place and date, fieldbook/playtest buttons, the remark
## box (barks, hints, inner voices) and short toasts. Layout lives in
## res://scenes/ui/hud.tscn; text comes from content/text/ui.csv.

signal fieldbook_requested
signal dev_requested

@onready var _place: Label = %Place
@onready var _date: Label = %Date
@onready var _fieldbook_button: Button = %FieldbookButton
@onready var _dev_button: Button = %DevButton
@onready var _message: PanelContainer = %Message
@onready var _message_title: Label = %MessageTitle
@onready var _message_text: RichTextLabel = %MessageText
@onready var _controls: Label = %Controls
@onready var _toast: Label = %Toast
@onready var dialogue: Control = %DialoguePanel
@onready var fieldbook: Control = %Fieldbook
@onready var dev: Control = %DevPanel

var _toast_time := 0.0


func _ready() -> void:
	# Mouse-only buttons: keeping keyboard focus would let Space/Enter (used
	# by the dialogue) and Tab (show interactions) press them by accident.
	for b in [_fieldbook_button, _dev_button]:
		b.focus_mode = Control.FOCUS_NONE
	_fieldbook_button.pressed.connect(func(): fieldbook_requested.emit())
	_dev_button.pressed.connect(func(): dev_requested.emit())
	Session.state_changed.connect(refresh)
	Session.content_reloaded.connect(refresh)
	Session.save_failed.connect(func(_message): toast(Session.content.t("ui.toast.save_failed")))
	dialogue.evidence_gained.connect(func(n): toast(Session.content.t("ui.toast.evidence_one" if n == 1 else "ui.toast.evidence", {"count": n})))
	refresh()
	var visits: Dictionary = Session.state.get("exploration", {}).get("visits", {}) if Session.state.get("exploration") is Dictionary else {}
	if not Session.content.usable():
		pass  # refresh() is already explaining the content problem
	elif visits.is_empty():
		show_hint(Session.content.t("ui.hint.start"))
	else:
		_message.visible = false
	if Session.last_load_status.begins_with("the save could not be read"):
		toast(Session.content.t("ui.toast.save_unreadable"))
	elif Session.last_load_status.begins_with("recovered"):
		toast(Session.content.t("ui.toast.save_recovered"))


func refresh() -> void:
	var c := Session.content
	var period := CosmosEncounters.period(Session.state.flags)
	_place.text = c.t("ui.place").to_upper()
	_date.text = c.t("date." + period)
	_fieldbook_button.text = "%s  %d" % [c.t("ui.fieldbook"), _entry_count()]
	_controls.text = c.t("ui.controls")
	var talking := Session.state.get("activeEncounter") != null
	if not c.usable():
		var problems: Array = c.validate().slice(0, 4)
		show_remark("Content problem", "The scene cannot be shown until this is fixed:\n• %s\n\nFix the file and press F5." % "\n• ".join(PackedStringArray(problems)), {})
		return
	_controls.visible = not talking and not _message.visible
	if talking:
		_message.visible = false
	_dev_button.disabled = talking
	_fieldbook_button.disabled = talking


func _entry_count() -> int:
	return (Session.state.get("evidence", []) as Array).size()


## A remark from arriving at a place or object, with an optional inner voice.
func show_remark(title: String, text: String, voice: Dictionary) -> void:
	_message_title.text = title.to_upper()
	_message_title.visible = title != ""
	var body := text.replace("[", "[lb]")
	if not voice.is_empty():
		var colour: String = preload("res://src/ui/dialogue_panel.gd").SKILL_COLOURS.get(voice.skill, "#ffffff")
		body += "\n\n[color=%s]%s[/color]  %s" % [colour, String(voice.skill).to_upper(), String(voice.text).replace("[", "[lb]")]
	_message_text.text = body
	_message.visible = true
	_controls.visible = false
	_fit_message.call_deferred()


## Shrink the box to its text (it grows upwards from the bottom edge).
func _fit_message() -> void:
	_message.offset_top = _message.offset_bottom - _message.get_combined_minimum_size().y


func show_hint(text: String) -> void:
	if text == "":
		if not _message_title.visible:
			_message.visible = false
			_controls.visible = Session.state.get("activeEncounter") == null
		return
	show_remark("", text, {})


func toast(text: String) -> void:
	_toast.text = text
	_toast.visible = true
	_toast_time = 4.0


func _process(delta: float) -> void:
	if _toast_time > 0.0:
		_toast_time -= delta
		if _toast_time <= 0.0:
			_toast.visible = false

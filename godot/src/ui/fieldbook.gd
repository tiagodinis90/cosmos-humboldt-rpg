extends Control
## The scientific notebook: every entry keeps its kind, method, limits and
## source. Nothing is summarised into a score. Layout in
## res://scenes/ui/fieldbook.tscn.

const KINDS := ["measurement", "observation", "testimony", "inference", "hypothesis"]

@onready var _title: Label = %Title
@onready var _count: Label = %Count
@onready var _entries: VBoxContainer = %Entries
@onready var _close: Button = %Close


func _ready() -> void:
	_close.focus_mode = Control.FOCUS_NONE
	_close.pressed.connect(close)
	visible = false


func open() -> void:
	render()
	visible = true
	Session.set_blocking("fieldbook", true)


func close() -> void:
	visible = false
	Session.set_blocking("fieldbook", false)


func toggle() -> void:
	if visible:
		close()
	else:
		open()


func render() -> void:
	var c := Session.content
	var evidence: Array = Session.state.get("evidence", [])
	_title.text = c.t("ui.fieldbook.title")
	_count.text = c.t("ui.fieldbook.count_one" if evidence.size() == 1 else "ui.fieldbook.count", {"count": evidence.size()})
	_close.text = c.t("ui.fieldbook.close")
	for child in _entries.get_children():
		child.queue_free()
	if evidence.is_empty():
		_entries.add_child(_label(c.t("ui.fieldbook.empty"), "InkMuted"))
		return
	for kind in KINDS:
		var list := evidence.filter(func(e): return e.kind == kind)
		if list.is_empty():
			continue
		_entries.add_child(_label(c.t("ui.kind." + kind), "InkHeaderMedium"))
		for e in list:
			var box := VBoxContainer.new()
			box.add_theme_constant_override("separation", 1)
			box.add_child(_label(c.t(e.get("content_key", "")), "Ink"))
			if e.has("method_key"):
				box.add_child(_label(c.t("ui.fieldbook.how") + " " + c.t(e.method_key), "InkMuted"))
			if e.has("uncertainty_key"):
				box.add_child(_label(c.t("ui.fieldbook.limits") + " " + c.t(e.uncertainty_key), "InkWarning"))
			var meta := c.t(e.get("date_key", ""))
			if e.has("location_key"):
				meta += " · " + c.t(e.location_key)
			meta += " · " + c.t(e.get("source_key", ""))
			box.add_child(_label(meta, "InkSmall"))
			_entries.add_child(box)


func _label(text: String, variation: String) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if variation != "":
		l.theme_type_variation = variation
	return l


func _unhandled_input(event: InputEvent) -> void:
	if visible and (event.is_action_pressed("cosmos_close") or event.is_action_pressed("cosmos_fieldbook")):
		close()
		get_viewport().set_input_as_handled()

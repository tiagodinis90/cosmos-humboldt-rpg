extends Node
## Root of the game: connects the world to the HUD and handles the global
## keys (fieldbook, playtest tools, reloading content).

@onready var world: CosmosWorld = $World
@onready var hud: CanvasLayer = $Hud


func _ready() -> void:
	world.remark_requested.connect(_on_remark)
	world.hint_requested.connect(func(text): hud.show_hint(text))
	hud.fieldbook_requested.connect(func(): if _can_open(hud.fieldbook): hud.fieldbook.toggle())
	hud.dev_requested.connect(func(): if _can_open(hud.dev): hud.dev.toggle())
	hud.dev.reload_requested.connect(reload_content)
	hud.dev.inspect_requested.connect(func(id):
		hud.dev.toggle()
		hud.get_node("%GraphInspector").open(id))


func _on_remark(hotspot: Dictionary, result: Dictionary) -> void:
	var c := Session.content
	var voice := {}
	if result.get("voice") != null:
		voice = {"skill": result.voice.skill, "text": c.t(result.voice.text_key)}
	hud.show_remark(c.t(c.hotspot(hotspot.id).get("label_key")), c.t(result.get("text_key", "")), voice)


## One full-screen panel at a time, and none during a conversation; a
## panel that is already open can always be closed again.
func _can_open(panel: Control) -> bool:
	if panel.visible:
		return true
	if Session.state.get("activeEncounter") != null:
		return false
	for other in [hud.fieldbook, hud.dev, hud.get_node("%GraphInspector")]:
		if other != panel and other.visible:
			return false
	return true


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("cosmos_fieldbook") and _can_open(hud.fieldbook):
		hud.fieldbook.toggle()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cosmos_dev_panel") and _can_open(hud.dev):
		hud.dev.toggle()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cosmos_reload_content"):
		reload_content()
		get_viewport().set_input_as_handled()


func reload_content() -> void:
	var before := Session.content
	var problems := Session.reload_content()
	if Session.content == before:
		hud.toast(Session.content.t("ui.toast.content_not_reloaded"))
	elif not problems.is_empty():
		hud.toast(Session.content.t("ui.toast.content_reloaded_with_problems", {"count": problems.size()}))
	else:
		hud.toast(Session.content.t("ui.toast.content_reloaded"))

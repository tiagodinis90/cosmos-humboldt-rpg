extends Node
## Root of the game: connects the world to the HUD and handles the global
## keys (fieldbook, playtest tools, reloading content).

@onready var world: CosmosWorld = $World
@onready var hud: CanvasLayer = $Hud


func _ready() -> void:
	world.remark_requested.connect(_on_remark)
	world.hint_requested.connect(func(text): hud.show_hint(text))
	hud.fieldbook_requested.connect(func(): hud.fieldbook.toggle())
	hud.dev_requested.connect(func(): hud.dev.toggle())
	hud.dev.inspect_requested.connect(func(id):
		hud.dev.toggle()
		hud.get_node("%GraphInspector").open(id))


func _on_remark(hotspot: Dictionary, result: Dictionary) -> void:
	var c := Session.content
	var voice := {}
	if result.get("voice") != null:
		voice = {"skill": result.voice.skill, "text": c.t(result.voice.text_key)}
	hud.show_remark(c.t(c.hotspot(hotspot.id).get("label_key")), c.t(result.get("text_key", "")), voice)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("cosmos_fieldbook") and Session.state.get("activeEncounter") == null and not hud.dev.visible:
		hud.fieldbook.toggle()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cosmos_dev_panel") and Session.state.get("activeEncounter") == null and not hud.fieldbook.visible:
		hud.dev.toggle()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cosmos_reload_content"):
		Session.reload_content()
		hud.toast("Content reloaded")
		get_viewport().set_input_as_handled()

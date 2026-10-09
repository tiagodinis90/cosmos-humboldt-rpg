extends Node
## Autoload "Session": the single owner of game state, content and saving.
## Scenes read Session.state and change it only through Session.set_state(),
## which writes the save file (unless autosave is off, e.g. in some tests).

signal state_changed
signal content_reloaded

const DEFAULT_SAVE_PATH := "user://cosmos_save.json"

var content: CosmosContent
var state: Dictionary = {}
var save_path := DEFAULT_SAVE_PATH
var autosave := true
## True while a full-screen panel (fieldbook, dev tools) takes the input.
var ui_blocking := false
## Dice source: returns a float in [0, 1). Tests replace it with fixed rolls.
var dice: Callable = func() -> float: return float(randi()) / 4294967296.0
var last_load_status := ""


func _ready() -> void:
	CosmosInput.ensure_actions()
	content = CosmosContent.load_from()
	for problem in content.validate():
		push_warning("Content: " + problem)
	load_game()


func set_state(new_state: Dictionary) -> void:
	state = new_state
	if autosave:
		save_game()
	state_changed.emit()


func new_game() -> void:
	set_state(CosmosSave.new_state(content.map.spawn))


func load_game() -> void:
	var loaded = null
	if FileAccess.file_exists(save_path):
		loaded = CosmosSave.decode(FileAccess.get_file_as_string(save_path))
		last_load_status = "loaded" if loaded != null else "unreadable save ignored (file left untouched)"
	else:
		last_load_status = "no save yet"
	if loaded == null:
		# A save we cannot read is never overwritten until the player acts.
		state = CosmosSave.new_state(content.map.spawn)
	else:
		state = loaded
	state_changed.emit()


func save_game() -> bool:
	var tmp := save_path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_warning("Could not write save: " + tmp)
		return false
	f.store_string(CosmosSave.encode(state))
	f.close()
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(tmp), ProjectSettings.globalize_path(save_path)) == OK


## Re-read every file in res://content (dev panel / F5), keeping the save.
func reload_content() -> void:
	content.reload()
	for problem in content.validate():
		push_warning("Content: " + problem)
	content_reloaded.emit()
	state_changed.emit()


func roll() -> float:
	return dice.call()

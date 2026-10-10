extends Node
## Autoload "Session": the single owner of game state, content and saving.
## Scenes read Session.state and change it only through Session.set_state(),
## which writes the save file (unless autosave is off, e.g. in some tests).

signal state_changed
signal content_reloaded
## A different game was put in place (new game or load): views must reset
## anything they keep of their own, such as where Humboldt is walking.
signal game_loaded
signal save_failed(message: String)

const DEFAULT_SAVE_PATH := "user://cosmos_save.json"

var content: CosmosContent
var state: Dictionary = {}
var save_path := DEFAULT_SAVE_PATH
var autosave := true
## Dice source: returns a float in [0, 1). Tests replace it with fixed rolls.
var dice: Callable = func() -> float: return float(randi()) / 4294967296.0
var last_load_status := ""
var last_save_error := ""

## Full-screen panels (fieldbook, playtest tools, graph view) that take the
## input. Each panel registers itself by name, so closing one panel never
## frees the world while another is still open.
var _blockers := {}
var ui_blocking: bool:
	get:
		return not _blockers.is_empty()
	set(value):
		if not value:
			_blockers.clear()


func _ready() -> void:
	CosmosInput.ensure_actions()
	content = CosmosContent.load_from()
	content.locale = _initial_locale()
	for problem in content.validate():
		push_warning("Content: " + problem)
	load_game()


## The language to show: `-- --locale=pt` on the command line, otherwise
## the project setting cosmos/text/locale (Project Settings in the editor).
func _initial_locale() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--locale="):
			return arg.substr(9)
	return str(ProjectSettings.get_setting("cosmos/text/locale", "en"))


## Show the game in another language (a column of the text tables).
## Empty cells fall back to English.
func set_locale(code: String) -> void:
	content.locale = code
	content_reloaded.emit()
	state_changed.emit()


func set_blocking(who: String, on: bool) -> void:
	if on:
		_blockers[who] = true
	else:
		_blockers.erase(who)


## Replace the game state. A state without the required fields is refused
## (it would be a bug, never something to save over the player's progress).
func set_state(new_state) -> bool:
	if not new_state is Dictionary or not CosmosSave.is_playable(new_state):
		push_error("Refused to apply a broken game state; the previous state and the save are kept.")
		return false
	state = new_state
	if autosave:
		save_game()
	state_changed.emit()
	return true


## Where a new game starts (the origin if the scene file cannot be read).
func _spawn() -> Dictionary:
	return content.map.spawn if content.usable() else {"x": 0.0, "y": 0.0}


func new_game() -> void:
	set_state(CosmosSave.new_state(_spawn()))
	game_loaded.emit()


func load_game() -> void:
	last_load_status = ""
	var loaded = null
	var tmp := save_path + ".tmp"
	if FileAccess.file_exists(save_path):
		loaded = CosmosSave.decode(FileAccess.get_file_as_string(save_path))
		if loaded != null:
			last_load_status = "loaded"
		else:
			var copy := _keep_unreadable_copy()
			last_load_status = "the save could not be read; a copy was kept as " + copy if copy != "" else "the save could not be read"
	if loaded == null and FileAccess.file_exists(tmp):
		# A save interrupted between writing and renaming: the newest state
		# is still complete in the temporary file.
		loaded = CosmosSave.decode(FileAccess.get_file_as_string(tmp))
		if loaded != null:
			last_load_status = "recovered from an interrupted save"
	if loaded == null and last_load_status == "":
		last_load_status = "no save yet"
	state = loaded if loaded != null else CosmosSave.new_state(_spawn())
	state = CosmosEncounters.repair(state, content)
	state_changed.emit()
	game_loaded.emit()


## Before a refused save can ever be replaced, copy it next to the save so
## nothing the player made is lost. Returns the copy's file name.
func _keep_unreadable_copy() -> String:
	var stamp := Time.get_datetime_string_from_system(true).replace(":", "-")
	var copy := save_path.get_basename() + ".unreadable-" + stamp + ".json"
	var from := ProjectSettings.globalize_path(save_path)
	if DirAccess.copy_absolute(from, ProjectSettings.globalize_path(copy)) != OK:
		push_warning("Could not keep a copy of the unreadable save " + from)
		return ""
	return copy.get_file()


func save_game() -> bool:
	var text := CosmosSave.encode(state)
	var tmp := save_path + ".tmp"
	if not _write(tmp, text):
		return _save_failed("could not write " + tmp)
	var from := ProjectSettings.globalize_path(tmp)
	var to := ProjectSettings.globalize_path(save_path)
	if DirAccess.rename_absolute(from, to) == OK:
		last_save_error = ""
		return true
	# Some platforms refuse to rename over an existing file. The complete
	# state is in the .tmp file, which load_game() also reads, so replacing
	# the old save is safe even if the second rename fails too.
	DirAccess.remove_absolute(to)
	if DirAccess.rename_absolute(from, to) == OK:
		last_save_error = ""
		return true
	return _save_failed("could not replace " + to + " (the newest state is in the .tmp file)")


## Write the whole text or report failure (disk full, no permission).
func _write(path: String, text: String) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	var stored := f.store_string(text)
	f.flush()
	var ok := stored and f.get_error() == OK
	f.close()
	return ok and FileAccess.get_file_as_string(path).length() == text.length()


func _save_failed(reason: String) -> bool:
	var message := "Progress could not be saved: " + reason
	push_warning(message)
	if message != last_save_error:
		last_save_error = message
		save_failed.emit(message)
	return false


## Re-read every file in res://content (dev panel / F5), keeping the save.
## If the scene file cannot be read, the content in use is kept and the
## problems are returned so the writer can fix the file and press F5 again.
func reload_content() -> Array:
	var fresh := CosmosContent.load_from(content.root)
	fresh.locale = content.locale
	var problems := fresh.validate()
	for problem in problems:
		push_warning("Content: " + problem)
	if not fresh.usable():
		return problems
	content = fresh
	var repaired := CosmosEncounters.repair(state, content)
	if repaired != state:
		set_state(repaired)
	content_reloaded.emit()
	state_changed.emit()
	return problems


func roll() -> float:
	return dice.call()

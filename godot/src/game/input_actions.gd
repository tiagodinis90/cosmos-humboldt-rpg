class_name CosmosInput
extends RefCounted
## Input actions are registered at start-up so the project works without
## hand-editing the InputMap. Rebind them under Project Settings → Input Map
## if you prefer; actions that already exist are left alone.

const ACTIONS := {
	"cosmos_up": [KEY_W, KEY_UP],
	"cosmos_down": [KEY_S, KEY_DOWN],
	"cosmos_left": [KEY_A, KEY_LEFT],
	"cosmos_right": [KEY_D, KEY_RIGHT],
	"cosmos_show_interactions": [KEY_TAB],
	"cosmos_fieldbook": [KEY_J],
	"cosmos_continue": [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER],
	"cosmos_dev_panel": [KEY_F1],
	"cosmos_reload_content": [KEY_F5],
	"cosmos_close": [KEY_ESCAPE],
}


static func ensure_actions() -> void:
	for action in ACTIONS:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action)
		for key in ACTIONS[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)

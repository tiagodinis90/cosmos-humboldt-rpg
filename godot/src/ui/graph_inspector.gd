extends PanelContainer
## Read-only view of a conversation graph for writers: every card with its
## text, every choice and check, and where each edge leads. Open it from the
## playtest tools (F1 → "graph"), or run res://scenes/tools/graph_inspector.tscn
## on its own from the editor (F6) to browse all conversations.

var _picker: OptionButton
var _graph: GraphEdit
var _problems: Label
var _ids: Array = []


func _ready() -> void:
	var box := VBoxContainer.new()
	add_child(box)
	var bar := HBoxContainer.new()
	box.add_child(bar)
	_picker = OptionButton.new()
	_picker.item_selected.connect(func(i): show_encounter(_ids[i]))
	bar.add_child(_picker)
	var reload := Button.new()
	reload.text = "Reload content"
	reload.pressed.connect(func():
		var current = _ids[_picker.selected] if _picker.selected >= 0 and _picker.selected < _ids.size() else ""
		Session.reload_content()
		_fill_picker()
		if not _ids.is_empty():
			var i := maxi(0, _ids.find(current))
			_picker.select(i)
			show_encounter(_ids[i]))
	bar.add_child(reload)
	var close_button := Button.new()
	close_button.text = "Close"
	close_button.pressed.connect(close)
	bar.add_child(close_button)
	_problems = Label.new()
	_problems.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_problems.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.add_child(_problems)
	_graph = GraphEdit.new()
	_graph.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_graph.minimap_enabled = true
	box.add_child(_graph)
	_fill_picker()
	if get_tree().current_scene == self and not _ids.is_empty():
		show_encounter(_ids[0])


func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("cosmos_close"):
		close()
		get_viewport().set_input_as_handled()


func close() -> void:
	visible = false
	Session.set_blocking("graph", false)


func _fill_picker() -> void:
	_picker.clear()
	_ids = Session.content.encounters.keys()
	_ids.sort()
	for id in _ids:
		_picker.add_item(id)


func open(encounter_id: String) -> void:
	visible = true
	Session.set_blocking("graph", true)
	_fill_picker()
	_picker.select(_ids.find(encounter_id))
	show_encounter(encounter_id)


func show_encounter(id: String) -> void:
	var c := Session.content
	var e := c.encounter(id)
	for child in _graph.get_children():
		if child is GraphNode:
			child.free()
	_graph.clear_connections()
	if e.is_empty():
		return
	var problems := CosmosGraph.validate(e.graph)
	_problems.text = "Structure OK" if problems.is_empty() else "Problems: " + "; ".join(PackedStringArray(problems))
	# Lay cards out in columns by distance from the start card.
	var depth := {e.graph.start: 0}
	var queue: Array = [e.graph.start]
	while not queue.is_empty():
		var cid = queue.pop_front()
		var card: Dictionary = e.graph.cards.get(cid, {})
		for link in _links(card):
			if not depth.has(link.to) and e.graph.cards.has(link.to):
				depth[link.to] = depth[cid] + 1
				queue.append(link.to)
	var rows := {}
	var nodes := {}
	for cid in e.graph.cards:
		var card: Dictionary = e.graph.cards[cid]
		var column: int = depth.get(cid, -1) + 1
		var row: int = rows.get(column, 0)
		rows[column] = row + 1
		var node := GraphNode.new()
		node.name = cid.replace(".", "_")
		node.title = "%s  [%s]" % [cid, card.type]
		node.position_offset = Vector2(column * 380, row * 240)
		var links := _links(card)
		var text := Label.new()
		text.custom_minimum_size = Vector2(320, 0)
		text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		var body := PackedStringArray()
		if card.has("speaker"):
			body.append(c.t("speaker." + card.speaker).to_upper())
		if card.has("text_key"):
			body.append(c.t(card.text_key))
		if card.has("prompt_key"):
			body.append(c.t(card.prompt_key))
		for p in card.get("probes", []):
			body.append("%s ≥ %d: %s" % [String(p.skill).to_upper(), int(p.atLeast), c.t(p.text_key)])
		if card.has("sets"):
			body.append("sets: " + ", ".join(PackedStringArray(card.sets)))
		text.text = "\n".join(body)
		node.add_child(text)
		# Slot 0 (the card text) only receives edges; each link row below it
		# sends one, so output port i is link i.
		node.set_slot(0, true, 0, Color("#e4be52"), false, 0, Color.WHITE)
		for i in links.size():
			var l := Label.new()
			l.text = "→ " + links[i].label
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			l.custom_minimum_size = Vector2(320, 0)
			node.add_child(l)
			node.set_slot(i + 1, false, 0, Color.WHITE, true, 0, Color("#8fb8d8"))
		_graph.add_child(node)
		nodes[cid] = node
	for cid in e.graph.cards:
		var links := _links(e.graph.cards[cid])
		for i in links.size():
			if nodes.has(links[i].to):
				_graph.connect_node(nodes[cid].name, i, nodes[links[i].to].name, 0)


## A condition in words: "flag x", "logic ≥ 2", "all of (…)", "not (…)".
static func describe(c: Dictionary) -> String:
	match c.get("op", ""):
		"flag": return "flag " + str(c.name)
		"skill": return "%s ≥ %d" % [str(c.skill), int(c.atLeast)]
		"all": return "all of (" + ", ".join(PackedStringArray(c.conditions.map(func(x): return describe(x)))) + ")"
		"any": return "any of (" + ", ".join(PackedStringArray(c.conditions.map(func(x): return describe(x)))) + ")"
		"not": return "not (" + describe(c.condition) + ")"
		"visits": return "visits to %s ≤ %d" % [str(c.hotspot), int(c.atMost)]
		"hasNews": return "%s has something new" % str(c.encounter)
	return JSON.stringify(c)


func _links(card: Dictionary) -> Array:
	var c := Session.content
	var out: Array = []
	match card.get("type", ""):
		"line", "passive":
			out.append({"to": card.next, "label": "next"})
		"fork":
			for r in card.routes:
				out.append({"to": r.next, "label": "if " + describe(r.when)})
			out.append({"to": card.otherwise, "label": "otherwise"})
		"choice":
			for choice in card.choices:
				var label := c.t(choice.label_key)
				if choice.has("when"):
					label += "  (only if " + describe(choice.when) + ")"
				if choice.has("check"):
					var k: Dictionary = choice.check
					out.append({"to": k.success, "label": "%s · %s %s ≥ %d → success" % [label, String(k.kind).to_upper(), k.skill, int(k.difficulty)]})
					out.append({"to": k.failure, "label": "%s → failure" % label})
				else:
					out.append({"to": choice.next, "label": label})
	return out

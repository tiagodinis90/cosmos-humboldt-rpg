extends SceneTree
## Regenerates the provisional UI theme:
##   godot --headless --path godot -s res://tools/build_theme.gd
## After that, restyle res://ui/theme/cosmos_theme.tres in the editor's theme
## editor; you do not need to run this script again (it would overwrite edits).

func _box(bg: Color, border := Color(0, 0, 0, 0), width := 0, radius := 4, margin := 8.0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(width)
	s.set_corner_radius_all(radius)
	s.set_content_margin_all(margin)
	return s


func _initialize() -> void:
	var t := Theme.new()
	t.default_font_size = 17
	var ink := Color("#efe2c7")
	var gold := Color("#e4be52")
	t.set_color("font_color", "Label", ink)
	t.set_color("default_color", "RichTextLabel", ink)
	t.set_font_size("normal_font_size", "RichTextLabel", 17)
	t.set_stylebox("panel", "PanelContainer", _box(Color("#0f1714", 0.9), Color("#a98a51", 0.5), 1, 6))
	t.set_type_variation("DialoguePanel", "PanelContainer")
	var dialogue := _box(Color("#0d1311", 0.94), Color("#8a7350", 0.5), 0, 0)
	dialogue.border_width_left = 1
	t.set_stylebox("panel", "DialoguePanel", dialogue)
	t.set_type_variation("FieldbookPage", "PanelContainer")
	t.set_stylebox("panel", "FieldbookPage", _box(Color("#eee3c9"), Color("#8a6d3a", 0.6), 1, 2))
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var bg: Color = {"normal": Color("#141c19", 0.85), "hover": Color("#22302a", 0.95), "pressed": Color("#2b3b33"), "focus": Color("#141c19", 0.85), "disabled": Color("#141c19", 0.5)}[state]
		var box := _box(bg, Color("#c8a565", 0.7 if state != "disabled" else 0.3), 1, 4, 8.0)
		if state == "focus":
			box.draw_center = false
		t.set_stylebox(state, "Button", box)
	t.set_color("font_color", "Button", ink)
	t.set_color("font_hover_color", "Button", Color("#ffe6a8"))
	t.set_color("font_pressed_color", "Button", Color("#ffe6a8"))
	t.set_type_variation("AccentButton", "Button")
	t.set_color("font_color", "AccentButton", gold)
	t.set_stylebox("normal", "AccentButton", _box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0))
	for name in ["SmallCaps", "HeaderLarge", "HeaderMedium", "Muted", "Warning", "Toast", "Ink", "InkHeader", "InkHeaderMedium", "InkMuted", "InkWarning", "InkSmall"]:
		t.set_type_variation(name, "Label")
	t.set_color("font_color", "SmallCaps", Color("#f0d488"))
	t.set_font_size("font_size", "SmallCaps", 12)
	t.set_font_size("font_size", "HeaderLarge", 30)
	t.set_color("font_color", "HeaderLarge", Color("#fff5df"))
	t.set_color("font_outline_color", "HeaderLarge", Color(0, 0, 0, 0.6))
	t.set_constant("outline_size", "HeaderLarge", 4)
	t.set_font_size("font_size", "HeaderMedium", 21)
	t.set_color("font_color", "Muted", Color("#b9ad95"))
	t.set_font_size("font_size", "Muted", 14)
	t.set_color("font_color", "Warning", Color("#e08a6a"))
	t.set_color("font_color", "Toast", Color("#2b2218"))
	t.set_stylebox("normal", "Toast", _box(Color("#eee3c9"), Color(0, 0, 0, 0), 0, 14, 6.0))
	t.set_color("font_color", "Ink", Color("#2b2218"))
	t.set_color("font_color", "InkHeader", Color("#2b2218"))
	t.set_font_size("font_size", "InkHeader", 30)
	t.set_color("font_color", "InkHeaderMedium", Color("#2b2218"))
	t.set_font_size("font_size", "InkHeaderMedium", 21)
	t.set_color("font_color", "InkMuted", Color("#4d3f2c"))
	t.set_font_size("font_size", "InkMuted", 15)
	t.set_color("font_color", "InkWarning", Color("#7a3b2a"))
	t.set_font_size("font_size", "InkWarning", 15)
	t.set_color("font_color", "InkSmall", Color("#7a6747"))
	t.set_font_size("font_size", "InkSmall", 12)
	var err := ResourceSaver.save(t, "res://ui/theme/cosmos_theme.tres")
	print("Saved theme: ", error_string(err))
	quit(0 if err == OK else 1)

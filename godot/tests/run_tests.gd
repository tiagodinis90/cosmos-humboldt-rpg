extends SceneTree
## Headless test runner.
##
##   godot --headless --path godot --import          (once, registers classes)
##   godot --headless --path godot -s res://tests/run_tests.gd
##   godot --headless --path godot -s res://tests/run_tests.gd -- --only=nav
##
## Runs every test_* method of the scripts in tests/unit (pure logic and
## parity with the TypeScript reference) and tests/scene (real scenes driven
## by input events). Exits with status 1 if anything fails.

var _passed := 0
var _failed := 0


func _initialize() -> void:
	_run.call_deferred()


func _run() -> void:
	var only := ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--only="):
			only = arg.substr(7)
	for folder in ["res://tests/unit", "res://tests/scene"]:
		var dir := DirAccess.open(folder)
		if dir == null:
			continue
		var files := Array(dir.get_files()).filter(func(f): return f.begins_with("test_") and f.ends_with(".gd"))
		files.sort()
		for file in files:
			if only != "" and not file.contains(only):
				continue
			var script: GDScript = load(folder + "/" + file)
			if script == null or not script.can_instantiate():
				_report(file, "load", ["script failed to load (parse error?)"], 0)
				continue
			var methods: Array = script.get_script_method_list().map(func(m): return m.name).filter(func(n): return n.begins_with("test_"))
			methods.sort()
			for method in methods:
				var test: CosmosTestCase = script.new()
				if test.has_method("setup"):
					await test.setup(self)
				await test.call(method)
				if test.has_method("teardown"):
					await test.teardown(self)
				_report(file, method, test.failures, test.checks)
	print("\n%d passed, %d failed" % [_passed, _failed])
	quit(1 if _failed > 0 else 0)


func _report(file: String, method: String, failures: Array, checks: int) -> void:
	if failures.is_empty():
		_passed += 1
		print("  ok   %s :: %s (%d checks)" % [file, method, checks])
	else:
		_failed += 1
		print("  FAIL %s :: %s" % [file, method])
		for f in failures.slice(0, 8):
			print("       - " + str(f))
		if failures.size() > 8:
			print("       … %d more" % (failures.size() - 8))

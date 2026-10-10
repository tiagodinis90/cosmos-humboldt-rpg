class_name CosmosTestCase
extends RefCounted
## Minimal assertion helpers for the headless test runner (tests/run_tests.gd).
## Test scripts extend this class and define methods named test_*.

var failures: Array = []
var checks := 0


func fail(message: String) -> void:
	failures.append(message)


func ok(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		fail(message)


func eq(actual, expected, message := "") -> void:
	checks += 1
	if not _same(actual, expected, 0.0, []):
		fail("%s\n      expected: %s\n      actual:   %s" % [message, _short(expected), _short(actual)])


## Deep comparison with a numeric tolerance; keys in `ignore` are skipped.
func near(actual, expected, eps := 1e-9, message := "", ignore := []) -> void:
	checks += 1
	var where := []
	if not _same(actual, expected, eps, ignore, where):
		fail("%s (at %s)\n      expected: %s\n      actual:   %s" % [message, "/".join(where), _short(expected), _short(actual)])


## The content as exported from TypeScript, frozen next to the fixtures.
## Tests run on this copy, so writers can change res://content freely; the
## live content is checked by the validator (and test_content_is_valid).
const REFERENCE_CONTENT := "res://tests/parity/content"


static func reference_content() -> CosmosContent:
	return CosmosContent.load_from(REFERENCE_CONTENT)


## Numbers are read exactly as JavaScript wrote them (see CosmosJson).
static func load_json(path: String) -> Variant:
	return CosmosJson.parse(FileAccess.get_file_as_string(path))


## Fixture numbers that are not finite are written as strings.
static func num(v) -> float:
	if v is String:
		return NAN if v == "NaN" else (INF if v == "Infinity" else (-INF if v == "-Infinity" else float(v)))
	return float(v)


static func point(v: Dictionary) -> Dictionary:
	return {"x": num(v.x), "y": num(v.y)}


func _same(a, b, eps: float, ignore: Array, where := []) -> bool:
	if (a is float or a is int) and (b is float or b is int):
		if is_nan(float(a)) and is_nan(float(b)):
			return true
		if float(a) == float(b):
			return true
		return absf(float(a) - float(b)) <= eps * maxf(1.0, absf(float(b)))
	if a is Dictionary and b is Dictionary:
		var keys := {}
		for k in a:
			if not ignore.has(k):
				keys[k] = true
		for k in b:
			if not ignore.has(k):
				keys[k] = true
		for k in keys:
			var av = a.get(k)
			var bv = b.get(k)
			if not _same(av, bv, eps, ignore, where):
				where.push_front(str(k))
				return false
		return true
	if a is Array and b is Array:
		if a.size() != b.size():
			where.push_front("size %d≠%d" % [a.size(), b.size()])
			return false
		for i in a.size():
			if not _same(a[i], b[i], eps, ignore, where):
				where.push_front(str(i))
				return false
		return true
	return typeof(a) == typeof(b) and a == b


static func _short(v) -> String:
	var s := JSON.stringify(v)
	return s if s.length() < 400 else s.substr(0, 400) + "…"

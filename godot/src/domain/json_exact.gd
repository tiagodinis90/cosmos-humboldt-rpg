class_name CosmosJson
extends RefCounted
## JSON with correctly rounded numbers. Godot's own reader can be one or two
## units off in the last binary digit of a decimal number (about one number
## in seven, measured on 4.7.2). That is invisible in play, but it breaks the
## exact parity with the TypeScript reference (which reads the same content
## files) and exact save round trips. Godot still parses the structure; each
## number is then re-read from its original digits and rounded to the
## nearest double, as JavaScript does.

const _MARK := "\u0001"
static var _number := RegEx.create_from_string("^-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?$")
static var _pow5: Array = [[1]]


## The parsed value, or null if the text is not valid JSON.
static func parse(raw: String) -> Variant:
	var r := parse_detailed(raw)
	return r.data if r.ok else null


## {ok, data} or {ok: false, line, message}; line numbers match the file.
static func parse_detailed(raw: String) -> Dictionary:
	var json := JSON.new()
	if json.parse(_mark_numbers(raw)) != OK:
		return {"ok": false, "line": json.get_error_line(), "message": json.get_error_message()}
	return {"ok": true, "data": _restore(json.data)}


## Wrap every number outside strings as a marked string, so its digits
## survive Godot's parser. Malformed tokens are left alone for Godot to report.
static func _mark_numbers(raw: String) -> String:
	var out := PackedStringArray()
	var start := 0
	var i := 0
	var n := raw.length()
	var in_string := false
	while i < n:
		var ch := raw[i]
		if in_string:
			if ch == "\\":
				i += 1
			elif ch == "\"":
				in_string = false
			i += 1
			continue
		if ch == "\"":
			in_string = true
			i += 1
			continue
		if ch == "-" or (ch >= "0" and ch <= "9"):
			var j := i + 1
			while j < n and "0123456789+-.eE".contains(raw[j]):
				j += 1
			var token := raw.substr(i, j - i)
			if _number.search(token) != null:
				out.append(raw.substr(start, i - start))
				out.append("\"" + _MARK + token + "\"")
				start = j
			i = j
			continue
		i += 1
	out.append(raw.substr(start))
	return "".join(out)


static func _restore(v: Variant) -> Variant:
	if v is String and v.begins_with(_MARK):
		return to_double(v.substr(1))
	if v is Array:
		var a: Array = v
		for i in a.size():
			a[i] = _restore(a[i])
		return a
	if v is Dictionary:
		var d: Dictionary = v
		for k in d.keys():
			d[k] = _restore(d[k])
		return d
	return v


## The double nearest to a decimal number (ties to even), like JavaScript.
static func to_double(token: String) -> float:
	var negative := token.begins_with("-")
	var t := token.trim_prefix("-")
	var exp10 := 0
	var e_at := t.findn("e")
	if e_at >= 0:
		exp10 = t.substr(e_at + 1).to_int()
		t = t.substr(0, e_at)
	var dot := t.find(".")
	if dot >= 0:
		exp10 -= t.length() - dot - 1
		t = t.erase(dot, 1)
	t = t.lstrip("0")
	var result := 0.0
	if t == "":
		result = 0.0
	elif t.length() <= 15 and absi(exp10) <= 22:
		# Exact integer and exact power of ten: one IEEE operation rounds correctly.
		var m := float(t.to_int())
		result = m * pow(10.0, exp10) if exp10 >= 0 else m / pow(10.0, -exp10)
	else:
		result = _nearest(t, exp10, absf(token.to_float()))
	return -result if negative else result


const _MAX_FINITE_BITS := 0x7FEFFFFFFFFFFFFF


## The answer is the smallest bit pattern b (positive doubles are ordered
## like their bit patterns) whose upper midpoint is not below the exact
## value. Gallop from Godot's estimate to bracket it, then bisect; every
## comparison is exact.
static func _nearest(digits: String, exp10: int, estimate: float) -> float:
	var value := _big_from_decimal(digits)
	var b := 1
	if is_finite(estimate) and estimate > 0.0:
		b = mini(_bits(estimate), _MAX_FINITE_BITS - 1)
	var lo := -1  # the answer is above lo
	var hi := _MAX_FINITE_BITS  # the answer is at most hi
	var step := 1
	if _beyond(value, exp10, b):
		lo = b
		while true:
			var probe := mini(lo + step, _MAX_FINITE_BITS - 1)
			if not _beyond(value, exp10, probe):
				hi = probe
				break
			lo = probe
			if probe == _MAX_FINITE_BITS - 1:
				break
			step *= 2
	else:
		hi = b
		while true:
			var probe := hi - step
			if probe < 0:
				break
			if _beyond(value, exp10, probe):
				lo = probe
				break
			hi = probe
			step *= 2
	while hi - lo > 1:
		@warning_ignore("integer_division")
		var mid := lo + (hi - lo) / 2
		if _beyond(value, exp10, mid):
			lo = mid
		else:
			hi = mid
	return _from_bits(hi)


## True when the exact value lies above the midpoint between the doubles
## with bit patterns b and b + 1 (on a tie, the even pattern wins).
static func _beyond(value: Array, exp10: int, b: int) -> bool:
	var c := _compare(value, exp10, _from_bits(b), _from_bits(b + 1))
	return c > 0 or (c == 0 and (b & 1) == 1)


static func _bits(d: float) -> int:
	var b := PackedByteArray()
	b.resize(8)
	b.encode_double(0, d)
	return b.decode_s64(0)


static func _from_bits(bits: int) -> float:
	var b := PackedByteArray()
	b.resize(8)
	b.encode_s64(0, bits)
	return b.decode_double(0)


## [m, q] with d = m * 2^q (d non-negative and finite).
static func _split(d: float) -> Array:
	var bits := _bits(d)
	var e := (bits >> 52) & 0x7FF
	var frac := bits & ((1 << 52) - 1)
	if e == 0:
		return [frac, -1074]
	return [frac | (1 << 52), e - 1075]


## Sign of (digits * 10^exp10) - (midpoint of a and b), exactly.
static func _compare(value: Array, exp10: int, a: float, b: float) -> int:
	var sa := _split(a)
	var sb := _split(b)
	var q: int = mini(sa[1], sb[1])
	var x: int = (sa[0] << (sa[1] - q)) + (sb[0] << (sb[1] - q))
	var p := q - 1
	var left := value
	var right := _big_from_int(x)
	# value * 5^e * 2^e  vs  x * 2^p: move the powers of five to one side
	# and the powers of two to the other.
	if exp10 >= 0:
		left = _mul_big(left, _power5(exp10))
	else:
		right = _mul_big(right, _power5(-exp10))
	p -= exp10
	if p >= 0:
		right = _shift_left(right, p)
	else:
		left = _shift_left(left, -p)
	return _cmp(left, right)


# --- small unsigned big integers: little-endian base 2^24 limbs -------------------

const _BASE := 1 << 24
const _MASK := (1 << 24) - 1


static func _big_from_int(x: int) -> Array:
	var out: Array = []
	while x > 0:
		out.append(x & _MASK)
		x >>= 24
	return out


static func _big_from_decimal(digits: String) -> Array:
	var out: Array = []
	for ch in digits:
		var carry := ch.unicode_at(0) - 48
		for i in out.size():
			var v: int = out[i] * 10 + carry
			out[i] = v & _MASK
			carry = v >> 24
		while carry > 0:
			out.append(carry & _MASK)
			carry >>= 24
	return out


static func _mul_big(a: Array, b: Array) -> Array:
	var out: Array = []
	out.resize(a.size() + b.size() + 1)
	out.fill(0)
	for i in a.size():
		var carry := 0
		for j in b.size():
			var v: int = out[i + j] + a[i] * b[j] + carry
			out[i + j] = v & _MASK
			carry = v >> 24
		var k := i + b.size()
		while carry > 0:
			var v: int = out[k] + carry
			out[k] = v & _MASK
			carry = v >> 24
			k += 1
	while not out.is_empty() and out[out.size() - 1] == 0:
		out.pop_back()
	return out


static func _power5(n: int) -> Array:
	while _pow5.size() <= n:
		_pow5.append(_mul_big(_pow5[_pow5.size() - 1], [5]))
	return _pow5[n]


static func _shift_left(a: Array, n: int) -> Array:
	var out: Array = []
	@warning_ignore("integer_division")
	var whole: int = n / 24
	for i in whole:
		out.append(0)
	var bits := n % 24
	var carry := 0
	for limb in a:
		var v: int = (limb << bits) | carry
		out.append(v & _MASK)
		carry = v >> 24
	if carry > 0:
		out.append(carry)
	return out


static func _cmp(a: Array, b: Array) -> int:
	var na := a.size()
	while na > 0 and a[na - 1] == 0:
		na -= 1
	var nb := b.size()
	while nb > 0 and b[nb - 1] == 0:
		nb -= 1
	if na != nb:
		return 1 if na > nb else -1
	for i in range(na - 1, -1, -1):
		if a[i] != b[i]:
			return 1 if a[i] > b[i] else -1
	return 0

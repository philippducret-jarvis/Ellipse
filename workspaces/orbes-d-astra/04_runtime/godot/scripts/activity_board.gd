extends Control
class_name AstraActivityBoard

signal route_requested(screen_id: String)

const INK := Color("#050711")
const SURFACE := Color("#111529")
const CYAN := Color("#67E8F9")
const GOLD := Color("#F6C768")
const VIOLET := Color("#A78BFA")
const PINK := Color("#F472B6")
const DANGER := Color("#FB7185")
const CREAM := Color("#FFF4DC")
const MUTED := Color("#AAA8B9")
const GREEN := Color("#5EEAD4")
const FONT_DISPLAY := preload("res://assets/fonts/Cinzel-Variable.ttf")
const FONT_SERIF := preload("res://assets/fonts/CormorantGaramond-Variable.ttf")
const FONT_BODY := preload("res://assets/fonts/Manrope-Variable.ttf")

var mode := "rhythm_game"
var guardian_index := 22
var guardians: Array = []
var arena: ActivityArena
var score_label: Label
var combo_label: Label
var timer_label: Label
var objective_label: Label
var progress_bar: ProgressBar
var action_buttons: Array[Button] = []


class ActivityArena:
	extends Control

	signal stats_changed(score: int, combo: int, time_left: float, progress: float, message: String)
	signal activity_finished(success: bool)

	const COLORS := [Color("#67E8F9"), Color("#A78BFA"), Color("#F472B6"), Color("#F6C768")]
	var mode := "rhythm_game"
	var rng := RandomNumberGenerator.new()
	var score := 0
	var combo := 0
	var time_left := 60.0
	var progress := 0.0
	var notes: Array = []
	var targets: Array = []
	var bursts: Array = []
	var star_points: Array[Vector2] = []
	var spawn_clock := 0.0
	var sequence := [0, 2, 1, 1, 0, 2, 2, 1]
	var sequence_index := 0
	var message := "PRÊT"
	var finished := false
	var pulse := 0.0
	var guardian_texture: Texture2D


	func configure(activity_mode: String, texture: Texture2D) -> void:
		mode = activity_mode
		guardian_texture = texture
		rng.seed = 0xA57A + mode.hash()
		focus_mode = Control.FOCUS_ALL
		mouse_default_cursor_shape = Control.CURSOR_CROSS
		for index in range(70):
			star_points.append(Vector2(rng.randf(), rng.randf()))
		call_deferred("grab_focus")
		set_process(true)


	func _process(delta: float) -> void:
		if finished:
			return
		time_left = maxf(0.0, time_left - delta)
		pulse += delta
		spawn_clock -= delta
		match mode:
			"rhythm_game":
				_process_rhythm(delta)
			"astral_hunt":
				_process_hunt(delta)
			"outfit_workshop":
				_process_outfit(delta)
		_process_bursts(delta)
		if time_left <= 0.0:
			finished = true
			activity_finished.emit(progress >= 50.0 or score >= 4000)
		stats_changed.emit(score, combo, time_left, progress, message)
		queue_redraw()


	func _process_rhythm(delta: float) -> void:
		if spawn_clock <= 0.0:
			notes.append({"lane": rng.randi_range(0, 3), "y": -35.0, "speed": rng.randf_range(220.0, 300.0)})
			spawn_clock = maxf(0.34, 0.72 - progress * 0.002)
		for note in notes:
			note.y += note.speed * delta
		for index in range(notes.size() - 1, -1, -1):
			if notes[index].y > size.y + 30:
				notes.remove_at(index)
				combo = 0
				message = "MANQUÉ"
		progress = minf(100.0, score / 90.0)


	func _process_hunt(delta: float) -> void:
		if spawn_clock <= 0.0:
			var radius := rng.randf_range(24.0, 46.0)
			targets.append({
				"p": Vector2(rng.randf_range(radius + 20, size.x - radius - 20), rng.randf_range(radius + 35, size.y - radius - 35)),
				"r": radius,
				"ttl": rng.randf_range(1.6, 3.0),
				"special": rng.randf() < 0.22
			})
			spawn_clock = maxf(0.30, 0.78 - progress * 0.003)
		for target in targets:
			target.ttl -= delta
		for index in range(targets.size() - 1, -1, -1):
			if targets[index].ttl <= 0:
				targets.remove_at(index)
				combo = 0
				message = "ANOMALIE PERDUE"
		progress = minf(100.0, score / 75.0)


	func _process_outfit(_delta: float) -> void:
		progress = sequence_index / float(sequence.size()) * 100.0


	func _process_bursts(delta: float) -> void:
		for burst in bursts:
			burst.r += 120.0 * delta
			burst.a -= 1.7 * delta
		for index in range(bursts.size() - 1, -1, -1):
			if bursts[index].a <= 0:
				bursts.remove_at(index)


	func _gui_input(event: InputEvent) -> void:
		if finished:
			return
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_activate_at(event.position)
			accept_event()
		elif event is InputEventScreenTouch and event.pressed:
			_activate_at(event.position)
			accept_event()
		elif event is InputEventKey and event.pressed and not event.echo:
			var keys := [KEY_A, KEY_S, KEY_K, KEY_L]
			var lane := keys.find(event.physical_keycode)
			if lane >= 0:
				activate_slot(lane)


	func _activate_at(position: Vector2) -> void:
		match mode:
			"rhythm_game":
				activate_slot(clampi(int(position.x / maxf(1.0, size.x / 4.0)), 0, 3))
			"astral_hunt":
				_hit_target(position)
			"outfit_workshop":
				activate_slot(clampi(int(position.x / maxf(1.0, size.x / 3.0)), 0, 2))


	func activate_slot(slot: int) -> void:
		if mode == "rhythm_game":
			var hit_line := size.y - 82.0
			var best_index := -1
			var best_distance := 9999.0
			for index in range(notes.size()):
				if notes[index].lane != slot:
					continue
				var distance: float = absf(notes[index].y - hit_line)
				if distance < best_distance:
					best_distance = distance
					best_index = index
			if best_index >= 0 and best_distance < 82.0:
				var note = notes[best_index]
				notes.remove_at(best_index)
				var quality := "PARFAIT" if best_distance < 24 else "BIEN" if best_distance < 48 else "JUSTE"
				var points := 320 if quality == "PARFAIT" else 190 if quality == "BIEN" else 100
				combo += 1
				score += points * maxi(1, combo)
				message = "%s • +%d" % [quality, points * maxi(1, combo)]
				bursts.append({"p": Vector2((slot + 0.5) * size.x / 4.0, hit_line), "r": 22.0, "a": 1.0, "c": COLORS[slot]})
			else:
				combo = 0
				message = "HORS RYTHME"
		elif mode == "outfit_workshop":
			var expected: int = sequence[sequence_index]
			if slot == expected:
				sequence_index += 1
				combo += 1
				score += 500 * combo
				message = "ASSEMBLAGE PARFAIT • PIÈCE %d/%d" % [sequence_index, sequence.size()]
				bursts.append({"p": Vector2((slot + 0.5) * size.x / 3.0, size.y * 0.58), "r": 34.0, "a": 1.0, "c": COLORS[slot + 1]})
				if sequence_index >= sequence.size():
					finished = true
					progress = 100.0
					activity_finished.emit(true)
			else:
				combo = 0
				score = maxi(0, score - 250)
				message = "CONTRAINTE INCOMPATIBLE"
		stats_changed.emit(score, combo, time_left, progress, message)


	func _hit_target(position: Vector2) -> void:
		var hit_index := -1
		for index in range(targets.size() - 1, -1, -1):
			if position.distance_to(targets[index].p) <= targets[index].r * 1.18:
				hit_index = index
				break
		if hit_index < 0:
			combo = 0
			message = "TIR PERDU"
			stats_changed.emit(score, combo, time_left, progress, message)
			return
		var target = targets[hit_index]
		targets.remove_at(hit_index)
		combo += 1
		var points := (900 if target.special else 300) * maxi(1, combo)
		score += points
		message = "CIBLE %s • +%d" % ["DORÉE" if target.special else "ASTRALE", points]
		bursts.append({"p": target.p, "r": target.r, "a": 1.0, "c": GOLD if target.special else CYAN})
		stats_changed.emit(score, combo, time_left, progress, message)


	func use_power() -> void:
		match mode:
			"rhythm_game":
				for note in notes:
					note.y = size.y - 82.0
				message = "SYNCHRONISATION • FENÊTRE PARFAITE"
			"astral_hunt":
				for target in targets:
					target.ttl += 2.0
					target.r *= 1.25
				message = "VISION ASTRALE • CIBLES RÉVÉLÉES"
			"outfit_workshop":
				message = "INDICE • PROCHAINE MATIÈRE : %s" % ["SOIE", "CRISTAL", "OR"][(sequence[sequence_index] if sequence_index < sequence.size() else 0)]
		stats_changed.emit(score, combo, time_left, progress, message)


	func _draw() -> void:
		_draw_frame()
		match mode:
			"rhythm_game":
				_draw_rhythm()
			"astral_hunt":
				_draw_hunt()
			"outfit_workshop":
				_draw_outfit()
		for burst in bursts:
			draw_arc(burst.p, burst.r, 0, TAU, 48, Color(burst.c, maxf(0, burst.a)), 4)


	func _draw_frame() -> void:
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.008, 0.018, 0.045, 0.22)
		style.border_color = Color("#F6C768", 0.58)
		style.set_border_width_all(1)
		style.set_corner_radius_all(5)
		style.shadow_color = Color("#050711", 0.36)
		style.shadow_size = 8
		draw_style_box(style, Rect2(Vector2(3, 3), size - Vector2(6, 6)))
		for point in star_points:
			var p := Vector2(point.x * size.x, point.y * size.y)
			draw_circle(p, 1.2 + sin(pulse * 2.0 + point.x * 12.0) * 0.5, Color(CREAM, 0.25))


	func _draw_rhythm() -> void:
		var horizon_y := size.y * 0.17
		var hit_y := size.y - 82.0
		var top_left := size.x * 0.34
		var top_right := size.x * 0.66
		for boundary in range(5):
			var ratio := boundary / 4.0
			var top := Vector2(lerpf(top_left, top_right, ratio), horizon_y)
			var bottom := Vector2(lerpf(12.0, size.x - 12.0, ratio), hit_y)
			draw_line(top, bottom, Color(GOLD, 0.40), 1.5)
		for lane in range(4):
			var top_a := Vector2(lerpf(top_left, top_right, lane / 4.0), horizon_y)
			var top_b := Vector2(lerpf(top_left, top_right, (lane + 1) / 4.0), horizon_y)
			var bottom_a := Vector2(lerpf(12.0, size.x - 12.0, lane / 4.0), hit_y)
			var bottom_b := Vector2(lerpf(12.0, size.x - 12.0, (lane + 1) / 4.0), hit_y)
			draw_colored_polygon(PackedVector2Array([top_a, top_b, bottom_b, bottom_a]), Color(COLORS[lane], 0.025))
			var label_x := (bottom_a.x + bottom_b.x) * 0.5 - 10.0
			draw_string(ThemeDB.fallback_font, Vector2(label_x, hit_y - 16.0), ["A", "S", "K", "L"][lane], HORIZONTAL_ALIGNMENT_CENTER, 20, 18, COLORS[lane])
		draw_line(Vector2(12, hit_y), Vector2(size.x - 12, hit_y), Color(CREAM, 0.84), 3)
		for note in notes:
			var travel := clampf((note.y - horizon_y) / maxf(1.0, hit_y - horizon_y), 0.0, 1.0)
			var top_x := lerpf(top_left, top_right, (note.lane + 0.5) / 4.0)
			var bottom_x := lerpf(12.0, size.x - 12.0, (note.lane + 0.5) / 4.0)
			var center := Vector2(lerpf(top_x, bottom_x, travel), note.y)
			var note_scale := lerpf(0.58, 1.0, travel)
			for radius in [30.0, 24.0, 17.0]:
				draw_circle(center, radius * note_scale, Color(COLORS[note.lane], 0.10 + (30.0 - radius) * 0.018))
			draw_arc(center, 30.0 * note_scale, pulse + note.lane, pulse + note.lane + 4.8, 28, COLORS[note.lane], 3)


	func _draw_hunt() -> void:
		for target in targets:
			var color := GOLD if target.special else CYAN
			var alpha: float = clampf(target.ttl, 0.2, 1.0)
			draw_circle(target.p, target.r * 1.45, Color(color, 0.08 * alpha))
			draw_arc(target.p, target.r, pulse, pulse + 4.8, 40, Color(color, alpha), 4)
			draw_arc(target.p, target.r * 0.65, -pulse, -pulse + 4.8, 32, Color(CREAM, alpha * 0.75), 2)
			draw_line(target.p - Vector2(target.r * 1.2, 0), target.p + Vector2(target.r * 1.2, 0), Color(color, alpha * 0.55), 1)
			draw_line(target.p - Vector2(0, target.r * 1.2), target.p + Vector2(0, target.r * 1.2), Color(color, alpha * 0.55), 1)


	func _draw_outfit() -> void:
		var cell_path := [
			Vector2(0.38, 0.30), Vector2(0.50, 0.30), Vector2(0.62, 0.30),
			Vector2(0.68, 0.40), Vector2(0.62, 0.50), Vector2(0.50, 0.50),
			Vector2(0.38, 0.50), Vector2(0.32, 0.40)
		]
		for index in range(mini(sequence_index, cell_path.size())):
			var center := Vector2(cell_path[index].x * size.x, cell_path[index].y * size.y)
			var color: Color = COLORS[sequence[index] + 1]
			var points := PackedVector2Array()
			for side in range(6):
				points.append(center + Vector2.from_angle(PI / 6.0 + side * TAU / 6.0) * 31.0)
			draw_colored_polygon(points, Color(color, 0.46))
			draw_polyline(PackedVector2Array(Array(points) + [points[0]]), Color(CREAM, 0.82), 2.0)
			draw_circle(center, 9.0, Color(CREAM, 0.84))
		if sequence_index < sequence.size():
			var next_center := Vector2(cell_path[sequence_index].x * size.x, cell_path[sequence_index].y * size.y)
			draw_arc(next_center, 37.0, pulse, pulse + 5.1, 48, GOLD, 3.0)
		for index in range(sequence.size()):
			var color := GREEN if index < sequence_index else GOLD if index == sequence_index else Color(MUTED, 0.35)
			draw_circle(Vector2(size.x * 0.5 - 98 + index * 28, 42), 7, color)


func configure(activity_mode: String, index: int) -> void:
	mode = activity_mode
	guardian_index = clampi(index, 0, 23)
	_load_guardians()
	_build()


func _load_guardians() -> void:
	if not guardians.is_empty():
		return
	var file := FileAccess.open("res://data/guardians.json", FileAccess.READ)
	if not file:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed is Dictionary:
		guardians = parsed.get("guardians", [])


func _guardian() -> Dictionary:
	return guardians[guardian_index] if guardian_index < guardians.size() else {}


func _mode_data() -> Dictionary:
	return {
		"rhythm_game": {"title":"DANSE DES CONSTELLATIONS","subtitle":"RYTHME ASTRAL","accent":PINK,"objective":"Atteignez 9 000 points avant la fin.","controls":["A","S","K","L"]},
		"astral_hunt": {"title":"CHASSE ASTRALE","subtitle":"PRÉCISION CÉLESTE","accent":CYAN,"objective":"Marquez les anomalies avant leur disparition.","controls":["VISER","TIRER","VISION","FOCUS"]},
		"outfit_workshop": {"title":"ATELIER DES TENUES","subtitle":"CRÉATION CÉLESTE","accent":GOLD,"objective":"Assemblez huit matières dans le bon ordre.","controls":["SOIE","CRISTAL","OR","INDICE"]},
	}[mode]


func _build() -> void:
	for child in get_children():
		child.queue_free()
	var data := _guardian()
	var mode_data := _mode_data()
	var accent: Color = mode_data.accent
	var compact := get_viewport_rect().size.y > get_viewport_rect().size.x
	_add_background()
	var page := MarginContainer.new()
	page.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	page.add_theme_constant_override("margin_left", 24)
	page.add_theme_constant_override("margin_right", 24)
	page.add_theme_constant_override("margin_top", 18)
	page.add_theme_constant_override("margin_bottom", 18)
	add_child(page)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	page.add_child(layout)
	var header := HBoxContainer.new()
	header.custom_minimum_size.y = 82
	header.add_theme_constant_override("separation", 14)
	layout.add_child(header)
	var back := _button("‹", SURFACE)
	back.custom_minimum_size = Vector2(58, 58)
	back.pressed.connect(_route.bind("hub_pc"))
	header.add_child(back)
	var heading := VBoxContainer.new()
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(heading)
	heading.add_child(_label(mode_data.subtitle, 13, accent, true))
	heading.add_child(_label(mode_data.title, 24 if compact else 32, CREAM, true))
	objective_label = _label(mode_data.objective, 13, MUTED)
	heading.add_child(objective_label)
	timer_label = _label("01:00", 30, GOLD, true)
	header.add_child(timer_label)
	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	layout.add_child(body)
	var guardian_panel := _glass(Color(data.get("accent", "#67E8F9")))
	guardian_panel.custom_minimum_size.x = 245
	var guardian_style := guardian_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	guardian_style.bg_color = Color(0.005, 0.008, 0.02, 0.30)
	guardian_style.border_color = Color(Color(data.get("accent", "#67E8F9")), 0.34)
	guardian_panel.add_theme_stylebox_override("panel", guardian_style)
	body.add_child(guardian_panel)
	guardian_panel.visible = not compact
	var g := _padded_stack(guardian_panel, 12)
	var portrait := TextureRect.new()
	portrait.texture = load(str(data.get("fullbody_art", data.get("art", ""))))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.custom_minimum_size.y = 350
	g.add_child(portrait)
	g.add_child(_label(data.get("name", ""), 22, CREAM, true))
	g.add_child(_label(data.get("title", ""), 13, Color(data.get("accent", "#67E8F9")), true))
	g.add_child(_stat_row("Bonus", "+12 % score"))
	g.add_child(_stat_row("Meilleur", "184 200"))
	g.add_child(_route_button("CHANGER", "roster", SURFACE))
	var center := VBoxContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(center)
	var score_row := HBoxContainer.new()
	center.add_child(score_row)
	score_label = _label("SCORE 000000", 16, GOLD, true)
	score_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	score_row.add_child(score_label)
	combo_label = _label("COMBO ×0", 16, accent, true)
	score_row.add_child(combo_label)
	arena = ActivityArena.new()
	arena.custom_minimum_size = Vector2(0 if compact else 650, 720 if compact else 510)
	arena.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arena.size_flags_vertical = Control.SIZE_EXPAND_FILL
	arena.stats_changed.connect(_update_stats)
	arena.activity_finished.connect(_finish)
	center.add_child(arena)
	var intel := _glass(accent)
	intel.custom_minimum_size.x = 280
	var intel_style := intel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	intel_style.bg_color = Color(0.005, 0.008, 0.02, 0.48)
	intel_style.border_color = Color(accent, 0.42)
	intel.add_theme_stylebox_override("panel", intel_style)
	body.add_child(intel)
	intel.visible = not compact
	var i := _padded_stack(intel, 16)
	i.add_child(_label("OBJECTIF", 13, accent, true))
	i.add_child(_label(mode_data.objective, 17, CREAM, true))
	i.add_child(_line(accent))
	i.add_child(_label("RÈGLES", 13, GOLD, true))
	for rule in _rules_for_mode():
		i.add_child(_label("◇  " + rule, 13, MUTED))
	i.add_child(_line(PINK))
	i.add_child(_label("RETOUR EN DIRECT", 13, PINK, true))
	objective_label = _label("PRÊT • commencez maintenant", 15, CREAM, true)
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	i.add_child(objective_label)
	i.add_child(_label("PROGRESSION", 11, CYAN, true))
	progress_bar = _progress(accent, 0)
	progress_bar.custom_minimum_size.y = 24
	i.add_child(progress_bar)
	var controls := HBoxContainer.new()
	controls.custom_minimum_size.y = 82
	controls.add_theme_constant_override("separation", 10)
	layout.add_child(controls)
	action_buttons.clear()
	for slot in range(4):
		var button := _button(mode_data.controls[slot], accent if slot < 3 else SURFACE, INK if accent in [CYAN, GOLD, GREEN] and slot < 3 else CREAM)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_activate_slot.bind(slot))
		action_buttons.append(button)
		controls.add_child(button)
	arena.configure(mode, load(str(data.get("fullbody_art", data.get("art", "")))))


func _rules_for_mode() -> Array:
	match mode:
		"rhythm_game":
			return ["Frappez une note sur la ligne lumineuse.", "PARFAIT maintient le multiplicateur.", "Une note manquée remet le combo à zéro."]
		"astral_hunt":
			return ["Cliquez directement chaque anomalie.", "Les cibles dorées valent triple.", "La Vision astrale ralentit les cibles."]
		_:
			return ["Suivez la contrainte affichée en haut.", "Chaque bonne matière augmente le combo.", "Une erreur retire 250 points sans bloquer."]


func _activate_slot(slot: int) -> void:
	match mode:
		"rhythm_game":
			arena.activate_slot(slot)
		"astral_hunt":
			if slot == 1 and not arena.targets.is_empty():
				arena._hit_target(arena.targets[0].p)
			elif slot >= 2:
				arena.use_power()
			else:
				objective_label.text = "Visez directement une anomalie dans la zone centrale."
		"outfit_workshop":
			if slot == 3:
				arena.use_power()
			else:
				arena.activate_slot(slot)


func _update_stats(score: int, combo: int, time_left: float, progress: float, message: String) -> void:
	score_label.text = "SCORE %06d" % score
	combo_label.text = "COMBO ×%d" % combo
	timer_label.text = "%02d:%02d" % [int(time_left) / 60, int(time_left) % 60]
	progress_bar.value = progress
	objective_label.text = message


func _finish(success: bool) -> void:
	objective_label.text = "ACTIVITÉ RÉUSSIE • récompense obtenue" if success else "OBJECTIF MANQUÉ • nouvel essai disponible"


func _add_background() -> void:
	var backdrop := TextureRect.new()
	var background_path: String = {
		"rhythm_game": "res://assets/backgrounds/constellation-ballroom-v7.png",
		"astral_hunt": "res://assets/backgrounds/astral-hunt-gallery-v7.png",
		"outfit_workshop": "res://assets/backgrounds/celestial-couture-v7.png",
	}.get(mode, "res://assets/backgrounds/astral-super-magic-v1.png")
	backdrop.texture = load(background_path)
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.modulate = Color(0.84, 0.88, 1.0, 1)
	add_child(backdrop)
	var dim := ColorRect.new()
	dim.color = Color(0.005, 0.008, 0.03, 0.22)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)


func _route(screen_id: String) -> void:
	route_requested.emit(screen_id)


func _glass(accent: Color) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.012, 0.016, 0.038, 0.78)
	style.border_color = Color(accent, 0.62)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.shadow_color = Color(0, 0, 0, 0.52)
	style.shadow_size = 10
	panel.add_theme_stylebox_override("panel", style)
	return panel


func _padded_stack(panel: PanelContainer, padding: int) -> VBoxContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", padding)
	margin.add_theme_constant_override("margin_right", padding)
	margin.add_theme_constant_override("margin_top", padding)
	margin.add_theme_constant_override("margin_bottom", padding)
	panel.add_child(margin)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 9)
	margin.add_child(stack)
	return stack


func _button(text: String, color: Color, text_color := CREAM) -> Button:
	var button := Button.new()
	button.text = text
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	normal.border_color = Color(color.lightened(0.34), 0.72)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(4)
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = color.lightened(0.12)
	hover.set_border_width_all(2)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	return button


func _route_button(text: String, screen_id: String, color: Color, text_color := CREAM) -> Button:
	var button := _button(text, color, text_color)
	button.pressed.connect(_route.bind(screen_id))
	return button


func _label(text: String, size: int, color: Color, bold := false) -> Label:
	var label := Label.new()
	label.text = text
	var is_display := size >= 20
	var is_ui_heading := bold and text == text.to_upper()
	label.add_theme_font_override("font", FONT_SERIF if is_display else FONT_DISPLAY if is_ui_heading else FONT_BODY)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	if bold:
		label.add_theme_constant_override("outline_size", 1)
		label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.65))
	return label


func _stat_row(left_text: String, right_text: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	var left := _label(left_text, 12, MUTED)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(left)
	var right := _label(right_text, 12, CREAM, true)
	row.add_child(right)
	return row


func _line(color: Color) -> HSeparator:
	var line := HSeparator.new()
	line.custom_minimum_size.y = 8
	var style := StyleBoxFlat.new()
	style.bg_color = Color(color, 0.5)
	style.content_margin_top = 1
	line.add_theme_stylebox_override("separator", style)
	return line


func _progress(color: Color, value: float) -> ProgressBar:
	var progress := ProgressBar.new()
	progress.min_value = 0
	progress.max_value = 100
	progress.value = value
	progress.show_percentage = true
	progress.add_theme_font_size_override("font_size", 11)
	var background := StyleBoxFlat.new()
	background.bg_color = Color("#080B18")
	background.set_corner_radius_all(10)
	background.border_color = Color("#303754")
	background.set_border_width_all(1)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(10)
	progress.add_theme_stylebox_override("background", background)
	progress.add_theme_stylebox_override("fill", fill)
	return progress

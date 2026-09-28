extends Control
class_name AstraCombatBoard

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
const FONT_DISPLAY := preload("res://assets/fonts/Cinzel-Variable.ttf")
const FONT_SERIF := preload("res://assets/fonts/CormorantGaramond-Variable.ttf")
const FONT_BODY := preload("res://assets/fonts/Manrope-Variable.ttf")

var guardian_index := 22
var guardians: Array = []
var chamber: CombatChamber
var score_label: Label
var combo_label: Label
var boss_label: Label
var boss_bar: ProgressBar
var magic_bar: ProgressBar
var overdrive_bar: ProgressBar
var phase_label: Label
var next_label: Label
var q_button: Button
var e_button: Button
var r_button: Button
var event_label: Label


class CombatChamber:
	extends Control

	signal stats_changed(score: int, combo: int, magic: float, overdrive: float, boss: float, phase: int, next_tier: int)
	signal battle_finished(victory: bool)

	const COLORS := [
		Color("#67E8F9"), Color("#A78BFA"), Color("#F472B6"),
		Color("#F6C768"), Color("#5EEAD4"), Color("#FB923C")
	]
	const NAMES := ["PIO", "LUMI", "SÉLA", "KORI", "HÉLIO", "AURIEL"]

	var orbs: Array = []
	var effects: Array = []
	var rng := RandomNumberGenerator.new()
	var next_tier := 0
	var score := 0
	var combo := 0
	var magic := 0.0
	var overdrive := 0.0
	var boss := 100.0
	var phase := 1
	var spawn_cooldown := 0.0
	var combo_clock := 0.0
	var battle_over := false
	var pulse := 0.0


	func _ready() -> void:
		rng.seed = 0xA57A
		mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		set_process(true)
		queue_redraw()


	func reset() -> void:
		orbs.clear()
		effects.clear()
		next_tier = 0
		score = 0
		combo = 0
		magic = 0
		overdrive = 0
		boss = 100
		phase = 1
		battle_over = false
		var seed_tiers := [0, 0, 1, 2, 1, 0, 3]
		for index in range(seed_tiers.size()):
			var tier: int = seed_tiers[index]
			var radius := _radius(tier)
			var x := lerpf(72.0, maxf(90.0, size.x - 72.0), index / float(seed_tiers.size() - 1))
			var y := size.y - 30.0 - radius - (36.0 if index in [2, 4] else 0.0)
			orbs.append({"p": Vector2(x, y), "v": Vector2.ZERO, "tier": tier, "r": radius})
		_emit_stats()


	func _gui_input(event: InputEvent) -> void:
		if battle_over:
			return
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			drop_orb(event.position.x)
			accept_event()
		elif event is InputEventScreenTouch and event.pressed:
			drop_orb(event.position.x)
			accept_event()


	func drop_orb(local_x: float) -> void:
		if spawn_cooldown > 0.0 or orbs.size() >= 34:
			return
		var radius := _radius(next_tier)
		orbs.append({
			"p": Vector2(clampf(local_x, radius + 12, size.x - radius - 12), radius + 16),
			"v": Vector2(rng.randf_range(-16, 16), 30),
			"tier": next_tier,
			"r": radius
		})
		next_tier = 1 if rng.randf() < 0.28 else 0
		spawn_cooldown = 0.16
		_emit_stats()


	func cast_gravity_well() -> bool:
		if magic < 35.0 or battle_over:
			return false
		magic -= 35.0
		for orb in orbs:
			var delta: Vector2 = Vector2(size.x * 0.5, size.y * 0.66) - orb.p
			orb.v += delta.normalized() * 260.0
		effects.append({"p": Vector2(size.x * 0.5, size.y * 0.66), "r": 26.0, "a": 1.0, "c": COLORS[0]})
		_emit_stats()
		return true


	func cast_ultimate() -> bool:
		if magic < 100.0 or battle_over:
			return false
		magic = 0.0
		var removed := mini(8, orbs.size())
		for index in range(removed):
			var orb = orbs.pop_front()
			effects.append({"p": orb.p, "r": orb.r, "a": 1.0, "c": COLORS[orb.tier]})
		_damage_boss(18.0 + removed * 1.4)
		score += 5000 + removed * 600
		combo += 3
		overdrive = minf(100.0, overdrive + 22.0)
		_emit_stats()
		return true


	func cast_overdrive() -> bool:
		if overdrive < 100.0 or battle_over:
			return false
		overdrive = 0.0
		for orb in orbs:
			orb.tier = mini(5, int(orb.tier) + 1)
			orb.r = _radius(orb.tier)
			orb.v.y -= 90.0
		effects.append({"p": Vector2(size.x * 0.5, size.y * 0.5), "r": 48.0, "a": 1.0, "c": COLORS[3]})
		_damage_boss(12.0)
		score += 8000
		_emit_stats()
		return true


	func _process(delta: float) -> void:
		if battle_over:
			return
		spawn_cooldown = maxf(0.0, spawn_cooldown - delta)
		combo_clock = maxf(0.0, combo_clock - delta)
		if combo_clock <= 0.0 and combo > 0:
			combo = 0
		pulse += delta
		_simulate_orbs(delta)
		_simulate_effects(delta)
		_check_overflow()
		queue_redraw()


	func _simulate_orbs(delta: float) -> void:
		var floor_y := size.y - 18.0
		for orb in orbs:
			orb.v.y += 740.0 * delta
			orb.v *= 0.998
			orb.p += orb.v * delta
			var radius: float = orb.r
			if orb.p.x < radius + 10:
				orb.p.x = radius + 10
				orb.v.x = absf(orb.v.x) * 0.64
			elif orb.p.x > size.x - radius - 10:
				orb.p.x = size.x - radius - 10
				orb.v.x = -absf(orb.v.x) * 0.64
			if orb.p.y > floor_y - radius:
				orb.p.y = floor_y - radius
				orb.v.y = -absf(orb.v.y) * 0.22
				orb.v.x *= 0.90
		var merged := true
		var passes := 0
		while merged and passes < 3:
			merged = false
			passes += 1
			for i in range(orbs.size()):
				if merged:
					break
				for j in range(i + 1, orbs.size()):
					var a = orbs[i]
					var b = orbs[j]
					var delta_pos: Vector2 = b.p - a.p
					var distance := maxf(0.001, delta_pos.length())
					var minimum: float = a.r + b.r
					if distance >= minimum:
						continue
					if int(a.tier) == int(b.tier):
						_merge_pair(i, j)
						merged = true
						break
					var normal := delta_pos / distance
					var overlap := minimum - distance
					a.p -= normal * overlap * 0.5
					b.p += normal * overlap * 0.5
					var relative: Vector2 = b.v - a.v
					var impulse := relative.dot(normal)
					if impulse < 0:
						a.v += normal * impulse * 0.55
						b.v -= normal * impulse * 0.55


	func _merge_pair(i: int, j: int) -> void:
		var first = orbs[i]
		var second = orbs[j]
		var new_tier := mini(5, int(first.tier) + 1)
		var center: Vector2 = (first.p + second.p) * 0.5
		var velocity: Vector2 = (first.v + second.v) * 0.35 + Vector2(0, -110)
		orbs.remove_at(j)
		orbs.remove_at(i)
		orbs.append({"p": center, "v": velocity, "tier": new_tier, "r": _radius(new_tier)})
		combo = combo + 1 if combo_clock > 0 else 1
		combo_clock = 2.4
		var gain := int(pow(2.0, new_tier)) * 140 * combo
		score += gain
		magic = minf(100.0, magic + 7.0 + new_tier * 3.0)
		overdrive = minf(100.0, overdrive + 3.5 + new_tier * 2.2)
		effects.append({"p": center, "r": _radius(new_tier), "a": 1.0, "c": COLORS[new_tier]})
		if new_tier >= 3:
			_damage_boss(2.2 + new_tier * 1.8 + combo * 0.35)
		_emit_stats()


	func _damage_boss(amount: float) -> void:
		boss = maxf(0.0, boss - amount)
		var next_phase := 3 if boss <= 30 else 2 if boss <= 65 else 1
		phase = next_phase
		if boss <= 0.0 and not battle_over:
			battle_over = true
			battle_finished.emit(true)


	func _check_overflow() -> void:
		var danger_count := 0
		for orb in orbs:
			if orb.p.y - orb.r < 78:
				danger_count += 1
		if danger_count >= 4 and not battle_over:
			battle_over = true
			battle_finished.emit(false)


	func _simulate_effects(delta: float) -> void:
		for effect in effects:
			effect.r += 150.0 * delta
			effect.a -= 1.45 * delta
		for index in range(effects.size() - 1, -1, -1):
			if effects[index].a <= 0:
				effects.remove_at(index)


	func _radius(tier: int) -> float:
		return 22.0 + tier * 6.5


	func _emit_stats() -> void:
		stats_changed.emit(score, combo, magic, overdrive, boss, phase, next_tier)


	func _draw() -> void:
		var chamber_rect := Rect2(Vector2(8, 8), size - Vector2(16, 16))
		draw_style_box(_chamber_style(), chamber_rect)
		for y in range(1, 6):
			var line_y := lerpf(70.0, size.y - 24.0, y / 6.0)
			draw_line(Vector2(18, line_y), Vector2(size.x - 18, line_y), Color(0.3, 0.75, 0.95, 0.08), 1)
		for x in range(1, 6):
			var line_x := size.x * x / 6.0
			draw_line(Vector2(line_x, 70), Vector2(line_x, size.y - 22), Color(0.3, 0.75, 0.95, 0.06), 1)
		draw_line(Vector2(18, 78), Vector2(size.x - 18, 78), Color(DANGER, 0.58), 2)
		for orb in orbs:
			_draw_orb(orb)
		for effect in effects:
			draw_arc(effect.p, effect.r, 0, TAU, 48, Color(effect.c, maxf(0, effect.a)), 4)
			draw_arc(effect.p, effect.r * 0.72, 0, TAU, 40, Color(CREAM, maxf(0, effect.a * 0.65)), 2)
		var guide_x := get_local_mouse_position().x
		if Rect2(Vector2.ZERO, size).has_point(get_local_mouse_position()):
			draw_line(Vector2(guide_x, 22), Vector2(guide_x, 72), Color(COLORS[next_tier], 0.76), 3)
			draw_arc(Vector2(guide_x, 28), _radius(next_tier), 0, TAU, 32, Color(COLORS[next_tier], 0.52), 2)


	func _draw_orb(orb: Dictionary) -> void:
		var position: Vector2 = orb.p
		var radius: float = orb.r
		var color: Color = COLORS[orb.tier]
		for layer in range(4, 0, -1):
			draw_circle(position, radius + layer * 5.0, Color(color, 0.022 * layer))
		draw_circle(position, radius, color.darkened(0.48))
		draw_circle(position - Vector2(radius * 0.18, radius * 0.20), radius * 0.68, Color(color, 0.80))
		draw_circle(position - Vector2(radius * 0.31, radius * 0.37), radius * 0.17, Color(CREAM, 0.92))
		draw_arc(position, radius * 1.18, -0.35 + pulse, 2.55 + pulse, 32, Color(CREAM, 0.80), 2)
		draw_arc(position, radius * 1.30, 2.8 - pulse * 0.7, 5.4 - pulse * 0.7, 32, Color(color, 0.82), 2)


	func _chamber_style() -> StyleBoxFlat:
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.005, 0.018, 0.045, 0.18)
		style.border_color = Color("#DFFBFF", 0.72)
		style.set_border_width_all(1)
		style.set_corner_radius_all(5)
		style.shadow_color = Color("#67E8F9", 0.12)
		style.shadow_size = 10
		return style


func configure(index: int) -> void:
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


func _build() -> void:
	for child in get_children():
		child.queue_free()
	var data := _guardian()
	var accent := Color(data.get("accent", "#67E8F9"))
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
	back.pressed.connect(_route.bind("mission_brief"))
	header.add_child(back)
	var heading := VBoxContainer.new()
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(heading)
	heading.add_child(_label("PORT NOYÉ • CHAMBRE DE CONVERGENCE", 13, CYAN, true))
	heading.add_child(_label("LÉVIATHAN DES MARÉES", 25 if compact else 32, CREAM, true))
	phase_label = _label("PHASE 1 • MARÉE MONTANTE", 13, DANGER, true)
	heading.add_child(phase_label)
	var boss_box := VBoxContainer.new()
	boss_box.custom_minimum_size.x = 280 if compact else 520
	header.add_child(boss_box)
	boss_label = _label("CŒUR ASTRAL • 100 %", 14, GOLD, true)
	boss_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	boss_box.add_child(boss_label)
	boss_bar = _progress(DANGER, 100)
	boss_bar.custom_minimum_size.y = 22
	boss_box.add_child(boss_bar)
	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	layout.add_child(body)
	var guardian_panel := _glass(accent)
	guardian_panel.custom_minimum_size.x = 245
	var guardian_style := guardian_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	guardian_style.bg_color = Color(0.005, 0.008, 0.02, 0.30)
	guardian_style.border_color = Color(accent, 0.34)
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
	g.add_child(_label("%s • %s" % [data.get("name", ""), data.get("rarity", "")], 22, CREAM, true))
	g.add_child(_label(data.get("title", ""), 13, accent, true))
	g.add_child(_stat_row("Affinité", data.get("element", "")))
	g.add_child(_stat_row("Rôle", data.get("role", "")))
	g.add_child(_label("COMPÉTENCE", 12, GOLD, true))
	g.add_child(_label(data.get("ability", ""), 16, CREAM, true))
	g.add_child(_route_button("CHANGER", "guardian_switch", SURFACE))
	var center := VBoxContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	center.add_theme_constant_override("separation", 8)
	body.add_child(center)
	var score_row := HBoxContainer.new()
	center.add_child(score_row)
	score_label = _label("SCORE 000000", 16, GOLD, true)
	score_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	score_row.add_child(score_label)
	combo_label = _label("COMBO ×0", 16, CYAN, true)
	combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	score_row.add_child(combo_label)
	chamber = CombatChamber.new()
	chamber.custom_minimum_size = Vector2(0 if compact else 560, 680 if compact else 500)
	chamber.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chamber.size_flags_vertical = Control.SIZE_EXPAND_FILL
	chamber.stats_changed.connect(_update_stats)
	chamber.battle_finished.connect(_finish_battle)
	center.add_child(chamber)
	var next_row := HBoxContainer.new()
	center.add_child(next_row)
	next_label = _label("PROCHAINE • PIO", 13, CYAN, true)
	next_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	next_row.add_child(next_label)
	next_row.add_child(_label("CLIQUEZ / TOUCHEZ LA CHAMBRE POUR LÂCHER UNE ORBE", 12, MUTED))
	var intel := _glass(GOLD)
	intel.custom_minimum_size.x = 285
	body.add_child(intel)
	intel.visible = not compact
	var i := _padded_stack(intel, 16)
	var boss_portrait := TextureRect.new()
	boss_portrait.texture = load("res://assets/backgrounds/void-leviathan-v3.png")
	boss_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	boss_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	boss_portrait.custom_minimum_size.y = 132
	boss_portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	i.add_child(boss_portrait)
	i.add_child(_label("RÈGLE ACTIVE", 13, GOLD, true))
	event_label = _label("Deux Orbes identiques fusionnent.\nLes rangs élevés brisent le boss.\nQuatre Orbes dans la zone rouge provoquent la défaite.", 14, MUTED)
	event_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	i.add_child(event_label)
	i.add_child(_line(DANGER))
	i.add_child(_label("ESCOUADE", 13, CYAN, true))
	for offset in range(3):
		var index := (guardian_index + offset) % guardians.size()
		var member: Dictionary = guardians[index]
		var member_row := HBoxContainer.new()
		var thumb := TextureRect.new()
		thumb.texture = load(member.get("art", ""))
		thumb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		thumb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		thumb.custom_minimum_size = Vector2(58, 58)
		member_row.add_child(thumb)
		var member_copy := VBoxContainer.new()
		member_copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		member_copy.add_child(_label(member.get("name", ""), 13, CREAM, true))
		member_copy.add_child(_label(member.get("role", ""), 11, Color(member.get("accent", "#67E8F9"))))
		member_row.add_child(member_copy)
		i.add_child(member_row)
	i.add_child(_line(GOLD))
	i.add_child(_label("FUSION PARFAITE", 12, PINK, true))
	i.add_child(_label("Enchaînez en moins de 2,4 s pour multiplier le score et la rupture.", 13, MUTED))
	var actions := HBoxContainer.new()
	actions.custom_minimum_size.y = 86
	actions.add_theme_constant_override("separation", 10)
	layout.add_child(actions)
	var gauges := VBoxContainer.new()
	gauges.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions.add_child(gauges)
	gauges.add_child(_label("MAGIE", 11, CYAN, true))
	magic_bar = _progress(CYAN, 0)
	magic_bar.custom_minimum_size.y = 20
	gauges.add_child(magic_bar)
	gauges.add_child(_label("SURPUISSANCE", 11, PINK, true))
	overdrive_bar = _progress(PINK, 0)
	overdrive_bar.custom_minimum_size.y = 20
	gauges.add_child(overdrive_bar)
	q_button = _button("Q • PUITS ASTRAL\n35 %", CYAN, INK)
	q_button.custom_minimum_size.x = 0 if compact else 190
	q_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	q_button.pressed.connect(_cast_q)
	actions.add_child(q_button)
	e_button = _button("E • ULTIME\n100 %", VIOLET)
	e_button.custom_minimum_size.x = 0 if compact else 190
	e_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	e_button.pressed.connect(_cast_e)
	actions.add_child(e_button)
	r_button = _button("R • SURPUISSANCE\n100 %", PINK)
	r_button.custom_minimum_size.x = 0 if compact else 220
	r_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r_button.pressed.connect(_cast_r)
	actions.add_child(r_button)
	chamber.call_deferred("reset")


func _add_background() -> void:
	var backdrop := TextureRect.new()
	backdrop.texture = load("res://assets/backgrounds/void-leviathan-arena-v7.png")
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.modulate = Color(0.88, 0.92, 1.0, 1)
	add_child(backdrop)
	var dim := ColorRect.new()
	dim.color = Color(0.005, 0.008, 0.03, 0.18)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(dim)


func _update_stats(score: int, combo: int, magic: float, overdrive: float, boss: float, phase: int, next_tier: int) -> void:
	score_label.text = "SCORE %06d" % score
	combo_label.text = "COMBO ×%d" % combo
	boss_label.text = "CŒUR ASTRAL • %d %%" % int(ceil(boss))
	boss_bar.value = boss
	magic_bar.value = magic
	overdrive_bar.value = overdrive
	phase_label.text = "PHASE %d • %s" % [phase, "CŒUR DE LA TEMPÊTE" if phase == 3 else "MARÉE HOSTILE" if phase == 2 else "MARÉE MONTANTE"]
	next_label.text = "PROCHAINE • %s" % CombatChamber.NAMES[next_tier]
	q_button.disabled = magic < 35
	e_button.disabled = magic < 100
	r_button.disabled = overdrive < 100


func _cast_q() -> void:
	if chamber.cast_gravity_well():
		event_label.text = "PUITS ASTRAL • toutes les Orbes convergent vers le centre."


func _cast_e() -> void:
	if chamber.cast_ultimate():
		event_label.text = "ULTIME • la chambre est purifiée et le cœur astral se fissure."


func _cast_r() -> void:
	if chamber.cast_overdrive():
		event_label.text = "SURPUISSANCE • toutes les Orbes gagnent immédiatement un rang."


func _finish_battle(victory: bool) -> void:
	var timer := get_tree().create_timer(0.75)
	await timer.timeout
	route_requested.emit("victory" if victory else "defeat")


func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	var handled := true
	match event.physical_keycode:
		KEY_Q:
			_cast_q()
		KEY_E:
			_cast_e()
		KEY_R:
			_cast_r()
		_:
			handled = false
	if handled:
		get_viewport().set_input_as_handled()


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

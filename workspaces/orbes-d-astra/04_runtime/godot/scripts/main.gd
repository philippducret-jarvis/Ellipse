extends Node3D

const INK := Color("#050711")
const SURFACE := Color("#111529")
const CYAN := Color("#67E8F9")
const GOLD := Color("#F6C768")
const VIOLET := Color("#A78BFA")
const PINK := Color("#F472B6")
const DANGER := Color("#FB7185")
const CREAM := Color("#FFF4DC")
const MUTED := Color("#A9A4B8")
const ORB_COLORS := [CYAN, VIOLET, PINK, GOLD, Color("#5EEAD4"), Color("#FB923C")]
const ORB_NAMES := ["Pio", "Lumi", "Séla", "Kori", "Hélio", "Auriel"]
const UI_SCREEN_IDS := [
	"title", "onboarding", "hub_pc", "hub_mobile", "world_map", "mission_brief",
	"combat_pc", "combat_mobile", "boss_phase_3", "guardian_switch", "ultimate",
	"overdrive", "victory", "defeat", "roster", "guardian_detail", "equipment",
	"wardrobe", "bond", "summon_single", "summon_ten", "shop", "rates_history",
	"rift", "rhythm_game", "astral_hunt", "outfit_workshop", "settings",
	"accessibility", "download_content", "network_error"
]
const GUARDIAN_NAMES := [
	"Mira", "Brann", "Kael", "Orin", "Talia", "Joren", "Phaé", "Ciro",
	"Lys", "Noor", "Vesper", "Saphira", "Nyx", "Ilyra", "Caelum", "Rhéa",
	"Talos", "Maëlys", "Aster", "Élya", "Solveig", "Séraphiel", "Vaelora Noctis", "Orion"
]
const GUARDIAN_IDS := [
	"mira", "brann", "kael", "orin", "talia", "joren", "phae", "ciro",
	"lys", "noor", "vesper", "saphira", "nyx", "ilyra", "caelum", "rhea",
	"talos", "maelys", "aster", "elya", "solveig", "seraphiel", "vaelora", "orion"
]
const MODEL_CATALOG_SCRIPT := preload("res://scripts/model_catalog.gd")
const GUARDIAN_TITLES := [
	"Oracle des marées", "Rempart volcanique", "Chasseur d’étoiles", "Navigateur des abysses",
	"Messagère du zéphyr", "Gardien du croissant", "Floraison astrale", "Œil de l’aurore",
	"Horlogère des songes", "Cantatrice de l’aube", "Sentinelle nocturne", "Dame aux mille prismes",
	"Tisseuse de l’abîme", "Virtuose des constellations", "Prince des orages", "Reine des courants",
	"Architecte de guerre", "Astromancienne impériale", "Arcaniste stellaire", "Prima du firmament",
	"Valkyrie boréale", "Héraut de l’empyrée", "Impératrice astrale", "Archonte du Nexus"
]

var world_root: Node3D
var fx_root: Node3D
var camera: Camera3D
var ui: CanvasLayer
var screen_root: Control
var top_gradient: ColorRect
var title_label: Label
var subtitle_label: Label
var boss_bar: ProgressBar
var boss_label: Label
var score_label: Label
var combo_label: Label
var energy_bar: ProgressBar
var overdrive_bar: ProgressBar
var next_label: Label
var skill_button: Button
var ultimate_button: Button
var overdrive_button: Button
var toast: Label
var help_label: Label
var current_screen := "hub"
var orbs: Array[RigidBody3D] = []
var next_tier := 0
var boss_health := 1000.0
var energy := 0.0
var overdrive := 0.0
var score := 0
var combo := 0
var merge_lock := false
var merge_clock := 0.0
var boss_clock := 0.0
var surge_clock := 0.0
var toast_tween: Tween
var rng := RandomNumberGenerator.new()
var mira_instance: Node3D
var model_catalog = MODEL_CATALOG_SCRIPT.new()
var leviathan_instance: Node3D
var astral_shards := 3210
var pity_count := 62
var summon_overlay: Control
var design_fx_root: Control
var design_combo := 0
var design_hits := 0
var onboarding_step := 0
var selected_guardian := 22
var selected_item := 0
var selected_outfit := 0
var selected_map_node := 0
var selected_setting_tab := 0
var download_progress := 36.0
var native_root: Control


func _ready() -> void:
	rng.seed = 0xA57A
	_build_world_shell()
	_build_ui_shell()
	if "--qa-ui-catalog" in OS.get_cmdline_user_args():
		_show_hub()
		_capture_ui_catalog.call_deferred()
	elif "--qa-ui-mobile" in OS.get_cmdline_user_args():
		_show_hub()
		_capture_native_mobile_qa.call_deferred()
	elif "--qa-gameplay-smoke" in OS.get_cmdline_user_args():
		_capture_gameplay_smoke.call_deferred()
	elif "--qa-capture-mobile" in OS.get_cmdline_user_args():
		_show_hub()
		_capture_mobile_qa.call_deferred()
	elif "--qa-capture" in OS.get_cmdline_user_args():
		_show_hub()
		_capture_runtime_qa.call_deferred()
	else:
		_go_to("title")


func _capture_gameplay_smoke() -> void:
	var qa_dir := ProjectSettings.globalize_path("res://qa")
	DirAccess.make_dir_recursive_absolute(qa_dir)
	var viewport := SubViewport.new()
	viewport.size = Vector2i(1280, 720)
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	var test_root := Control.new()
	test_root.size = Vector2(1280, 720)
	viewport.add_child(test_root)
	var checks: Array = []

	var combat_script := preload("res://scripts/combat_board.gd")
	var combat: Control = combat_script.new()
	combat.size = test_root.size
	test_root.add_child(combat)
	combat.configure(selected_guardian)
	for frame in range(5):
		await get_tree().process_frame
	combat.chamber.reset()
	var seeded_orbs: int = combat.chamber.orbs.size()
	combat.chamber.drop_orb(combat.chamber.size.x * 0.5)
	var drop_ok: bool = combat.chamber.orbs.size() == seeded_orbs + 1
	combat.chamber.magic = 35.0
	var gravity_ok: bool = combat.chamber.cast_gravity_well()
	combat.chamber.magic = 100.0
	var ultimate_ok: bool = combat.chamber.cast_ultimate()
	combat.chamber.overdrive = 100.0
	var overdrive_ok: bool = combat.chamber.cast_overdrive()
	checks.append({
		"id": "combat_orb_magic_loop",
		"ok": drop_ok and gravity_ok and ultimate_ok and overdrive_ok,
		"details": {"seeded_orbs": seeded_orbs, "drop": drop_ok, "gravity": gravity_ok, "ultimate": ultimate_ok, "overdrive": overdrive_ok}
	})
	combat.queue_free()
	await get_tree().process_frame

	var activity_script := preload("res://scripts/activity_board.gd")
	var modes := ["rhythm_game", "astral_hunt", "outfit_workshop"]
	for mode_id in modes:
		var activity: Control = activity_script.new()
		activity.size = test_root.size
		test_root.add_child(activity)
		activity.configure(mode_id, selected_guardian)
		for frame in range(4):
			await get_tree().process_frame
		var ok := false
		var details := {}
		if mode_id == "rhythm_game":
			activity.arena.notes.clear()
			activity.arena.notes.append({"lane": 2, "y": activity.arena.size.y - 82.0, "speed": 0.0})
			activity.arena.activate_slot(2)
			ok = activity.arena.score > 0 and activity.arena.combo == 1
			details = {"score": activity.arena.score, "combo": activity.arena.combo}
		elif mode_id == "astral_hunt":
			var target_position: Vector2 = activity.arena.size * 0.5
			activity.arena.targets.clear()
			activity.arena.targets.append({"p": target_position, "r": 38.0, "ttl": 2.0, "special": true})
			activity.arena._hit_target(target_position)
			ok = activity.arena.score == 900 and activity.arena.targets.is_empty()
			details = {"score": activity.arena.score, "remaining_targets": activity.arena.targets.size()}
		else:
			while activity.arena.sequence_index < activity.arena.sequence.size():
				var expected_slot: int = activity.arena.sequence[activity.arena.sequence_index]
				activity.arena.activate_slot(expected_slot)
			ok = activity.arena.finished and activity.arena.progress == 100.0 and activity.arena.score > 0
			details = {"score": activity.arena.score, "progress": activity.arena.progress}
		checks.append({"id": mode_id, "ok": ok, "details": details})
		activity.queue_free()
		await get_tree().process_frame

	var passed := 0
	for check in checks:
		if check.ok:
			passed += 1
	var report := {
		"schema_version": 1,
		"guardian_index": selected_guardian,
		"guardian_name": GUARDIAN_NAMES[selected_guardian],
		"expected": checks.size(),
		"passed": passed,
		"checks": checks
	}
	var report_file := FileAccess.open(qa_dir.path_join("gameplay-smoke-report.json"), FileAccess.WRITE)
	if report_file:
		report_file.store_string(JSON.stringify(report, "\t"))
		report_file.close()
	print("QA_GAMEPLAY_SMOKE ", passed, "/", checks.size())
	viewport.queue_free()
	get_tree().quit(0 if passed == checks.size() else 1)


func _capture_native_mobile_qa() -> void:
	var qa_dir := ProjectSettings.globalize_path("res://qa/ui-mobile")
	DirAccess.make_dir_recursive_absolute(qa_dir)
	var viewport := SubViewport.new()
	viewport.size = Vector2i(941, 1672)
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	var mobile_root := Control.new()
	mobile_root.size = Vector2(941, 1672)
	viewport.add_child(mobile_root)
	var screen_ids := [
		"title", "onboarding", "hub_mobile", "world_map", "mission_brief",
		"roster", "guardian_detail", "equipment", "wardrobe", "shop", "settings",
		"accessibility", "network_error", "combat_pc", "rhythm_game",
		"astral_hunt", "outfit_workshop"
	]
	var captured := 0
	var report := {"schema_version": 1, "resolution": [941, 1672], "screens": []}
	for screen_id in screen_ids:
		for child in mobile_root.get_children():
			child.queue_free()
		await get_tree().process_frame
		var mobile_screen: Control
		if screen_id == "combat_pc":
			var combat_script := preload("res://scripts/combat_board.gd")
			mobile_screen = combat_script.new()
			mobile_screen.size = Vector2(941, 1672)
			mobile_root.add_child(mobile_screen)
			mobile_screen.configure(selected_guardian)
		elif screen_id in ["rhythm_game", "astral_hunt", "outfit_workshop"]:
			var activity_script := preload("res://scripts/activity_board.gd")
			mobile_screen = activity_script.new()
			mobile_screen.size = Vector2(941, 1672)
			mobile_root.add_child(mobile_screen)
			mobile_screen.configure(screen_id, selected_guardian)
		else:
			var catalog_script := preload("res://scripts/ui_catalog.gd")
			mobile_screen = catalog_script.new()
			mobile_screen.size = Vector2(941, 1672)
			mobile_root.add_child(mobile_screen)
			mobile_screen.set_guardian_index(selected_guardian)
			mobile_screen.render(screen_id)
		for frame in range(8):
			await get_tree().process_frame
		var error := viewport.get_texture().get_image().save_png(qa_dir.path_join("%s.png" % screen_id))
		if error == OK:
			captured += 1
		report.screens.append({"id": screen_id, "ok": error == OK})
		print("QA_UI_MOBILE ", screen_id, "=", error)
	report.expected = screen_ids.size()
	report.captured = captured
	var report_file := FileAccess.open(qa_dir.get_base_dir().path_join("ui-mobile-report.json"), FileAccess.WRITE)
	if report_file:
		report_file.store_string(JSON.stringify(report, "\t"))
		report_file.close()
	viewport.queue_free()
	get_tree().quit(0 if captured == screen_ids.size() else 1)


func _capture_ui_catalog() -> void:
	var viewport_size := get_viewport().get_visible_rect().size
	var form_factor := "mobile" if viewport_size.y > viewport_size.x else "desktop"
	var folder_name := "ui-catalog-mobile" if form_factor == "mobile" else "ui-catalog"
	var qa_dir := ProjectSettings.globalize_path("res://qa/" + folder_name)
	DirAccess.make_dir_recursive_absolute(qa_dir)
	var report := {
		"schema_version": 1,
		"form_factor": form_factor,
		"resolution": [int(viewport_size.x), int(viewport_size.y)],
		"expected": UI_SCREEN_IDS.size(),
		"captured": 0,
		"screens": []
	}
	var all_ok := true
	for screen_id in UI_SCREEN_IDS:
		_go_to(screen_id)
		for frame in range(7):
			await get_tree().process_frame
		var controls := screen_root.find_children("*", "BaseButton", true, false)
		var connected_controls := 0
		for control in controls:
			if control is BaseButton and not control.disabled and control.pressed.get_connections().size() > 0:
				connected_controls += 1
		var capture_path := qa_dir.path_join("%s.png" % screen_id)
		var capture_error := get_viewport().get_texture().get_image().save_png(capture_path)
		var screen_ok := capture_error == OK and connected_controls > 0
		all_ok = all_ok and screen_ok
		report.screens.append({
			"id": screen_id,
			"file": capture_path.get_file(),
			"controls": controls.size(),
			"connected_controls": connected_controls,
			"ok": screen_ok
		})
		if screen_ok:
			report.captured += 1
		print("QA_UI_SCREEN ", screen_id, "=", capture_error)
	var report_name := "ui-catalog-mobile-report.json" if form_factor == "mobile" else "ui-catalog-report.json"
	var report_file := FileAccess.open(qa_dir.get_base_dir().path_join(report_name), FileAccess.WRITE)
	if report_file:
		report_file.store_string(JSON.stringify(report, "\t"))
		report_file.close()
	else:
		all_ok = false
	get_tree().quit(0 if all_ok and report.captured == UI_SCREEN_IDS.size() else 1)


func _capture_mobile_qa() -> void:
	var qa_dir := ProjectSettings.globalize_path("res://qa")
	DirAccess.make_dir_recursive_absolute(qa_dir)
	var mobile_viewport := SubViewport.new()
	mobile_viewport.size = Vector2i(941, 1672)
	mobile_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(mobile_viewport)
	var mobile_root := Control.new()
	mobile_root.size = Vector2(941, 1672)
	mobile_viewport.add_child(mobile_root)
	var plate := TextureRect.new()
	plate.texture = load("res://assets/mockups/combat-mobile-target.png")
	plate.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	plate.stretch_mode = TextureRect.STRETCH_SCALE
	plate.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	plate.size = Vector2(941, 1672)
	mobile_root.add_child(plate)
	for frame in range(12):
		await get_tree().process_frame
	var image := mobile_viewport.get_texture().get_image()
	var capture_error := image.save_png(qa_dir.path_join("runtime-combat-mobile.png"))
	print("QA_CAPTURE combat_mobile=", capture_error)
	mobile_viewport.queue_free()
	get_tree().quit(0 if capture_error == OK else 1)


func _capture_runtime_qa() -> void:
	var qa_dir := ProjectSettings.globalize_path("res://qa")
	DirAccess.make_dir_recursive_absolute(qa_dir)
	for frame in range(24):
		await get_tree().process_frame
	var hub_image := get_viewport().get_texture().get_image()
	var hub_error := hub_image.save_png(qa_dir.path_join("runtime-hub.png"))
	print("QA_CAPTURE hub=", hub_error)
	_show_gacha()
	for frame in range(18):
		await get_tree().process_frame
	var gacha_image := get_viewport().get_texture().get_image()
	var gacha_error := gacha_image.save_png(qa_dir.path_join("runtime-gacha.png"))
	print("QA_CAPTURE gacha=", gacha_error)
	_show_side_games()
	for frame in range(18):
		await get_tree().process_frame
	var side_games_image := get_viewport().get_texture().get_image()
	var side_games_error := side_games_image.save_png(qa_dir.path_join("runtime-side-games.png"))
	print("QA_CAPTURE side_games=", side_games_error)
	_show_gacha()
	for frame in range(12):
		await get_tree().process_frame
	_perform_summon(1)
	for frame in range(12):
		await get_tree().process_frame
	var summon_image := get_viewport().get_texture().get_image()
	var summon_error := summon_image.save_png(qa_dir.path_join("runtime-summon.png"))
	print("QA_CAPTURE summon=", summon_error)
	_start_combat()
	for frame in range(24):
		await get_tree().process_frame
	var combat_image := get_viewport().get_texture().get_image()
	var combat_error := combat_image.save_png(qa_dir.path_join("runtime-combat.png"))
	print("QA_CAPTURE combat=", combat_error)
	_design_combat_action("E", CYAN)
	for frame in range(7):
		await get_tree().process_frame
	var ultimate_image := get_viewport().get_texture().get_image()
	var ultimate_error := ultimate_image.save_png(qa_dir.path_join("runtime-ultimate.png"))
	print("QA_CAPTURE ultimate=", ultimate_error)
	for frame in range(50):
		await get_tree().process_frame
	_design_combat_action("R", GOLD)
	for frame in range(7):
		await get_tree().process_frame
	var surge_image := get_viewport().get_texture().get_image()
	var surge_error := surge_image.save_png(qa_dir.path_join("runtime-surpuissance.png"))
	print("QA_CAPTURE surpuissance=", surge_error)
	get_tree().quit(0 if hub_error == OK and gacha_error == OK and side_games_error == OK and summon_error == OK and combat_error == OK and ultimate_error == OK and surge_error == OK else 1)


func _build_world_shell() -> void:
	world_root = Node3D.new()
	world_root.name = "World"
	add_child(world_root)
	fx_root = Node3D.new()
	fx_root.name = "FX"
	add_child(fx_root)

	camera = Camera3D.new()
	camera.name = "MainCamera"
	camera.fov = 48.0
	camera.current = true
	add_child(camera)

	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = INK
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#53638f")
	env.ambient_light_energy = 0.58
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	env.glow_intensity = 0.8
	environment.environment = env
	add_child(environment)

	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-48, -28, 0)
	key.light_color = Color("#B7E8FF")
	key.light_energy = 1.55
	key.shadow_enabled = true
	add_child(key)

	var rim := OmniLight3D.new()
	rim.position = Vector3(-4, 5, 3)
	rim.light_color = VIOLET
	rim.light_energy = 4.2
	rim.omni_range = 12.0
	add_child(rim)
	_update_camera()


func _build_ui_shell() -> void:
	ui = CanvasLayer.new()
	ui.name = "UI"
	add_child(ui)
	screen_root = Control.new()
	screen_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.add_child(screen_root)

	top_gradient = ColorRect.new()
	top_gradient.color = Color(0.02, 0.03, 0.08, 0.82)
	top_gradient.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top_gradient.offset_bottom = 112
	screen_root.add_child(top_gradient)

	title_label = _label("OBSERVATOIRE ASTRA", 34, CREAM, true)
	title_label.position = Vector2(42, 24)
	screen_root.add_child(title_label)
	subtitle_label = _label("VERTICAL SLICE 3D • BLOCKOUT HONNÊTE", 14, CYAN, true)
	subtitle_label.position = Vector2(44, 70)
	screen_root.add_child(subtitle_label)

	toast = _label("", 15, CREAM, true)
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	toast.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	toast.position = Vector2(-580, 28)
	toast.size = Vector2(540, 52)
	toast.modulate.a = 0.0
	screen_root.add_child(toast)


func _clear_screen_ui() -> void:
	if is_instance_valid(summon_overlay):
		summon_overlay.queue_free()
	for child in screen_root.get_children():
		if child not in [top_gradient, title_label, subtitle_label, toast]:
			child.queue_free()
	boss_bar = null
	boss_label = null
	score_label = null
	combo_label = null
	energy_bar = null
	overdrive_bar = null
	next_label = null
	skill_button = null
	ultimate_button = null
	overdrive_button = null
	help_label = null
	summon_overlay = null
	design_fx_root = null


func _clear_world() -> void:
	for child in world_root.get_children():
		child.queue_free()
	for child in fx_root.get_children():
		child.queue_free()
	orbs.clear()
	mira_instance = null
	leviathan_instance = null


func _show_hub() -> void:
	_show_native_screen("hub_pc")


func _show_hub_placeholder(label_text: String) -> void:
	_show_design_notice(label_text)


func _show_side_games() -> void:
	_show_activity_board("rhythm_game")


func _set_shell_visible(value: bool) -> void:
	top_gradient.visible = value
	title_label.visible = value
	subtitle_label.visible = value
	toast.visible = value


func _add_mockup_plate(texture_path: String) -> TextureRect:
	var plate := TextureRect.new()
	plate.name = "DesignTarget_" + texture_path.get_file().get_basename()
	plate.texture = load(texture_path)
	plate.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	plate.stretch_mode = TextureRect.STRETCH_SCALE
	plate.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	plate.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen_root.add_child(plate)
	return plate


func _add_hotspot(normalized_rect: Rect2, callback: Callable, accessible_name: String) -> Button:
	var hotspot := Button.new()
	hotspot.name = "Hotspot_" + accessible_name.validate_node_name()
	hotspot.flat = true
	hotspot.focus_mode = Control.FOCUS_NONE
	hotspot.tooltip_text = accessible_name
	hotspot.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	hotspot.modulate.a = 0.0
	hotspot.anchor_left = normalized_rect.position.x
	hotspot.anchor_top = normalized_rect.position.y
	hotspot.anchor_right = normalized_rect.position.x + normalized_rect.size.x
	hotspot.anchor_bottom = normalized_rect.position.y + normalized_rect.size.y
	hotspot.pressed.connect(callback)
	screen_root.add_child(hotspot)
	return hotspot


func _design_minigame_action(game_name: String, color: Color, center: Vector2) -> void:
	_design_ui_burst(center, color, 5)
	_show_design_notice(game_name + "  •  PARFAIT +200")


func _design_combat_action(action: String, color: Color) -> void:
	if not current_screen.begins_with("combat"):
		return
	design_hits += 1
	design_combo += 1
	score += 250 * design_combo
	var center := Vector2(0.50, 0.47)
	var rings := 3
	var notice := "FUSION PARFAITE  •  COMBO %d" % design_combo
	match action:
		"Q":
			center = Vector2(0.755, 0.80)
			rings = 4
			notice = "ASTRAL BOLT  •  RUPTURE +1"
		"E":
			center = Vector2(0.835, 0.80)
			rings = 5
			notice = "GRAVITY WELL  •  ORBES ATTIRÉES"
		"R":
			center = Vector2(0.925, 0.80)
			rings = 7
			notice = "STARFALL  •  SURPUISSANCE"
		"GUARDIAN":
			center = Vector2(0.12, 0.84)
			notice = "GARDIEN ACTIF : VEYRA"
		_:
			center = Vector2(rng.randf_range(0.42, 0.58), rng.randf_range(0.30, 0.62))
	_design_ui_burst(center, color, rings)
	_show_design_notice(notice)


func _design_ui_burst(normalized_center: Vector2, color: Color, count: int) -> void:
	if not is_instance_valid(design_fx_root):
		return
	var canvas_size := screen_root.size
	for index in range(count):
		var ring := Panel.new()
		ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ring.size = Vector2.ONE * (54.0 + index * 12.0)
		ring.position = canvas_size * normalized_center - ring.size * 0.5
		ring.pivot_offset = ring.size * 0.5
		var style := StyleBoxFlat.new()
		style.bg_color = Color(color, 0.06)
		style.border_color = Color(color, 0.90 - index * 0.08)
		style.set_border_width_all(3)
		style.set_corner_radius_all(100)
		style.shadow_color = Color(color, 0.45)
		style.shadow_size = 8
		ring.add_theme_stylebox_override("panel", style)
		design_fx_root.add_child(ring)
		ring.scale = Vector2.ONE * 0.35
		var duration := 0.34 + index * 0.055
		var tween := create_tween().set_parallel(true)
		tween.tween_property(ring, "scale", Vector2.ONE * (1.7 + index * 0.12), duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(ring, "modulate:a", 0.0, duration)
		tween.chain().tween_callback(ring.queue_free)


func _show_design_notice(message: String) -> void:
	var notice := PanelContainer.new()
	notice.mouse_filter = Control.MOUSE_FILTER_IGNORE
	notice.anchor_left = 0.34
	notice.anchor_right = 0.66
	notice.anchor_top = 0.035
	notice.anchor_bottom = 0.095
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.015, 0.018, 0.040, 0.92)
	style.border_color = Color(GOLD, 0.82)
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	notice.add_theme_stylebox_override("panel", style)
	var label := _label(message, 16, CREAM, true)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	notice.add_child(label)
	screen_root.add_child(notice)
	notice.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(notice, "modulate:a", 1.0, 0.10)
	tween.tween_interval(0.80)
	tween.tween_property(notice, "modulate:a", 0.0, 0.18)
	tween.tween_callback(notice.queue_free)


func _show_gacha() -> void:
	_show_native_screen("roster")


func _perform_summon(count: int) -> void:
	var cost := 300 if count == 1 else 3000
	if astral_shards < cost:
		_show_toast("Cristaux insuffisants : %d requis" % cost)
		return
	astral_shards -= cost
	var guaranteed_ssr := pity_count + count >= 100
	var roll := rng.randf()
	var rarity := "R"
	var portrait_path := "res://assets/portraits/brann.png"
	var guardian_name := "BRANN"
	var role := "Rempart volcanique"
	var accent := GOLD
	if guaranteed_ssr or roll < 0.01:
		rarity = "SSR"
		pity_count = 0
		if rng.randf() < 0.55:
			portrait_path = "res://assets/portraits/mira.png"
			guardian_name = "MIRA"
			role = "Oracle des marées"
			accent = CYAN
		else:
			portrait_path = "res://assets/portraits/aster.png"
			guardian_name = "ASTER"
			role = "Arcaniste stellaire"
			accent = VIOLET
	elif count == 10 or roll < 0.145:
		rarity = "SR"
		pity_count += count
	else:
		pity_count += count
	_show_summon_reveal(portrait_path, guardian_name, rarity, role, accent)


func _show_summon_reveal(texture_path: String, guardian_name: String, rarity: String, role: String, accent: Color) -> void:
	if is_instance_valid(summon_overlay):
		summon_overlay.queue_free()
	summon_overlay = ColorRect.new()
	summon_overlay.color = Color(0.005, 0.008, 0.025, 0.88)
	summon_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen_root.add_child(summon_overlay)
	var flare := _label("RÉSONANCE %s" % rarity, 26, accent, true)
	flare.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	flare.set_anchors_preset(Control.PRESET_CENTER_TOP)
	flare.position = Vector2(-260, 122)
	flare.size = Vector2(520, 44)
	summon_overlay.add_child(flare)
	var card := _portrait_card(texture_path, "%s • %s" % [guardian_name, rarity], role, accent, Vector2(360, 570))
	card.set_anchors_preset(Control.PRESET_CENTER)
	card.position = Vector2(-180, -250)
	summon_overlay.add_child(card)
	var close := _button("AJOUTER À LA CONSTELLATION", accent, Color("#071018"))
	close.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	close.position = Vector2(-205, -96)
	close.size = Vector2(410, 58)
	close.pressed.connect(func():
		summon_overlay.queue_free()
		summon_overlay = null
		_show_gacha()
	)
	summon_overlay.add_child(close)
	_screen_flash(accent, 0.28)


func _build_hub_environment() -> void:
	_add_backdrop("res://assets/backgrounds/astral-observatory-v3.png", Vector3(0, 3.0, -5.5), Vector2(25.0, 14.1))
	_add_mesh(_cylinder_mesh(5.4, 0.16), Vector3(0, -0.12, 0), Vector3.ONE, _material(Color("#08101f"), 0.72, 0.25))
	for radius in [1.06, 1.32, 1.58]:
		var ring := _add_mesh(_torus_mesh(radius, 0.018), Vector3(1.6, 1.42, -0.22), Vector3.ONE, _material(GOLD, 0.82, 0.18, GOLD, 0.42))
		ring.rotation_degrees = Vector3(84 + radius * 2.0, radius * 7.0, 0)
	for index in range(7):
		var point := Vector3(rng.randf_range(-4.8, 4.8), rng.randf_range(0.7, 5.8), rng.randf_range(-0.5, 1.0))
		_add_mesh(_sphere_mesh(rng.randf_range(0.018, 0.035)), point, Vector3.ONE, _material(CYAN if index % 2 else GOLD, 0.0, 0.15, CYAN, 1.1))


func _start_combat() -> void:
	current_screen = "combat_mobile" if get_viewport().get_visible_rect().size.y > get_viewport().get_visible_rect().size.x else "combat_pc"
	_clear_screen_ui()
	_clear_world()
	_set_shell_visible(false)
	var combat_script := preload("res://scripts/combat_board.gd")
	var board: Control = combat_script.new()
	board.name = "InteractiveCombatBoard"
	board.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	board.route_requested.connect(_go_to)
	screen_root.add_child(board)
	board.configure(selected_guardian)


func _build_arena() -> void:
	_add_backdrop("res://assets/backgrounds/drowned-harbor-arena-v4.png", Vector3(0, 3.6, -5.8), Vector2(30.5, 17.15))
	_add_mesh(_box_mesh(Vector3(13.2, 0.18, 4.4)), Vector3(0, -0.17, -0.05), Vector3.ONE, _material(Color("#060b17"), 0.78, 0.24))
	_add_mesh(_box_mesh(Vector3(13.4, 0.035, 0.055)), Vector3(0, -0.06, 2.12), Vector3.ONE, _material(GOLD, 0.84, 0.2, GOLD, 0.16))
	_spawn_boss()
	_build_chamber()
	_spawn_mira(Vector3(-3.95, 0.0, 0.32), Vector3(0, -8, 0), 0.90)


func _spawn_boss() -> void:
	var resource := load("res://assets/bosses/tide_leviathan_v2.glb")
	if resource is PackedScene:
		leviathan_instance = resource.instantiate()
		leviathan_instance.name = "TideLeviathan_RiggedV3"
		leviathan_instance.position = Vector3(0, 3.28, -1.32)
		leviathan_instance.rotation_degrees = Vector3(0, 0, 0)
		leviathan_instance.scale = Vector3.ONE * 0.72
		world_root.add_child(leviathan_instance)
		_play_leviathan_animation("Leviathan_Idle")
	else:
		push_error("Le GLB du Léviathan n’a pas été importé.")


func _build_chamber() -> void:
	var invisible := _material(Color(0, 0, 0, 0))
	_add_static_box(Vector3(-2.48, 2.85, 0), Vector3(0.12, 5.7, 1.3), invisible, false)
	_add_static_box(Vector3(2.48, 2.85, 0), Vector3(0.12, 5.7, 1.3), invisible, false)
	_add_static_box(Vector3(0, 0.04, 0), Vector3(5.08, 0.16, 1.3), invisible, false)
	_add_static_box(Vector3(0, 2.85, 0.68), Vector3(5.08, 5.7, 0.08), invisible, false)
	_add_static_box(Vector3(0, 2.85, -0.68), Vector3(5.08, 5.7, 0.08), invisible, false)

	var glass := _material(Color(0.018, 0.08, 0.12, 0.24), 0.12, 0.18, CYAN, 0.08)
	_add_mesh(_box_mesh(Vector3(5.0, 5.58, 0.025)), Vector3(0, 2.83, 0.70), Vector3.ONE, glass)
	var rail := _material(Color("#9a6f29"), 0.9, 0.15, GOLD, 0.12)
	_add_mesh(_box_mesh(Vector3(0.075, 5.72, 0.12)), Vector3(-2.52, 2.86, 0.72), Vector3.ONE, rail)
	_add_mesh(_box_mesh(Vector3(0.075, 5.72, 0.12)), Vector3(2.52, 2.86, 0.72), Vector3.ONE, rail)
	_add_mesh(_box_mesh(Vector3(5.12, 0.075, 0.12)), Vector3(0, 0.02, 0.72), Vector3.ONE, rail)
	_add_mesh(_box_mesh(Vector3(5.12, 0.075, 0.12)), Vector3(0, 5.70, 0.72), Vector3.ONE, rail)
	var grid := _material(Color(0.22, 0.72, 0.88, 0.22), 0.42, 0.2, CYAN, 0.16)
	for x in [-1.66, -0.83, 0.0, 0.83, 1.66]:
		_add_mesh(_box_mesh(Vector3(0.012, 5.5, 0.016)), Vector3(x, 2.82, 0.735), Vector3.ONE, grid)
	for y in [0.92, 1.84, 2.76, 3.68, 4.60]:
		_add_mesh(_box_mesh(Vector3(4.92, 0.012, 0.016)), Vector3(0, y, 0.735), Vector3.ONE, grid)


func _build_combat_ui() -> void:
	var boss_panel := _panel()
	boss_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	boss_panel.position = Vector2(-305, 118)
	boss_panel.size = Vector2(610, 82)
	screen_root.add_child(boss_panel)
	var boss_margin := MarginContainer.new()
	boss_margin.add_theme_constant_override("margin_left", 22)
	boss_margin.add_theme_constant_override("margin_right", 22)
	boss_margin.add_theme_constant_override("margin_top", 10)
	boss_margin.add_theme_constant_override("margin_bottom", 10)
	boss_panel.add_child(boss_margin)
	var boss_stack := VBoxContainer.new()
	boss_stack.add_theme_constant_override("separation", 7)
	boss_margin.add_child(boss_stack)
	boss_label = _label("LÉVIATHAN DES MARÉES • PHASE I", 18, CREAM, true)
	boss_stack.add_child(boss_label)
	boss_bar = _progress(DANGER)
	boss_bar.custom_minimum_size = Vector2(556, 15)
	boss_bar.value = 100
	boss_stack.add_child(boss_bar)

	var left := _panel()
	left.anchor_left = 0.0
	left.anchor_right = 0.0
	left.anchor_top = 0.0
	left.anchor_bottom = 1.0
	left.offset_left = 22
	left.offset_right = 252
	left.offset_top = 214
	left.offset_bottom = -154
	screen_root.add_child(left)
	var left_stack := VBoxContainer.new()
	left_stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 20)
	left_stack.add_theme_constant_override("separation", 12)
	left.add_child(left_stack)
	score_label = _label("SCORE 000000", 24, GOLD, true)
	combo_label = _label("COMBO ×0", 19, CYAN, true)
	next_label = _label("PROCHAINE : Pio", 17, CREAM, true)
	left_stack.add_child(score_label)
	left_stack.add_child(combo_label)
	left_stack.add_child(_separator())
	left_stack.add_child(next_label)
	var rules := _label("2 identiques → fusion\nRangs élevés → dégâts\nChambre pleine → danger", 15, MUTED)
	rules.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rules.custom_minimum_size.y = 92
	left_stack.add_child(rules)
	var quit := _button("RETOUR AU HUB", SURFACE)
	quit.pressed.connect(_show_hub)
	left_stack.add_child(quit)

	var squad := VBoxContainer.new()
	squad.anchor_left = 1.0
	squad.anchor_right = 1.0
	squad.position = Vector2(-164, 218)
	squad.size = Vector2(142, 552)
	squad.add_theme_constant_override("separation", 10)
	screen_root.add_child(squad)
	var squad_title := _label("ESCOUADE", 14, GOLD, true)
	squad_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	squad.add_child(squad_title)
	squad.add_child(_portrait_card("res://assets/portraits/mira.png", "MIRA • SSR", "Oracle", CYAN, Vector2(142, 158)))
	squad.add_child(_portrait_card("res://assets/portraits/brann.png", "BRANN • SR", "Rempart", GOLD, Vector2(142, 158)))
	squad.add_child(_portrait_card("res://assets/portraits/aster.png", "ASTER • SSR", "Arcaniste", VIOLET, Vector2(142, 158)))

	var bottom := _panel()
	bottom.anchor_left = 0.0
	bottom.anchor_right = 1.0
	bottom.anchor_top = 1.0
	bottom.anchor_bottom = 1.0
	bottom.offset_left = 270
	bottom.offset_right = -184
	bottom.offset_top = -132
	bottom.offset_bottom = -18
	screen_root.add_child(bottom)
	var actions := HBoxContainer.new()
	actions.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 16)
	actions.add_theme_constant_override("separation", 12)
	bottom.add_child(actions)
	var gauges := VBoxContainer.new()
	gauges.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	energy_bar = _progress(CYAN)
	energy_bar.custom_minimum_size = Vector2(320, 28)
	overdrive_bar = _progress(PINK)
	overdrive_bar.custom_minimum_size = Vector2(320, 28)
	gauges.add_child(_label("MAGIE", 13, CYAN, true))
	gauges.add_child(energy_bar)
	gauges.add_child(_label("SURPUISSANCE", 13, PINK, true))
	gauges.add_child(overdrive_bar)
	actions.add_child(gauges)
	skill_button = _button("Q  PUITS ASTRAL", CYAN, Color("#071a23"))
	skill_button.custom_minimum_size = Vector2(190, 84)
	skill_button.pressed.connect(_cast_skill)
	actions.add_child(skill_button)
	ultimate_button = _button("E  ULTIME", VIOLET)
	ultimate_button.custom_minimum_size = Vector2(170, 84)
	ultimate_button.pressed.connect(_cast_ultimate)
	actions.add_child(ultimate_button)
	overdrive_button = _button("R  SURPUISSANCE", PINK, Color("#2b0d22"))
	overdrive_button.custom_minimum_size = Vector2(220, 84)
	overdrive_button.pressed.connect(_cast_overdrive)
	actions.add_child(overdrive_button)
	_update_hud()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and current_screen not in ["hub_pc", "title"]:
		_go_back()
		return
	if not current_screen.begins_with("combat"):
		return
	if event.is_action_pressed("skill"):
		_design_combat_action("Q", VIOLET)
	elif event.is_action_pressed("ultimate"):
		_design_combat_action("E", CYAN)
	elif event.is_action_pressed("overdrive"):
		_design_combat_action("R", GOLD)


func _drop_orb(screen_x: float) -> void:
	if orbs.size() >= 34:
		_show_toast("Chambre saturée : fusionnez ou utilisez le Puits astral")
		return
	var viewport_width := get_viewport().get_visible_rect().size.x
	var normalized: float = clampf(screen_x / viewport_width, 0.18, 0.82)
	var world_x: float = lerpf(-2.05, 2.05, (normalized - 0.18) / 0.64)
	_spawn_orb(next_tier, Vector3(world_x, 5.75, 0))
	next_tier = 1 if rng.randf() < 0.28 else 0
	_update_hud()


func _spawn_orb(tier: int, at: Vector3, impulse := Vector3.ZERO) -> RigidBody3D:
	var orb := RigidBody3D.new()
	orb.name = "Orb_%s_%d" % [ORB_NAMES[tier], Time.get_ticks_msec()]
	orb.position = at
	orb.mass = 0.75 + tier * 0.35
	orb.continuous_cd = true
	orb.collision_layer = 2
	orb.collision_mask = 3
	orb.set_meta("tier", tier)
	orb.set_meta("merging", false)
	world_root.add_child(orb)
	var radius := 0.23 + tier * 0.085
	var mesh := MeshInstance3D.new()
	mesh.mesh = _sphere_mesh(radius)
	mesh.material_override = _material(ORB_COLORS[tier].darkened(0.36), 0.36, 0.16, ORB_COLORS[tier], 0.62 + tier * 0.10)
	orb.add_child(mesh)
	var core := _add_mesh(_sphere_mesh(radius * 0.34), Vector3(0, -radius * 0.68, radius * 0.08), Vector3.ONE, _material(CREAM, 0.0, 0.12, ORB_COLORS[tier], 1.0), orb)
	core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var halo := _add_mesh(_torus_mesh(radius * 1.16, max(0.012, radius * 0.045)), Vector3.ZERO, Vector3.ONE, _material(ORB_COLORS[tier], 0.48, 0.14, ORB_COLORS[tier], 0.52), orb)
	halo.rotation_degrees.x = 90
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var shape := CollisionShape3D.new()
	var sphere_shape := SphereShape3D.new()
	sphere_shape.radius = radius
	shape.shape = sphere_shape
	orb.add_child(shape)
	var physics := PhysicsMaterial.new()
	physics.bounce = 0.3
	physics.friction = 0.6
	orb.physics_material_override = physics
	if impulse.length() > 0:
		orb.apply_central_impulse(impulse)
	orbs.append(orb)
	return orb


func _physics_process(delta: float) -> void:
	if not current_screen.begins_with("combat"):
		return
	if screen_root.has_node("InteractiveCombatBoard"):
		return
	if is_instance_valid(design_fx_root):
		return
	merge_clock += delta
	boss_clock += delta
	surge_clock = maxf(0.0, surge_clock - delta)
	if merge_clock > 0.10 and not merge_lock:
		merge_clock = 0.0
		_find_merge()
	if boss_clock > 7.5:
		boss_clock = 0.0
		_boss_attack()
	for orb in orbs.duplicate():
		if not is_instance_valid(orb):
			orbs.erase(orb)
		elif orb.position.y > 6.2:
			orb.position.y = 6.0
		elif abs(orb.position.z) > 1.1:
			orb.position.z = 0
	if orbs.size() > 28:
		overdrive = max(0.0, overdrive - delta * 5.0)
	_update_hud()


func _find_merge() -> void:
	for i in range(orbs.size()):
		var first := orbs[i]
		if not is_instance_valid(first) or first.get_meta("merging", false):
			continue
		for j in range(i + 1, orbs.size()):
			var second := orbs[j]
			if not is_instance_valid(second) or second.get_meta("merging", false):
				continue
			var tier_a: int = first.get_meta("tier")
			var tier_b: int = second.get_meta("tier")
			var threshold := (0.23 + tier_a * 0.085) * 1.82
			if tier_a == tier_b and tier_a < 5 and first.position.distance_to(second.position) < threshold:
				_merge_pair(first, second, tier_a)
				return


func _merge_pair(first: RigidBody3D, second: RigidBody3D, tier: int) -> void:
	merge_lock = true
	first.set_meta("merging", true)
	second.set_meta("merging", true)
	var midpoint := (first.position + second.position) * 0.5
	var inherited_velocity := (first.linear_velocity + second.linear_velocity) * 0.18
	orbs.erase(first)
	orbs.erase(second)
	first.queue_free()
	second.queue_free()
	var upgraded := _spawn_orb(tier + 1, midpoint, inherited_velocity)
	upgraded.scale = Vector3(0.2, 0.2, 0.2)
	var tween := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(upgraded, "scale", Vector3.ONE, 0.28)
	var damage := int(14.0 * pow(2.0, tier) * (2.0 if surge_clock > 0.0 else 1.0))
	boss_health = max(0.0, boss_health - damage)
	energy = min(100.0, energy + 10.0 + tier * 6.0)
	overdrive = min(100.0, overdrive + 6.0 + tier * 4.5)
	combo += 1
	score += damage * (1 + combo)
	_flash_merge(midpoint, ORB_COLORS[tier + 1])
	_show_toast("FUSION %s → %s  •  %d dégâts" % [ORB_NAMES[tier], ORB_NAMES[tier + 1], damage])
	await get_tree().create_timer(0.05).timeout
	merge_lock = false
	_update_hud()
	if boss_health <= 0:
		_victory()


func _cast_skill() -> void:
	if current_screen != "combat":
		return
	if energy < 35:
		_show_toast("Magie insuffisante : 35 requis")
		return
	energy -= 35
	for orb in orbs:
		if is_instance_valid(orb):
			var pull := Vector3(-orb.position.x, max(0.2, 2.2 - orb.position.y), -orb.position.z).normalized()
			orb.apply_central_impulse(pull * 2.7)
	_ring_burst(Vector3(0, 2.7, 0.78), CYAN, 3, 1.55)
	_show_toast("PUITS ASTRAL — les Orbes convergent")
	_play_mira_animation("Mira_Skill_Cast")
	_update_hud()


func _cast_ultimate() -> void:
	if current_screen != "combat":
		return
	if energy < 100:
		_show_toast("Ultime verrouillé : remplissez la jauge Magie")
		return
	energy = 0
	boss_health = max(0.0, boss_health - 180.0)
	score += 4000
	_play_mira_animation("Mira_Ultimate")
	_play_leviathan_animation("Leviathan_Break")
	_ring_burst(Vector3(0, 5.25, -0.72), VIOLET, 5, 2.3)
	_screen_flash(CYAN)
	_show_toast("MARÉE ZÉNITH — 180 dégâts et temps suspendu")
	for orb in orbs:
		if is_instance_valid(orb):
			orb.freeze = true
	await get_tree().create_timer(0.7).timeout
	for orb in orbs:
		if is_instance_valid(orb):
			orb.freeze = false
	_play_leviathan_animation("Leviathan_Idle")
	_update_hud()
	if boss_health <= 0:
		_victory()


func _cast_overdrive() -> void:
	if current_screen != "combat":
		return
	if overdrive < 100:
		_show_toast("Surpuissance verrouillée : %d/100" % int(overdrive))
		return
	overdrive = 0
	surge_clock = 10.0
	boss_health = max(0.0, boss_health - 160.0)
	score += 9000
	_ring_burst(Vector3(0, 2.75, 0.75), PINK, 7, 2.8)
	_screen_flash(PINK)
	for index in range(3):
		_spawn_orb(2, Vector3(-0.6 + index * 0.6, 5.5 + index * 0.25, 0), Vector3(0, -0.4, 0))
	_show_toast("CONSTELLATION ABSOLUE — dégâts ×2 pendant 10 s + pluie de Séla")
	_update_hud()
	if boss_health <= 0:
		_victory()


func _boss_attack() -> void:
	if boss_health <= 0:
		return
	_play_leviathan_animation("Leviathan_TidalBite")
	combo = 0
	for index in range(2):
		_spawn_orb(0, Vector3(rng.randf_range(-1.7, 1.7), 5.8 + index * 0.2, 0), Vector3(rng.randf_range(-0.3, 0.3), -0.6, 0))
	_screen_flash(DANGER, 0.16)
	_show_toast("MARÉE HOSTILE — deux Orbes instables entrent dans la chambre")
	await get_tree().create_timer(1.05).timeout
	_play_leviathan_animation("Leviathan_Idle")


func _victory() -> void:
	current_screen = "victory"
	_play_leviathan_animation("Leviathan_Break")
	for orb in orbs:
		if is_instance_valid(orb):
			orb.freeze = true
	_clear_screen_ui()
	title_label.text = "VICTOIRE — CŒUR ASTRAL BRISÉ"
	subtitle_label.text = "RÉSULTAT DU PROTOTYPE DE GAMEPLAY"
	var result := _panel()
	result.set_anchors_preset(Control.PRESET_CENTER)
	result.position = Vector2(-310, -220)
	result.size = Vector2(620, 440)
	screen_root.add_child(result)
	var stack := VBoxContainer.new()
	stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 34)
	stack.add_theme_constant_override("separation", 18)
	result.add_child(stack)
	var grade := _label("S", 98, GOLD, true)
	grade.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(grade)
	var final_score := _label("SCORE  %06d" % score, 28, CREAM, true)
	final_score.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(final_score)
	stack.add_child(_stat_row("FUSIONS", str(combo)))
	stack.add_child(_stat_row("RÉCOMPENSE", "120 éclats • Relique de marée"))
	var retry := _button("REJOUER", VIOLET)
	retry.pressed.connect(_start_combat)
	stack.add_child(retry)
	var hub := _button("RETOUR À L’OBSERVATOIRE", SURFACE)
	hub.pressed.connect(_show_hub)
	stack.add_child(hub)


func _update_hud() -> void:
	if current_screen != "combat":
		return
	if is_instance_valid(boss_bar):
		boss_bar.value = boss_health / 10.0
	if is_instance_valid(boss_label):
		var phase := 1 if boss_health > 650 else (2 if boss_health > 300 else 3)
		boss_label.text = "LÉVIATHAN DES MARÉES • PHASE %d" % phase
	if is_instance_valid(score_label):
		score_label.text = "SCORE %06d" % score
	if is_instance_valid(combo_label):
		combo_label.text = "COMBO ×%d%s" % [combo, "  •  PUISSANCE ×2" if surge_clock > 0.0 else ""]
	if is_instance_valid(next_label):
		next_label.text = "PROCHAINE : %s" % ORB_NAMES[next_tier]
	if is_instance_valid(energy_bar):
		energy_bar.value = energy
	if is_instance_valid(overdrive_bar):
		overdrive_bar.value = overdrive
	if is_instance_valid(skill_button):
		skill_button.disabled = energy < 35
	if is_instance_valid(ultimate_button):
		ultimate_button.disabled = energy < 100
	if is_instance_valid(overdrive_button):
		overdrive_button.disabled = overdrive < 100


func _spawn_mira(at: Vector3, rotation: Vector3, scale_value: float) -> void:
	var guardian_id: String = GUARDIAN_IDS[selected_guardian]
	mira_instance = model_catalog.instantiate_guardian(guardian_id)
	if is_instance_valid(mira_instance):
		mira_instance.name = "%s_Runtime_Guardian" % guardian_id.capitalize()
		mira_instance.position = at
		mira_instance.rotation_degrees = rotation
		mira_instance.scale = Vector3.ONE * scale_value
		world_root.add_child(mira_instance)
		_play_mira_animation(model_catalog.guardian_animation(guardian_id))
	else:
		_spawn_guardian_blockout(at, CYAN, GUARDIAN_NAMES[selected_guardian].to_upper())
		_show_toast("GLB du gardien non importé : fallback géométrique actif")


func _play_mira_animation(animation_name: String) -> void:
	if not is_instance_valid(mira_instance):
		return
	var players := mira_instance.find_children("*", "AnimationPlayer", true, false)
	for player in players:
		if not animation_name.is_empty() and player.has_animation(animation_name):
			player.play(animation_name)
			return
	for player in players:
		for fallback_animation in player.get_animation_list():
			if fallback_animation != "RESET":
				player.play(fallback_animation)
				return


func _play_leviathan_animation(animation_name: String) -> void:
	if not is_instance_valid(leviathan_instance):
		return
	var players := leviathan_instance.find_children("*", "AnimationPlayer", true, false)
	for player in players:
		if player.has_animation(animation_name):
			player.play(animation_name)
			return


func _spawn_guardian_blockout(at: Vector3, accent: Color, label_text: String) -> void:
	var guardian := Node3D.new()
	guardian.name = label_text + "_Scale_Blockout"
	guardian.position = at
	world_root.add_child(guardian)
	_add_mesh(_capsule_mesh(0.23, 1.05), Vector3(0, 1.02, 0), Vector3.ONE, _material(Color("#17213a"), 0.28, 0.36), guardian)
	_add_mesh(_sphere_mesh(0.22), Vector3(0, 1.78, 0), Vector3.ONE, _material(Color("#a66550"), 0, 0.55), guardian)
	_add_mesh(_torus_mesh(0.34, 0.028), Vector3(0, 1.34, 0), Vector3.ONE, _material(accent, 0.55, 0.2, accent, 1.4), guardian).rotation_degrees.x = 90


func _flash_merge(at: Vector3, color: Color) -> void:
	var flash := _add_mesh(_sphere_mesh(0.28), at, Vector3.ONE, _material(color, 0, 0.05, color, 4.0), fx_root)
	var tween := create_tween().set_parallel(true)
	tween.tween_property(flash, "scale", Vector3.ONE * 3.8, 0.32)
	tween.tween_property(flash, "transparency", 1.0, 0.32)
	tween.chain().tween_callback(flash.queue_free)


func _ring_burst(at: Vector3, color: Color, count: int, reach: float) -> void:
	for index in range(count):
		var ring := _add_mesh(
			_torus_mesh(0.28 + index * 0.09, 0.018 + index * 0.002),
			at + Vector3(0, index * 0.035, 0),
			Vector3.ONE * 0.35,
			_material(color.darkened(0.18), 0.48, 0.12, color, 1.8),
			fx_root
		)
		ring.rotation_degrees.x = 90
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var tween := create_tween().set_parallel(true)
		tween.tween_property(ring, "scale", Vector3.ONE * (reach + index * 0.22), 0.42 + index * 0.055).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(ring, "transparency", 1.0, 0.42 + index * 0.055)
		tween.chain().tween_callback(ring.queue_free)


func _screen_flash(color: Color, alpha := 0.35) -> void:
	var rect := ColorRect.new()
	rect.color = Color(color, alpha)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen_root.add_child(rect)
	var tween := create_tween()
	tween.tween_property(rect, "modulate:a", 0.0, 0.38)
	tween.tween_callback(rect.queue_free)


func _show_toast(message: String) -> void:
	toast.text = message
	if toast_tween and toast_tween.is_valid():
		toast_tween.kill()
	toast.modulate.a = 0.0
	toast_tween = create_tween()
	toast_tween.tween_property(toast, "modulate:a", 1.0, 0.14)
	toast_tween.tween_interval(2.1)
	toast_tween.tween_property(toast, "modulate:a", 0.0, 0.24)


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_SIZE_CHANGED and is_instance_valid(camera):
		_update_camera()


func _update_camera() -> void:
	if not is_instance_valid(camera) or current_screen == "hub":
		return
	var size := get_viewport().get_visible_rect().size
	if size.y > size.x:
		camera.position = Vector3(0, 4.4, 17.0)
		camera.fov = 54.0
	else:
		camera.position = Vector3(0, 4.0, 13.0)
		camera.fov = 48.0
	camera.look_at_from_position(camera.position, Vector3(0, 3.3, 0))


func _add_backdrop(texture_path: String, at: Vector3, size: Vector2) -> MeshInstance3D:
	var quad := QuadMesh.new()
	quad.size = size
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.albedo_texture = load(texture_path)
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	var plate := MeshInstance3D.new()
	plate.name = "Backdrop_" + texture_path.get_file().get_basename()
	plate.mesh = quad
	plate.material_override = material
	plate.position = at
	plate.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world_root.add_child(plate)
	return plate


func _material(color: Color, metallic := 0.0, roughness := 0.45, emission := Color.BLACK, emission_energy := 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = metallic
	mat.roughness = roughness
	if emission_energy > 0:
		mat.emission_enabled = true
		mat.emission = emission
		mat.emission_energy_multiplier = emission_energy
	if color.a < 0.99:
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return mat


func _add_mesh(mesh: PrimitiveMesh, at: Vector3, scale_value: Vector3, mat: Material, parent: Node = null) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = at
	instance.scale = scale_value
	instance.material_override = mat
	(parent if parent else world_root).add_child(instance)
	return instance


func _add_static_box(at: Vector3, size: Vector3, mat: Material, visible := true) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.position = at
	body.collision_layer = 1
	body.collision_mask = 2
	world_root.add_child(body)
	if visible:
		var mesh := MeshInstance3D.new()
		mesh.mesh = _box_mesh(size)
		mesh.material_override = mat
		body.add_child(mesh)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	return body


func _sphere_mesh(radius: float) -> SphereMesh:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 32
	mesh.rings = 18
	return mesh


func _box_mesh(size: Vector3) -> BoxMesh:
	var mesh := BoxMesh.new()
	mesh.size = size
	return mesh


func _cylinder_mesh(radius: float, height: float) -> CylinderMesh:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 72
	return mesh


func _capsule_mesh(radius: float, height: float) -> CapsuleMesh:
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh.radial_segments = 24
	mesh.rings = 12
	return mesh


func _torus_mesh(radius: float, ring_radius: float) -> TorusMesh:
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - ring_radius
	mesh.outer_radius = radius + ring_radius
	mesh.rings = 64
	mesh.ring_segments = 10
	return mesh


func _panel() -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.035, 0.045, 0.10, 0.92)
	style.border_color = Color(0.25, 0.32, 0.52, 0.82)
	style.set_border_width_all(1)
	style.set_corner_radius_all(20)
	panel.add_theme_stylebox_override("panel", style)
	return panel


func _portrait_card(texture_path: String, card_name: String, role: String, accent: Color, card_size: Vector2) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = card_size
	var frame := StyleBoxFlat.new()
	frame.bg_color = Color(0.025, 0.035, 0.075, 0.96)
	frame.border_color = Color(accent, 0.82)
	frame.set_border_width_all(1)
	frame.set_corner_radius_all(14)
	frame.content_margin_left = 5
	frame.content_margin_top = 5
	frame.content_margin_right = 5
	frame.content_margin_bottom = 7
	card.add_theme_stylebox_override("panel", frame)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 3)
	card.add_child(stack)
	var portrait := TextureRect.new()
	var source_texture := load(texture_path) as Texture2D
	if source_texture:
		var cropped := AtlasTexture.new()
		cropped.atlas = source_texture
		cropped.region = Rect2(0, 0, source_texture.get_width() * 0.94, source_texture.get_height())
		portrait.texture = cropped
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	portrait.custom_minimum_size = Vector2(card_size.x - 10, max(72.0, card_size.y - 52.0))
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(portrait)
	var identity := _label(card_name, 13 if card_size.x < 180 else 17, CREAM, true)
	identity.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	identity.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	stack.add_child(identity)
	var role_label := _label(role, 11 if card_size.x < 180 else 14, accent, true)
	role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	role_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	stack.add_child(role_label)
	return card


func _button(label_text: String, color: Color, text_color := CREAM) -> Button:
	var button := Button.new()
	button.text = label_text
	button.add_theme_font_size_override("font_size", 17)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	normal.set_corner_radius_all(15)
	normal.border_color = CYAN if color != SURFACE else Color("#343b5a")
	normal.set_border_width_all(1)
	var hover := normal.duplicate()
	hover.bg_color = color.lightened(0.12)
	hover.border_width_left = 2
	hover.border_width_top = 2
	hover.border_width_right = 2
	hover.border_width_bottom = 2
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	return button


func _label(label_text: String, size: int, color: Color, bold := false) -> Label:
	var label := Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	if bold:
		label.add_theme_constant_override("outline_size", 1)
		label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.5))
	return label


func _separator() -> HSeparator:
	var separator := HSeparator.new()
	separator.custom_minimum_size.y = 10
	return separator


func _stat_row(left_text: String, right_text: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	var left := _label(left_text, 14, MUTED, true)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var right := _label(right_text, 15, CREAM, true)
	right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(left)
	row.add_child(right)
	return row


func _progress(color: Color) -> ProgressBar:
	var progress := ProgressBar.new()
	progress.min_value = 0
	progress.max_value = 100
	progress.show_percentage = false
	var background := StyleBoxFlat.new()
	background.bg_color = Color("#080b18")
	background.set_corner_radius_all(10)
	background.border_color = Color("#303754")
	background.set_border_width_all(1)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(10)
	progress.add_theme_stylebox_override("background", background)
	progress.add_theme_stylebox_override("fill", fill)
	return progress


func _go_to(screen_id: String) -> void:
	match screen_id:
		"hub_pc":
			if get_viewport().get_visible_rect().size.y > get_viewport().get_visible_rect().size.x:
				_show_native_screen("hub_mobile")
			else:
				_show_native_screen("hub_pc")
		"combat_pc":
			_start_combat()
		"combat_mobile":
			_start_combat()
		"roster":
			_show_native_screen("roster")
		"boss_phase_3", "guardian_switch", "ultimate", "overdrive":
			_show_combat_state(screen_id)
		"rhythm_game", "astral_hunt", "outfit_workshop":
			_show_activity_board(screen_id)
		_:
			_show_native_screen(screen_id)


func _show_native_screen(screen_id: String) -> void:
	current_screen = screen_id
	_clear_screen_ui()
	_clear_world()
	_set_shell_visible(false)
	var catalog_script := preload("res://scripts/ui_catalog.gd")
	native_root = catalog_script.new()
	native_root.name = "InteractiveScreen_" + screen_id
	native_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	native_root.route_requested.connect(_go_to)
	native_root.guardian_selected.connect(_on_guardian_selected)
	screen_root.add_child(native_root)
	native_root.set_guardian_index(selected_guardian)
	native_root.render(screen_id)


func _on_guardian_selected(index: int) -> void:
	selected_guardian = clampi(index, 0, GUARDIAN_NAMES.size() - 1)


func _show_activity_board(activity_id: String) -> void:
	current_screen = activity_id
	_clear_screen_ui()
	_clear_world()
	_set_shell_visible(false)
	var activity_script := preload("res://scripts/activity_board.gd")
	var board: Control = activity_script.new()
	board.name = "InteractiveActivity_" + activity_id
	board.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	board.route_requested.connect(_go_to)
	screen_root.add_child(board)
	board.configure(activity_id, selected_guardian)


func _show_mobile_combat_reference() -> void:
	current_screen = "combat_mobile"
	_clear_screen_ui()
	_clear_world()
	_set_shell_visible(false)
	var backdrop := ColorRect.new()
	backdrop.color = INK
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen_root.add_child(backdrop)
	var plate := TextureRect.new()
	plate.texture = load("res://assets/mockups/combat-mobile-target.png")
	plate.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	plate.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	plate.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	plate.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	screen_root.add_child(plate)
	_add_hotspot(Rect2(0.18, 0.24, 0.64, 0.50), _design_combat_action.bind("DROP", CYAN), "Fusionner les Orbes")
	_add_hotspot(Rect2(0.18, 0.79, 0.19, 0.11), _design_combat_action.bind("Q", VIOLET), "Compétence")
	_add_hotspot(Rect2(0.40, 0.79, 0.19, 0.11), _go_to.bind("ultimate"), "Ultime")
	_add_hotspot(Rect2(0.62, 0.79, 0.19, 0.11), _go_to.bind("overdrive"), "Surpuissance")


func _show_combat_state(state_id: String) -> void:
	_start_combat()
	current_screen = state_id
	var dim := ColorRect.new()
	dim.color = Color(0.01, 0.01, 0.045, 0.64 if state_id != "ultimate" else 0.28)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	screen_root.add_child(dim)
	match state_id:
		"boss_phase_3":
			_add_boss_phase_overlay()
		"guardian_switch":
			_add_guardian_switch_overlay()
		"ultimate":
			_add_ultimate_overlay()
		"overdrive":
			_add_overdrive_overlay()


func _add_boss_phase_overlay() -> void:
	var banner := _panel()
	banner.anchor_left = 0.18
	banner.anchor_right = 0.82
	banner.anchor_top = 0.08
	banner.anchor_bottom = 0.34
	screen_root.add_child(banner)
	var stack := VBoxContainer.new()
	stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 28)
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	stack.add_theme_constant_override("separation", 12)
	banner.add_child(stack)
	var phase := _label("PHASE III • CŒUR DE LA TEMPÊTE", 30, DANGER, true)
	phase.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(phase)
	var warning := _label("La marée inverse la gravité. Fusionnez uniquement dans les zones marquées.", 17, CREAM)
	warning.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(warning)
	var mechanics := HBoxContainer.new()
	mechanics.alignment = BoxContainer.ALIGNMENT_CENTER
	mechanics.add_theme_constant_override("separation", 12)
	for text in ["3 CŒURS", "MARÉE ×2", "45 SECONDES"]:
		var chip := _button(text, SURFACE)
		chip.disabled = true
		mechanics.add_child(chip)
	stack.add_child(mechanics)
	var resume := _button("AFFRONTER LA PHASE III", DANGER)
	resume.custom_minimum_size = Vector2(360, 54)
	resume.pressed.connect(_start_combat)
	stack.add_child(resume)


func _add_guardian_switch_overlay() -> void:
	var modal := _panel()
	modal.anchor_left = 0.14
	modal.anchor_right = 0.86
	modal.anchor_top = 0.18
	modal.anchor_bottom = 0.84
	screen_root.add_child(modal)
	var stack := VBoxContainer.new()
	stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 26)
	stack.add_theme_constant_override("separation", 14)
	modal.add_child(stack)
	var title := _label("CHANGER DE GARDIEN", 28, CREAM, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(title)
	var subtitle := _label("Le temps est ralenti • choisissez le contre adapté à la phase.", 15, CYAN)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(subtitle)
	var cards := HBoxContainer.new()
	cards.alignment = BoxContainer.ALIGNMENT_CENTER
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("separation", 18)
	stack.add_child(cards)
	var squad_indices := [selected_guardian, (selected_guardian + 1) % 24, (selected_guardian + 2) % 24]
	var squad_colors := [VIOLET, GOLD, CYAN]
	for squad_slot in range(squad_indices.size()):
		var guardian_index: int = squad_indices[squad_slot]
		var guardian_color: Color = squad_colors[squad_slot]
		var column := VBoxContainer.new()
		column.add_child(_portrait_card(
			"res://assets/guardians/guardian-%02d.png" % guardian_index,
			"%s • %s" % [GUARDIAN_NAMES[guardian_index].to_upper(), "ACTIF" if squad_slot == 0 else "PRÊT"],
			GUARDIAN_TITLES[guardian_index],
			guardian_color,
			Vector2(220, 300)
		))
		var choose := _button("ACTIVER", guardian_color, INK if guardian_color in [CYAN, GOLD] else CREAM)
		choose.pressed.connect(_activate_guardian.bind(guardian_index))
		column.add_child(choose)
		cards.add_child(column)
	stack.add_child(_button_route("ANNULER", "combat_pc", SURFACE))


func _add_ultimate_overlay() -> void:
	var magic := TextureRect.new()
	magic.texture = load("res://assets/backgrounds/astral-super-magic-v1.png")
	magic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	magic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	magic.modulate = Color(0.78, 0.88, 1.0, 0.78)
	magic.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	magic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	screen_root.add_child(magic)
	var callout := VBoxContainer.new()
	callout.anchor_left = 0.18
	callout.anchor_right = 0.82
	callout.anchor_top = 0.18
	callout.anchor_bottom = 0.82
	callout.alignment = BoxContainer.ALIGNMENT_CENTER
	callout.add_theme_constant_override("separation", 16)
	screen_root.add_child(callout)
	var eyebrow := _label("ULTIME DE %s" % GUARDIAN_NAMES[selected_guardian].to_upper(), 16, CYAN, true)
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	callout.add_child(eyebrow)
	var title := _label("ABYSSE SOUVERAIN", 52, CREAM, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	callout.add_child(title)
	var description := _label("Immobilise les Orbes • double la rupture • protège la chambre pendant 8 s", 18, CREAM, true)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	callout.add_child(description)
	var release := _button("LIBÉRER L’ULTIME", CYAN, INK)
	release.custom_minimum_size = Vector2(420, 64)
	release.pressed.connect(_release_combat_power.bind("ULTIME • ABYSSE SOUVERAIN", CYAN))
	callout.add_child(release)
	callout.add_child(_button_route("ANNULER", "combat_pc", SURFACE))


func _add_overdrive_overlay() -> void:
	var aura := ColorRect.new()
	aura.color = Color(PINK, 0.22)
	aura.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	aura.mouse_filter = Control.MOUSE_FILTER_IGNORE
	screen_root.add_child(aura)
	var panel := _panel()
	panel.anchor_left = 0.22
	panel.anchor_right = 0.78
	panel.anchor_top = 0.20
	panel.anchor_bottom = 0.78
	screen_root.add_child(panel)
	var stack := VBoxContainer.new()
	stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	stack.add_theme_constant_override("separation", 16)
	panel.add_child(stack)
	var title := _label("SURPUISSANCE • CONVERGENCE", 36, PINK, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(title)
	stack.add_child(_stat_row("Durée", "12 secondes"))
	stack.add_child(_stat_row("Vitesse de fusion", "+50 %"))
	stack.add_child(_stat_row("Dégâts de rupture", "+120 %"))
	var gauge := _progress(PINK)
	gauge.value = 100
	gauge.custom_minimum_size.y = 32
	stack.add_child(gauge)
	var activate := _button("DÉCLENCHER LA CONVERGENCE", PINK)
	activate.custom_minimum_size.y = 60
	activate.pressed.connect(_release_combat_power.bind("SURPUISSANCE • CONVERGENCE", PINK))
	stack.add_child(activate)
	stack.add_child(_button_route("ANNULER", "combat_pc", SURFACE))


func _button_route(text: String, route: String, color: Color) -> Button:
	var button := _button(text, color)
	button.pressed.connect(_go_to.bind(route))
	return button


func _activate_guardian(guardian_index: int) -> void:
	selected_guardian = clampi(guardian_index, 0, GUARDIAN_NAMES.size() - 1)
	_start_combat()
	_show_design_notice("%s • GARDIEN ACTIVÉ" % GUARDIAN_NAMES[selected_guardian].to_upper())


func _release_combat_power(message: String, color: Color) -> void:
	_start_combat()
	_design_ui_burst(Vector2(0.50, 0.46), color, 8)
	_show_design_notice(message)


func _go_back() -> void:
	var back_routes := {
		"title": "title",
		"onboarding": "title",
		"hub_mobile": "title",
		"world_map": "hub_pc",
		"mission_brief": "world_map",
		"combat_pc": "mission_brief",
		"combat_mobile": "mission_brief",
		"boss_phase_3": "combat_pc",
		"guardian_switch": "combat_pc",
		"ultimate": "combat_pc",
		"overdrive": "combat_pc",
		"victory": "hub_pc",
		"defeat": "mission_brief",
		"roster": "hub_pc",
		"guardian_detail": "roster",
		"equipment": "guardian_detail",
		"wardrobe": "guardian_detail",
		"bond": "guardian_detail",
		"summon_single": "roster",
		"summon_ten": "roster",
		"shop": "hub_pc",
		"rates_history": "roster",
		"rift": "world_map",
		"rhythm_game": "hub_pc",
		"astral_hunt": "hub_pc",
		"outfit_workshop": "hub_pc",
		"settings": "hub_pc",
		"accessibility": "settings",
		"download_content": "settings",
		"network_error": "title",
		"side_games": "hub_pc",
	}
	_go_to(back_routes.get(current_screen, "hub_pc"))

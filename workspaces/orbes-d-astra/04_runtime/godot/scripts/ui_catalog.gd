extends Control
class_name AstraUICatalog

signal route_requested(screen_id: String)
signal guardian_selected(index: int)

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

var current_screen := ""
var compact := false
var onboarding_step := 0
var selection := 0
var guardian_index := 22
var download_value := 36.0
var high_contrast := false
var guardians: Array = []


func set_guardian_index(index: int) -> void:
	guardian_index = clampi(index, 0, max(0, guardians.size() - 1) if guardians.size() else 23)


func _load_guardians() -> void:
	if not guardians.is_empty():
		return
	var file := FileAccess.open("res://data/guardians.json", FileAccess.READ)
	if not file:
		push_error("Roster canonique introuvable.")
		return
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed is Dictionary and parsed.has("guardians"):
		guardians = parsed.guardians


func _guardian(index: int) -> Dictionary:
	_load_guardians()
	if guardians.is_empty():
		return {}
	return guardians[wrapi(index, 0, guardians.size())]


func _guardian_color(index: int) -> Color:
	var data := _guardian(index)
	return Color(data.get("accent", "#67E8F9"))


func render(screen_id: String) -> void:
	_load_guardians()
	current_screen = screen_id
	for child in get_children():
		child.queue_free()
	compact = get_viewport_rect().size.y > get_viewport_rect().size.x or get_viewport_rect().size.x < 1000
	match screen_id:
		"title":
			_render_title()
		"onboarding":
			_render_onboarding()
		"hub_mobile":
			_render_hub_mobile()
		"hub_pc":
			_render_hub_pc()
		"world_map":
			_render_world_map()
		"mission_brief":
			_render_mission_brief()
		"victory":
			_render_result(true)
		"defeat":
			_render_result(false)
		"guardian_detail":
			_render_guardian_detail()
		"roster":
			_render_roster()
		"equipment":
			_render_equipment()
		"wardrobe":
			_render_wardrobe()
		"bond":
			_render_bond()
		"summon_single":
			_render_summon(1)
		"summon_ten":
			_render_summon(10)
		"shop":
			_render_shop()
		"rates_history":
			_render_rates_history()
		"rift":
			_render_rift()
		"rhythm_game", "astral_hunt", "outfit_workshop":
			_render_activity(screen_id)
		"settings":
			_render_settings()
		"accessibility":
			_render_accessibility()
		"download_content":
			_render_download()
		"network_error":
			_render_network_error()
		_:
			_render_placeholder(screen_id)


func _render_title() -> void:
	_background("res://assets/backgrounds/astral-prologue-v3.png", 0.18)
	var veil := ColorRect.new()
	veil.color = Color(0.01, 0.015, 0.05, 0.38)
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(veil)
	var panel := _glass()
	panel.anchor_left = 0.08 if not compact else 0.07
	panel.anchor_right = 0.48 if not compact else 0.93
	panel.anchor_top = 0.15 if not compact else 0.23
	panel.anchor_bottom = 0.88 if not compact else 0.84
	add_child(panel)
	var stack := _padded_stack(panel, 34)
	var eyebrow := _label("UNE ÉPOPÉE ASTRALE INTERACTIVE", 14, CYAN, true)
	stack.add_child(eyebrow)
	stack.add_child(_label("ORBES\nD’ASTRA", 56 if not compact else 44, CREAM, true))
	stack.add_child(_label("Les constellations se brisent. Vos gardiens s’éveillent.", 18, MUTED))
	stack.add_child(_line(GOLD))
	var continue_button := _button("CONTINUER  •  OBSERVATOIRE", GOLD, INK)
	continue_button.custom_minimum_size.y = 64
	continue_button.pressed.connect(_route.bind("hub_pc"))
	stack.add_child(continue_button)
	var new_button := _button("NOUVELLE PARTIE", SURFACE)
	new_button.custom_minimum_size.y = 54
	new_button.pressed.connect(_route.bind("onboarding"))
	stack.add_child(new_button)
	var utility := HBoxContainer.new()
	utility.add_theme_constant_override("separation", 10)
	utility.add_child(_route_button("ACCESSIBILITÉ", "accessibility", CYAN))
	utility.add_child(_route_button("PARAMÈTRES", "settings", VIOLET))
	stack.add_child(utility)
	stack.add_child(_label("Profil local • Sauvegarde synchronisée • v0.7 Convergence", 12, MUTED))


func _render_onboarding() -> void:
	var steps := [
		["1", "ORIENTER L’ORBITE", "Glissez pour choisir la zone de chute. L’aperçu cyan confirme la trajectoire."],
		["2", "FUSIONNER LES ORBES", "Deux Orbes identiques fusionnent. Créez une chaîne sans saturer la chambre."],
		["3", "LIBÉRER LA MAGIE", "Remplissez la jauge, choisissez le bon gardien et déclenchez son pouvoir."],
	]
	var content := _screen("ÉVEIL DE L’ASTRAL", "INITIATION • %s / 3" % (onboarding_step + 1), "Apprenez chaque geste avant la première mission.", "res://assets/backgrounds/astral-prologue-v3.png", "title")
	var hero := _glass()
	hero.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(hero)
	var row: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	hero.add_child(row)
	var visual := _image_panel("res://assets/backgrounds/astral-super-magic-v1.png", Vector2(620, 460) if not compact else Vector2(0, 360))
	visual.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(visual)
	var copy := VBoxContainer.new()
	copy.custom_minimum_size.x = 400 if not compact else 0
	copy.add_theme_constant_override("separation", 18)
	row.add_child(copy)
	copy.add_child(_label("ÉTAPE %s" % steps[onboarding_step][0], 14, CYAN, true))
	copy.add_child(_label(steps[onboarding_step][1], 32, CREAM, true))
	var description := _label(steps[onboarding_step][2], 18, MUTED)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description.custom_minimum_size.y = 100
	copy.add_child(description)
	var dots := HBoxContainer.new()
	for index in range(3):
		var dot := _button(str(index + 1), GOLD if index == onboarding_step else SURFACE)
		dot.custom_minimum_size = Vector2(52, 42)
		dot.pressed.connect(_set_onboarding_step.bind(index))
		dots.add_child(dot)
	copy.add_child(dots)
	var action := _button("ENTRER DANS L’OBSERVATOIRE" if onboarding_step == 2 else "ÉTAPE SUIVANTE", GOLD, INK)
	action.custom_minimum_size.y = 58
	action.pressed.connect(_finish_or_advance_onboarding)
	copy.add_child(action)
	copy.add_child(_route_button("PASSER L’INITIATION", "hub_pc", SURFACE))


func _render_hub_pc() -> void:
	var data := _guardian(guardian_index)
	var accent := _guardian_color(guardian_index)
	var background_path := "res://assets/backgrounds/astral-hub-vaelora-v7.png" if guardian_index == 22 else "res://assets/backgrounds/astral-sanctuary-v7.png"
	_background(background_path, 0.0)
	var left_veil := ColorRect.new()
	left_veil.color = Color(0.006, 0.008, 0.022, 0.58)
	left_veil.anchor_right = 0.245
	left_veil.anchor_bottom = 1.0
	left_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(left_veil)
	var profile := _glass(GOLD)
	profile.anchor_left = 0.018
	profile.anchor_right = 0.225
	profile.anchor_top = 0.018
	profile.anchor_bottom = 0.122
	add_child(profile)
	var profile_margin := MarginContainer.new()
	profile_margin.add_theme_constant_override("margin_left", 12)
	profile_margin.add_theme_constant_override("margin_right", 12)
	profile_margin.add_theme_constant_override("margin_top", 8)
	profile_margin.add_theme_constant_override("margin_bottom", 8)
	profile.add_child(profile_margin)
	var profile_row := HBoxContainer.new()
	profile_row.add_theme_constant_override("separation", 12)
	profile_margin.add_child(profile_row)
	var avatar := TextureRect.new()
	avatar.texture = load(data.get("art", ""))
	avatar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	avatar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	avatar.custom_minimum_size = Vector2(72, 72)
	profile_row.add_child(avatar)
	var profile_copy := VBoxContainer.new()
	profile_copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	profile_row.add_child(profile_copy)
	profile_copy.add_child(_label(data.get("name", ""), 22, CREAM, true))
	profile_copy.add_child(_label("RANG 27 • NIV. 90", 11, GOLD, true))
	profile_copy.add_child(_progress(accent, 68))
	var navigation := _glass(GOLD)
	navigation.anchor_left = 0.018
	navigation.anchor_right = 0.225
	navigation.anchor_top = 0.142
	navigation.anchor_bottom = 0.895
	add_child(navigation)
	var nav := _padded_stack(navigation, 12)
	nav.add_child(_label("NAVIGATION ASTRALE", 12, GOLD, true))
	var destinations := [
		["✦  CAMPAGNE\n     Explorer les Failles", "world_map", CYAN],
		["◈  INVOCATION\n     Convergence céleste", "roster", VIOLET],
		["✧  SANCTUAIRE\n     Éveil et ascension", "guardian_detail", GREEN],
		["◇  GARDE-ROBE\n     Tenues et ornements", "wardrobe", PINK],
		["✥  ACTIVITÉS\n     Défis quotidiens", "rhythm_game", GOLD],
		["⬡  BOUTIQUE\n     Échoppe astrale", "shop", GOLD],
	]
	for destination_index in range(destinations.size()):
		var destination = destinations[destination_index]
		var button := _route_button(destination[0], destination[1], Color(0.018, 0.026, 0.06, 0.64))
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.custom_minimum_size.y = 70
		var normal := button.get_theme_stylebox("normal").duplicate() as StyleBoxFlat
		normal.border_color = destination[2]
		normal.set_border_width(SIDE_LEFT, 3 if destination_index == 0 else 1)
		normal.set_border_width(SIDE_TOP, 0)
		normal.set_border_width(SIDE_RIGHT, 0)
		normal.set_border_width(SIDE_BOTTOM, 0)
		normal.bg_color = Color(destination[2], 0.16 if destination_index == 0 else 0.035)
		button.add_theme_stylebox_override("normal", normal)
		nav.add_child(button)
	nav.add_child(_line(GOLD))
	nav.add_child(_route_button("PARAMÈTRES", "settings", SURFACE))
	var resources := HBoxContainer.new()
	resources.anchor_left = 0.665
	resources.anchor_right = 0.982
	resources.anchor_top = 0.018
	resources.anchor_bottom = 0.09
	resources.alignment = BoxContainer.ALIGNMENT_END
	resources.add_theme_constant_override("separation", 8)
	add_child(resources)
	resources.add_child(_chip("✦ 22 450", GOLD))
	resources.add_child(_chip("◇ 3 210", VIOLET))
	resources.add_child(_chip("✧ 82 / 100", CYAN))
	resources.add_child(_route_button("⚙", "settings", SURFACE))
	if guardian_index != 22:
		var illustration := _glass(accent)
		illustration.anchor_left = 0.705
		illustration.anchor_right = 0.972
		illustration.anchor_top = 0.12
		illustration.anchor_bottom = 0.86
		add_child(illustration)
		var selected_art := TextureRect.new()
		selected_art.texture = load(data.get("art", ""))
		selected_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		selected_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		selected_art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
		illustration.add_child(selected_art)
	var identity := _glass(accent)
	identity.anchor_left = 0.705
	identity.anchor_right = 0.972
	identity.anchor_top = 0.82
	identity.anchor_bottom = 0.94
	add_child(identity)
	var identity_stack := _padded_stack(identity, 10)
	identity_stack.add_child(_label("%s • %s" % [data.get("name", ""), data.get("rarity", "")], 24, CREAM, true))
	identity_stack.add_child(_label("%s • %s • %s" % [data.get("title", ""), data.get("element", ""), data.get("role", "")], 12, accent, true))
	identity_stack.add_child(_route_button("OUVRIR LE SANCTUAIRE", "guardian_detail", Color(accent, 0.46)))
	var mission := _glass(GOLD)
	mission.anchor_left = 0.255
	mission.anchor_right = 0.655
	mission.anchor_top = 0.705
	mission.anchor_bottom = 0.965
	add_child(mission)
	var mission_stack := _padded_stack(mission, 16)
	var mission_head := HBoxContainer.new()
	mission_stack.add_child(mission_head)
	var mission_copy := VBoxContainer.new()
	mission_copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mission_head.add_child(mission_copy)
	mission_copy.add_child(_label("CHAPITRE I • 8 / 30 ÉTOILES", 11, GOLD, true))
	mission_copy.add_child(_label("ÉCLIPSE SUR LE PORT NOYÉ", 27, CREAM, true))
	mission_copy.add_child(_label("Le Léviathan trouble les courants. Brisez son cœur astral.", 13, MUTED))
	var continue_button := _route_button("CONTINUER", "mission_brief", GOLD, INK)
	continue_button.custom_minimum_size = Vector2(190, 58)
	mission_head.add_child(continue_button)
	mission_stack.add_child(_line(GOLD))
	var rewards := HBoxContainer.new()
	rewards.add_theme_constant_override("separation", 8)
	rewards.add_child(_label("RÉCOMPENSES", 11, GOLD, true))
	rewards.add_child(_chip("◇ 300", CYAN))
	rewards.add_child(_chip("✦ 24 000", GOLD))
	rewards.add_child(_chip("RELIQUE ×1", VIOLET))
	mission_stack.add_child(rewards)


func _render_roster() -> void:
	if compact:
		_render_roster_compact()
		return
	var data := _guardian(guardian_index)
	var accent := _guardian_color(guardian_index)
	var content := _screen(
		data.get("name", "").to_upper(),
		"SANCTUAIRE • %s • %s • %s" % [data.get("rarity", ""), data.get("element", ""), data.get("role", "")],
		"Les 24 gardiens utilisent ici la même identité, le même art et les mêmes données.",
		"res://assets/backgrounds/astral-sanctuary-v7.png",
		"hub_pc"
	)
	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	content.add_child(body)
	var profile := _glass(accent)
	profile.custom_minimum_size.x = 285
	body.add_child(profile)
	var p := _padded_stack(profile, 18)
	p.add_child(_label(data.get("title", "").to_upper(), 13, accent, true))
	p.add_child(_label(data.get("name", ""), 34, CREAM, true))
	p.add_child(_label("★ ★ ★ ★ ★ ★", 18, GOLD, true))
	p.add_child(_label("%s  •  %s  •  %s" % [data.get("element", ""), data.get("role", ""), data.get("faction", "")], 14, MUTED))
	p.add_child(_line(accent))
	p.add_child(_stat_row("Âge", "%d ans" % int(data.get("age", 18))))
	p.add_child(_stat_row("Niveau", "90 / 90"))
	p.add_child(_stat_row("Puissance", "22 450"))
	p.add_child(_label("COMPÉTENCE SIGNATURE", 13, GOLD, true))
	p.add_child(_choice_card(data.get("ability", ""), "Niveau 10 • Maîtrisé", accent, true))
	p.add_child(_label("AFFINITÉ", 13, PINK, true))
	p.add_child(_progress(PINK, 48))
	p.add_child(_route_button("VOIR LA FICHE", "guardian_detail", SURFACE))
	p.add_child(_route_button("DÉVELOPPER LE LIEN", "bond", PINK))
	var stage := _glass(accent)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var stage_style := stage.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	stage_style.bg_color = Color(0.005, 0.008, 0.02, 0.10)
	stage_style.border_color = Color(accent, 0.28)
	stage.add_theme_stylebox_override("panel", stage_style)
	body.add_child(stage)
	var stage_stack := _padded_stack(stage, 5)
	var portrait := TextureRect.new()
	portrait.texture = load(_stage_art(data))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage_stack.add_child(portrait)
	var mode_row := HBoxContainer.new()
	mode_row.alignment = BoxContainer.ALIGNMENT_CENTER
	for mode in ["ILLUSTRATION", "PORTRAIT", "HISTOIRE"]:
		mode_row.add_child(_button_action(mode, accent if mode == "ILLUSTRATION" else SURFACE, INK if mode == "ILLUSTRATION" and accent.get_luminance() > 0.62 else CREAM, "Mode : " + mode))
	stage_stack.add_child(mode_row)
	var summon := _glass(GOLD)
	summon.custom_minimum_size.x = 350
	body.add_child(summon)
	var s := _padded_stack(summon, 16)
	s.add_child(_label("CONVERGENCE CÉLESTE", 20, GOLD, true))
	s.add_child(_label("Taux augmenté • %s" % data.get("name", ""), 14, accent, true))
	var banner := TextureRect.new()
	banner.texture = load(data.get("art", ""))
	banner.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	banner.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	banner.custom_minimum_size.y = 150
	banner.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	s.add_child(banner)
	s.add_child(_stat_row("SSR vedette", "1,000 %"))
	s.add_child(_stat_row("Autres SSR", "1,500 %"))
	s.add_child(_stat_row("SR", "12,000 %"))
	s.add_child(_label("GARANTIE • 62 / 80", 13, GOLD, true))
	s.add_child(_progress(GOLD, 77.5))
	s.add_child(_route_button("HISTORIQUE ET TAUX", "rates_history", SURFACE))
	var summon_row := HBoxContainer.new()
	summon_row.add_theme_constant_override("separation", 8)
	summon_row.add_child(_route_button("×1  •  300 ◇", "summon_single", CREAM, INK))
	summon_row.add_child(_route_button("×10  •  3 000 ◇", "summon_ten", GOLD, INK))
	s.add_child(summon_row)
	s.add_child(_route_button("TENUE EXCLUSIVE", "wardrobe", VIOLET))
	var roster_strip := _glass(accent)
	roster_strip.custom_minimum_size.y = 150
	content.add_child(roster_strip)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_top", 7)
	margin.add_theme_constant_override("margin_bottom", 7)
	roster_strip.add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	var strip := HBoxContainer.new()
	strip.add_theme_constant_override("separation", 7)
	scroll.add_child(strip)
	for index in range(guardians.size()):
		strip.add_child(_guardian_tile(index, Vector2(104, 130)))


func _render_roster_compact() -> void:
	var data := _guardian(guardian_index)
	var accent := _guardian_color(guardian_index)
	var content := _screen(
		data.get("name", "").to_upper(),
		"%s • %s • %s" % [data.get("rarity", ""), data.get("element", ""), data.get("role", "")],
		"Un seul sanctuaire, les mêmes 24 gardiens sur PC et mobile.",
		"res://assets/backgrounds/astral-sanctuary-v7.png",
		"hub_mobile"
	)
	var hero := HBoxContainer.new()
	hero.custom_minimum_size.y = 720
	hero.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hero.add_theme_constant_override("separation", 14)
	content.add_child(hero)
	var stage := _glass(accent)
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_stretch_ratio = 1.05
	var stage_style := stage.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	stage_style.bg_color = Color(0.005, 0.008, 0.02, 0.10)
	stage_style.border_color = Color(accent, 0.28)
	stage.add_theme_stylebox_override("panel", stage_style)
	hero.add_child(stage)
	var stage_stack := _padded_stack(stage, 5)
	var portrait := TextureRect.new()
	portrait.texture = load(_stage_art(data))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage_stack.add_child(portrait)
	var identity_plate := _glass(accent)
	identity_plate.custom_minimum_size.y = 118
	stage_stack.add_child(identity_plate)
	var identity := _padded_stack(identity_plate, 12)
	identity.add_child(_label(data.get("name", ""), 29, CREAM, true))
	identity.add_child(_label(data.get("title", ""), 13, accent, true))
	identity.add_child(_label("★★★★★★ • NIV. 90", 14, GOLD, true))
	var dossier := _glass(GOLD)
	dossier.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dossier.size_flags_stretch_ratio = 0.95
	hero.add_child(dossier)
	var info := _padded_stack(dossier, 14)
	info.add_child(_label("CONVERGENCE CÉLESTE", 19, GOLD, true))
	info.add_child(_label("Taux augmenté • %s" % data.get("name", ""), 13, accent, true))
	info.add_child(_line(accent))
	info.add_child(_stat_row("Faction", data.get("faction", "")))
	info.add_child(_stat_row("Âge", "%d ans" % int(data.get("age", 18))))
	info.add_child(_stat_row("Puissance", "22 450"))
	info.add_child(_label("COMPÉTENCE SIGNATURE", 12, GOLD, true))
	info.add_child(_choice_card(data.get("ability", ""), "Niveau 10 • Maîtrisé", accent, true))
	info.add_child(_label("GARANTIE • 62 / 80", 12, GOLD, true))
	info.add_child(_progress(GOLD, 77.5))
	info.add_child(_route_button("VOIR LA FICHE", "guardian_detail", SURFACE))
	info.add_child(_route_button("INVOQUER ×1 • 300 ◇", "summon_single", CREAM, INK))
	info.add_child(_route_button("INVOQUER ×10 • 3 000 ◇", "summon_ten", GOLD, INK))
	var roster_strip := _glass(accent)
	roster_strip.custom_minimum_size.y = 164
	content.add_child(roster_strip)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 8)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_top", 7)
	margin.add_theme_constant_override("margin_bottom", 7)
	roster_strip.add_child(margin)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	margin.add_child(scroll)
	var strip := HBoxContainer.new()
	strip.add_theme_constant_override("separation", 7)
	scroll.add_child(strip)
	for index in range(guardians.size()):
		strip.add_child(_guardian_tile(index, Vector2(112, 142)))


func _render_hub_mobile() -> void:
	var content := _screen("OBSERVATOIRE ASTRA", "HUB MOBILE", "Tous les accès essentiels à portée du pouce.", "res://assets/backgrounds/astral-observatory-v3.png", "title")
	var data := _guardian(guardian_index)
	var accent := _guardian_color(guardian_index)
	var guardian_banner := _glass(accent)
	guardian_banner.custom_minimum_size.y = 190
	var guardian_style := guardian_banner.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	guardian_style.bg_color = Color(0.005, 0.008, 0.02, 0.54)
	guardian_style.border_color = Color(accent, 0.42)
	guardian_banner.add_theme_stylebox_override("panel", guardian_style)
	content.add_child(guardian_banner)
	var guardian_row := HBoxContainer.new()
	guardian_row.add_theme_constant_override("separation", 14)
	guardian_banner.add_child(guardian_row)
	var portrait := TextureRect.new()
	portrait.texture = load(data.get("art", ""))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	portrait.custom_minimum_size.x = 205
	guardian_row.add_child(portrait)
	var guardian_info := VBoxContainer.new()
	guardian_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	guardian_info.add_theme_constant_override("separation", 6)
	guardian_row.add_child(guardian_info)
	guardian_info.add_child(_label("GARDIEN ACTIF", 12, accent, true))
	guardian_info.add_child(_label(data.get("name", ""), 25, CREAM, true))
	guardian_info.add_child(_label(data.get("title", ""), 13, MUTED))
	guardian_info.add_child(_route_button("CHANGER DE GARDIEN", "roster", SURFACE))
	var mission := _glass(GOLD)
	content.add_child(mission)
	var mission_stack := _padded_stack(mission, 22)
	mission_stack.add_child(_label("AVENTURE PRINCIPALE • 1-1", 13, CYAN, true))
	mission_stack.add_child(_label("PREMIER ÉCLAT", 30, CREAM, true))
	mission_stack.add_child(_label("0/18 missions • 0/54 étoiles", 14, MUTED))
	mission_stack.add_child(_route_button("CONTINUER", "mission_brief", GOLD, INK))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)
	content.add_child(grid)
	var entries := [
		["CAMPAGNE", "world_map", CYAN], ["INVOCATION", "roster", VIOLET],
		["SANCTUAIRE", "guardian_detail", GREEN], ["GARDE-ROBE", "wardrobe", PINK],
		["ACTIVITÉS", "rhythm_game", GOLD], ["BOUTIQUE", "shop", GOLD],
	]
	for entry in entries:
		var button := _button(entry[0], Color(0.018, 0.026, 0.06, 0.72), CREAM)
		button.custom_minimum_size = Vector2(0, 90)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var normal := button.get_theme_stylebox("normal").duplicate() as StyleBoxFlat
		normal.border_color = entry[2]
		normal.set_border_width_all(2)
		button.add_theme_stylebox_override("normal", normal)
		var hover := button.get_theme_stylebox("hover").duplicate() as StyleBoxFlat
		hover.bg_color = Color(entry[2], 0.30)
		hover.border_color = entry[2]
		hover.set_border_width_all(2)
		button.add_theme_stylebox_override("hover", hover)
		button.pressed.connect(_route.bind(entry[1]))
		grid.add_child(button)


func _render_world_map() -> void:
	var content := _screen("CARTE DES FAILLES", "ATLAS • SECTEUR I", "Les routes sont vivantes : choisissez directement une cité sur l’atlas.", "res://assets/backgrounds/astral-world-map-v1.png", "hub_pc")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 14)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var map_panel := _glass(CYAN)
	map_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(map_panel)
	var node_data := [
		["PORT NOYÉ", "8/30 • Normal", CYAN],
		["FORGE SOLAIRE", "0/30 • Difficile", GOLD],
		["JARDINS DU VIDE", "3/24 • Élite", VIOLET],
		["CITADELLE BORÉALE", "Verrouillée", MUTED],
		["FAILLE ROGUELITE", "Profondeur 4", PINK],
		["OBSERVATOIRE", "Base", GREEN],
	]
	var map_canvas := Control.new()
	map_canvas.custom_minimum_size = Vector2(720, 510 if not compact else 610)
	map_canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	map_panel.add_child(map_canvas)
	var art := TextureRect.new()
	art.texture = load("res://assets/backgrounds/astral-world-map-v1.png")
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	art.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_canvas.add_child(art)
	var title_plate := _glass(CYAN)
	title_plate.anchor_left = 0.025
	title_plate.anchor_right = 0.35
	title_plate.anchor_top = 0.025
	title_plate.anchor_bottom = 0.13
	map_canvas.add_child(title_plate)
	var map_title := _label("ROUTES ASTRALES • 6 DESTINATIONS", 13, CYAN, true)
	map_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	map_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title_plate.add_child(map_title)
	var node_positions := [
		Vector2(0.22, 0.43), Vector2(0.48, 0.20), Vector2(0.76, 0.31),
		Vector2(0.18, 0.79), Vector2(0.76, 0.64), Vector2(0.52, 0.77)
	]
	for index in range(node_data.size()):
		var node := _choice_card(node_data[index][0], node_data[index][1], node_data[index][2], index == selection)
		node.anchor_left = node_positions[index].x
		node.anchor_right = node_positions[index].x
		node.anchor_top = node_positions[index].y
		node.anchor_bottom = node_positions[index].y
		node.offset_left = -92
		node.offset_right = 92
		node.offset_top = -34
		node.offset_bottom = 34
		node.add_theme_font_size_override("font_size", 12)
		node.pressed.connect(_set_selection.bind(index))
		map_canvas.add_child(node)
	var detail := _glass(GOLD)
	detail.custom_minimum_size.x = 360 if not compact else 0
	body.add_child(detail)
	var d := _padded_stack(detail, 24)
	var chosen = node_data[selection]
	d.add_child(_label("RÉGION SÉLECTIONNÉE", 13, GOLD, true))
	d.add_child(_label(chosen[0], 30, CREAM, true))
	d.add_child(_label(chosen[1], 16, chosen[2], true))
	d.add_child(_line(chosen[2]))
	d.add_child(_stat_row("Affinité conseillée", "Marée • Arcane"))
	d.add_child(_stat_row("Étoiles disponibles", "30"))
	d.add_child(_stat_row("Récompense de secteur", "Relique SSR"))
	d.add_child(_label("◇  Mission principale\n◇  Défi de rupture\n◇  Relique de région", 14, MUTED))
	d.add_child(_route_button("OUVRIR LA DESTINATION", "mission_brief", GOLD, INK))
	d.add_child(_route_button("MODE FAILLE", "rift", VIOLET))


func _render_mission_brief() -> void:
	var content := _screen("LÉVIATHAN • MARÉE I", "MISSION 1-1", "Formez l’escouade et vérifiez les conditions d’étoiles.", "res://assets/backgrounds/void-leviathan-arena-v7.png", "world_map")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var intel := _glass(DANGER)
	intel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	intel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var intel_style := intel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	intel_style.bg_color = Color(0.005, 0.008, 0.02, 0.42)
	intel_style.border_color = Color(DANGER, 0.44)
	intel.add_theme_stylebox_override("panel", intel_style)
	body.add_child(intel)
	var i := _padded_stack(intel, 22)
	i.add_child(_label("MENACE • LÉVIATHAN DES MARÉES", 13, DANGER, true))
	i.add_child(_label("PORT NOYÉ", 34, CREAM, true))
	i.add_child(_label("Brisez trois cœurs astraux avant que la chambre ne déborde.", 17, MUTED))
	i.add_child(_line(DANGER))
	i.add_child(_stat_row("Puissance recommandée", "12 400"))
	i.add_child(_stat_row("Votre escouade", "13 180"))
	i.add_child(_stat_row("Coût", "6 énergie"))
	i.add_child(_label("OBJECTIFS D’ÉTOILES", 14, CYAN, true))
	for text in ["Terminer la mission", "Réaliser 3 fusions parfaites", "Déclencher une Surpuissance"]:
		i.add_child(_label("◇  " + text, 15, CREAM))
	var squad := _glass(CYAN)
	squad.custom_minimum_size.x = 500 if not compact else 0
	var squad_style := squad.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	squad_style.bg_color = Color(0.005, 0.008, 0.02, 0.46)
	squad_style.border_color = Color(CYAN, 0.42)
	squad.add_theme_stylebox_override("panel", squad_style)
	body.add_child(squad)
	var s := _padded_stack(squad, 22)
	s.add_child(_label("ESCOUADE ACTIVE", 14, CYAN, true))
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 10)
	for index in [guardian_index, (guardian_index + 1) % guardians.size(), (guardian_index + 2) % guardians.size()]:
		cards.add_child(_guardian_card(index, Vector2(140, 230)))
	s.add_child(cards)
	s.add_child(_route_button("MODIFIER L’ESCOUADE", "roster", SURFACE))
	s.add_child(_route_button("COMBATTRE", "combat_pc", GOLD, INK))


func _render_result(victory: bool) -> void:
	var title := "VICTOIRE ASTRALE" if victory else "REPLI DE L’ESCOUADE"
	var accent := GOLD if victory else DANGER
	var content := _screen(title, "RÉSULTAT • MISSION 1-1", "Le combat est sauvegardé. Choisissez votre prochaine action.", "res://assets/backgrounds/void-leviathan-arena-v7.png", "hub_pc")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 16)
	content.add_child(body)
	var result := _glass(accent)
	result.size_flags_vertical = Control.SIZE_EXPAND_FILL
	result.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var result_style := result.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	result_style.bg_color = Color(0.005, 0.008, 0.02, 0.48)
	result_style.border_color = Color(accent, 0.48)
	result.add_theme_stylebox_override("panel", result_style)
	body.add_child(result)
	var stack := _padded_stack(result, 30)
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	var grade := _label("S" if victory else "B", 96, accent, true)
	grade.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(grade)
	var headline := _label("3 ÉTOILES • 01:42" if victory else "CŒUR ASTRAL À 12 %", 24, CREAM, true)
	headline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(headline)
	var rewards := HBoxContainer.new()
	rewards.alignment = BoxContainer.ALIGNMENT_CENTER
	rewards.add_theme_constant_override("separation", 14)
	for reward in ([["120 ÉCLATS", GOLD], ["1 RELIQUE", VIOLET], ["2 400 XP", CYAN]] if victory else [["DÉGÂTS +8 %", CYAN], ["CONSEIL D’ÉQUIPE", GOLD], ["AUCUN COÛT", GREEN]]):
		rewards.add_child(_chip(reward[0], reward[1]))
	stack.add_child(rewards)
	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 12)
	actions.add_child(_route_button("CARTE DES FAILLES", "world_map", SURFACE))
	actions.add_child(_route_button("MISSION SUIVANTE" if victory else "RÉESSAYER", "mission_brief", accent, INK if victory else CREAM))
	stack.add_child(actions)
	var guardian := _guardian(guardian_index)
	var hero := _glass(_guardian_color(guardian_index))
	hero.custom_minimum_size = Vector2(420 if not compact else 0, 520)
	hero.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hero.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var hero_style := hero.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	hero_style.bg_color = Color(0.005, 0.008, 0.02, 0.12)
	hero_style.border_color = Color(_guardian_color(guardian_index), 0.30)
	hero.add_theme_stylebox_override("panel", hero_style)
	body.add_child(hero)
	var hero_art := TextureRect.new()
	hero_art.texture = load(_stage_art(guardian))
	hero_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	hero_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	hero_art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	hero.add_child(hero_art)


func _render_guardian_detail() -> void:
	var guardian := _guardian(guardian_index)
	var accent := _guardian_color(guardian_index)
	var content := _screen(guardian.get("name", "").to_upper(), "SANCTUAIRE • NIVEAU 90 • %s" % guardian.get("title", "").to_upper(), "Inspectez statistiques, talents, histoire et apparence.", "res://assets/backgrounds/astral-sanctuary-v7.png", "roster")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var portrait := _image_panel(_stage_art(guardian), Vector2(540, 0), true)
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(portrait)
	var details := _glass(accent)
	details.custom_minimum_size.x = 480 if not compact else 0
	body.add_child(details)
	var d := _padded_stack(details, 22)
	var tabs := HBoxContainer.new()
	for tab in ["INFOS", "TALENTS", "HISTOIRE"]:
		tabs.add_child(_button(tab, accent if tab == "INFOS" else SURFACE, INK if tab == "INFOS" and accent.get_luminance() > 0.62 else CREAM))
	d.add_child(tabs)
	d.add_child(_label("%s • %s • %s" % [guardian.get("rarity", ""), guardian.get("title", ""), guardian.get("element", "")], 20, accent, true))
	d.add_child(_stat_row("Puissance", "4 820"))
	d.add_child(_stat_row("Vitalité", "28 450"))
	d.add_child(_stat_row("Rupture astrale", "82 %"))
	d.add_child(_stat_row("Affinité", "7 / 10"))
	d.add_child(_line(accent))
	d.add_child(_label("COMPÉTENCE • %s" % guardian.get("ability", "").to_upper(), 14, accent, true))
	var lore := _label("%s canalise %s pour renforcer les fusions de l’escouade et ouvrir une fenêtre de rupture." % [guardian.get("name", ""), guardian.get("element", "")], 15, MUTED)
	lore.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	d.add_child(lore)
	d.add_child(_route_button("ÉQUIPEMENT", "equipment", GOLD, INK))
	d.add_child(_route_button("GARDE-ROBE", "wardrobe", PINK))
	d.add_child(_route_button("LIEN", "bond", VIOLET))


func _render_equipment() -> void:
	var guardian := _guardian(guardian_index)
	var content := _screen("ÉQUIPEMENT ASTRAL", "%s • CONFIGURATION" % guardian.get("name", "").to_upper(), "Comparez chaque gain avant d’équiper ou renforcer.", "res://assets/backgrounds/astral-sanctuary-v7.png", "guardian_detail")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var inventory := _glass(CYAN)
	inventory.custom_minimum_size.x = 410 if not compact else 0
	body.add_child(inventory)
	var inv := _padded_stack(inventory, 20)
	inv.add_child(_label("INVENTAIRE • 36 / 120", 14, CYAN, true))
	var grid := GridContainer.new()
	grid.columns = 2 if compact else 3
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	inv.add_child(grid)
	var items := [
		["ASTROLABE +12", "+8,4 % rupture", GOLD], ["PRISME DE MARÉE", "+740 vitalité", CYAN],
		["ANNEAU SIDÉRAL", "+6 % critique", VIOLET], ["VOILE DU LARGE", "Set 2/4", PINK],
		["NOYAU POLAIRE", "+12 énergie", GREEN], ["SIGNE ANCIEN", "+4 % combo", GOLD],
	]
	for index in range(items.size()):
		var card := _choice_card(items[index][0], items[index][1], items[index][2], index == selection)
		card.custom_minimum_size = Vector2(170, 110)
		card.pressed.connect(_set_selection.bind(index))
		grid.add_child(card)
	var stage := _glass(_guardian_color(guardian_index))
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.custom_minimum_size.y = 520 if compact else 0
	var stage_style := stage.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	stage_style.bg_color = Color(0.005, 0.008, 0.02, 0.12)
	stage_style.border_color = Color(_guardian_color(guardian_index), 0.30)
	stage.add_theme_stylebox_override("panel", stage_style)
	body.add_child(stage)
	var stage_art := TextureRect.new()
	stage_art.texture = load(_stage_art(guardian))
	stage_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stage_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	stage_art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	stage.add_child(stage_art)
	var compare := _glass(GOLD)
	compare.custom_minimum_size.x = 350 if not compact else 0
	body.add_child(compare)
	var c := _padded_stack(compare, 22)
	var chosen = items[selection % items.size()]
	c.add_child(_label("COMPARAISON", 13, GOLD, true))
	c.add_child(_label(chosen[0], 28, CREAM, true))
	c.add_child(_label(chosen[1], 17, chosen[2], true))
	c.add_child(_line(chosen[2]))
	c.add_child(_stat_row("Puissance", "4 820  →  5 010"))
	c.add_child(_stat_row("Synergie de set", "2 / 4"))
	c.add_child(_stat_row("Renforcement", "12 000 ◇"))
	c.add_child(_button_action("ÉQUIPER", GOLD, INK, "Équipement appliqué"))
	c.add_child(_button_action("RENFORCER", SURFACE, CREAM, "Renforcement simulé • +1"))


func _render_wardrobe() -> void:
	var guardian := _guardian(guardian_index)
	var content := _screen("GARDE-ROBE CÉLESTE", "%s • 3 / 4 TENUES" % guardian.get("name", "").to_upper(), "Prévisualisez chaque silhouette et ses matières.", "res://assets/backgrounds/astral-sanctuary-v7.png", "guardian_detail")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var preview := _image_panel(_stage_art(guardian), Vector2(620, 0), true)
	preview.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(preview)
	var wardrobe := _glass(PINK)
	wardrobe.custom_minimum_size.x = 500 if not compact else 0
	body.add_child(wardrobe)
	var w := _padded_stack(wardrobe, 22)
	w.add_child(_label("COLLECTION DE %s" % guardian.get("name", "").to_upper(), 14, PINK, true))
	var outfits := [["ORACLE DES MARÉES", "Équipée"], ["ÉVEIL ABYSSAL", "Possédée"], ["SOIRÉE CÉLESTE", "Possédée"], ["REINE DU LARGE", "À débloquer"]]
	for index in range(outfits.size()):
		var card := _choice_card(outfits[index][0], outfits[index][1], PINK if index != 3 else MUTED, index == selection)
		card.pressed.connect(_set_selection.bind(index))
		w.add_child(card)
	w.add_child(_label("ÉCLAIRAGE", 13, CYAN, true))
	var lights := HBoxContainer.new()
	for light_name in ["OBSERVATOIRE", "COMBAT", "NUIT"]:
		lights.add_child(_button_action(light_name, SURFACE, CREAM, "Éclairage : " + light_name))
	w.add_child(lights)
	w.add_child(_button_action("PORTER CETTE TENUE", PINK, CREAM, "Tenue équipée"))


func _render_bond() -> void:
	var guardian := _guardian(guardian_index)
	var content := _screen("LIEN • %s" % guardian.get("name", "").to_upper(), "AFFINITÉ 7 / 10", "Développez sa relation par les récits et les choix de dialogue.", "res://assets/backgrounds/astral-sanctuary-v7.png", "guardian_detail")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var memory := _image_panel(guardian.get("art", ""), Vector2(560, 0))
	memory.size_flags_vertical = Control.SIZE_EXPAND_FILL
	memory.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(memory)
	var story := _glass(VIOLET)
	story.custom_minimum_size.x = 570 if not compact else 0
	body.add_child(story)
	var s := _padded_stack(story, 24)
	s.add_child(_label("SOUVENIR VII • LA PROMESSE DU LARGE", 14, VIOLET, true))
	s.add_child(_label("« Les courants gardent tout ce que nous n’osons pas dire. »", 24, CREAM, true))
	var narration := _label("%s vous confie un souvenir lié à la faction %s." % [guardian.get("name", ""), guardian.get("faction", "")], 16, MUTED)
	narration.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	s.add_child(narration)
	s.add_child(_line(VIOLET))
	s.add_child(_label("VOTRE RÉPONSE", 13, CYAN, true))
	for choice in ["Je resterai jusqu’au retour de la marée.", "Tu n’as plus à porter ce serment seule.", "Raconte-moi d’abord ce que tu as perdu."]:
		s.add_child(_button_action(choice, SURFACE, CREAM, "Choix enregistré • Affinité +40"))
	s.add_child(_button_action("SCÈNE SUIVANTE", VIOLET, CREAM, "Souvenir suivant déverrouillé"))


func _render_summon(count: int) -> void:
	var title := "RÉSONANCE UNIQUE" if count == 1 else "CONSTELLATION DÉCUPLE"
	var content := _screen(title, "INVOCATION • BANNIÈRE DES MARÉES", "Confirmez le coût, les taux et la garantie avant le tirage.", "res://assets/backgrounds/astral-super-magic-v1.png", "roster")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var focus := _glass(VIOLET)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	focus.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(focus)
	var f := _padded_stack(focus, 22)
	f.add_child(_label("SSR EN VEDETTE", 14, CYAN, true))
	var cards := GridContainer.new()
	cards.columns = (2 if compact else 5) if count == 10 else 1
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var visible_cards: int = count
	for index in range(visible_cards):
		var card_index := guardian_index if count == 1 else (guardian_index + index) % guardians.size()
		cards.add_child(_guardian_card(card_index, Vector2(125 if count == 10 else 300, 210 if count == 10 else 390)))
	f.add_child(cards)
	var rules := _glass(GOLD)
	rules.custom_minimum_size.x = 430 if not compact else 0
	body.add_child(rules)
	var r := _padded_stack(rules, 22)
	r.add_child(_label("AVANT D’INVOQUER", 13, GOLD, true))
	r.add_child(_stat_row("Coût", "%s ◇" % (300 if count == 1 else 3000)))
	r.add_child(_stat_row("Solde", "3 210 ◇"))
	r.add_child(_stat_row("Compteur de garantie", "62 / 80"))
	r.add_child(_stat_row("Taux SSR", "0,8 %"))
	r.add_child(_route_button("VOIR TAUX ET HISTORIQUE", "rates_history", SURFACE))
	r.add_child(_button_action("INVOQUER ×%s" % count, GOLD, INK, "Résonance déclenchée • résultat ajouté"))
	r.add_child(_route_button("RETOUR À LA COLLECTION", "roster", CYAN, INK))


func _render_shop() -> void:
	var guardian := _guardian(guardian_index)
	var content := _screen("BOUTIQUE ASTRALE", "ACHATS DIRECTS • SANS COMPTE À REBOURS", "Comparez clairement le contenu et le prix avant toute action.", "res://assets/backgrounds/astral-observatory-v3.png", "hub_pc")
	var tabs := HBoxContainer.new()
	for name in ["TENUES", "PACKS", "MONNAIE"]:
		tabs.add_child(_button_action(name, GOLD if name == "TENUES" else SURFACE, INK if name == "TENUES" else CREAM, "Catégorie : " + name))
	content.add_child(tabs)
	var grid := GridContainer.new()
	grid.columns = 2 if compact else 3
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)
	content.add_child(grid)
	var offers := [
		["SOIRÉE CÉLESTE", "Tenue %s • 12,99 €" % guardian.get("name", ""), PINK, guardian.get("art", "")],
		["ÉVEIL ABYSSAL", "Tenue %s • 8,99 €" % guardian.get("name", ""), VIOLET, guardian.get("art", "")],
		["PACK DÉCOUVERTE", "1 200 ◇ + bonus • 9,99 €", GOLD, "res://assets/backgrounds/astral-super-magic-v1.png"],
		["VOILE BORÉAL", "Tenue Lys • 8,99 €", CYAN, _guardian(8).get("art", "")],
		["ÉCLATS ×3 000", "Monnaie • 24,99 €", GREEN, "res://assets/backgrounds/constellation-ballroom-v7.png"],
		["PACK GRATUIT", "Énergie + matériaux • 0 €", GOLD, "res://assets/backgrounds/astral-observatory-v3.png"],
	]
	for offer in offers:
		grid.add_child(_offer_card(offer[0], offer[1], offer[2], offer[3]))


func _render_rates_history() -> void:
	var content := _screen("TAUX ET HISTORIQUE", "TRANSPARENCE DES INVOCATIONS", "Les probabilités et le compteur sont consultables à tout moment.", "res://assets/backgrounds/astral-observatory-v3.png", "roster")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var rates := _glass(GOLD)
	rates.custom_minimum_size.x = 470 if not compact else 0
	body.add_child(rates)
	var r := _padded_stack(rates, 22)
	r.add_child(_label("RÈGLES DE LA BANNIÈRE", 14, GOLD, true))
	r.add_child(_stat_row("SSR", "0,8 %"))
	r.add_child(_stat_row("SR", "14,2 %"))
	r.add_child(_stat_row("R", "85,0 %"))
	r.add_child(_line(GOLD))
	r.add_child(_stat_row("Soft pity", "à partir de 65"))
	r.add_child(_stat_row("Garantie SSR", "80 tirages"))
	r.add_child(_stat_row("Compteur actuel", "62 / 80"))
	r.add_child(_label("Le compteur est conservé entre les bannières de même catégorie.", 14, MUTED))
	var history := _glass(CYAN)
	history.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(history)
	var h := _padded_stack(history, 22)
	h.add_child(_label("20 DERNIERS TIRAGES", 14, CYAN, true))
	for entry in ["#062 • KAEL • R", "#061 • LYS • SR", "#060 • TALIA • R", "#059 • BRANN • R", "#058 • ORION • SSR", "#057 • ASTER • SSR"]:
		h.add_child(_stat_row(entry, "Bannière des marées"))
	h.add_child(_route_button("RETOUR À L’INVOCATION", "roster", CYAN, INK))


func _render_rift() -> void:
	var content := _screen("FAILLE ROGUELITE", "PROFONDEUR 4 / 12", "Choisissez votre route, votre risque et votre bénédiction.", "res://assets/backgrounds/astral-super-magic-v1.png", "world_map")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var route := _glass(VIOLET)
	route.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(route)
	var r := _padded_stack(route, 20)
	r.add_child(_label("ROUTE STELLAIRE", 14, VIOLET, true))
	var nodes := GridContainer.new()
	nodes.columns = 3
	for index in range(9):
		var labels := ["COMBAT", "RELIQUE", "ÉLITE", "SOIN", "MYSTÈRE", "BOSS", "COMBAT", "ÉCHO", "SORTIE"]
		var color := DANGER if labels[index] in ["ÉLITE", "BOSS"] else CYAN if labels[index] == "SOIN" else VIOLET
		var node := _choice_card("0%s" % (index + 1), labels[index], color, index == selection)
		node.custom_minimum_size = Vector2(130, 96)
		node.pressed.connect(_set_selection.bind(index))
		nodes.add_child(node)
	r.add_child(nodes)
	var blessing := _glass(GOLD)
	blessing.custom_minimum_size.x = 440 if not compact else 0
	body.add_child(blessing)
	var b := _padded_stack(blessing, 22)
	b.add_child(_label("BÉNÉDICTIONS ACTIVES", 14, GOLD, true))
	b.add_child(_stat_row("Courant ascendant", "Combo +12 %"))
	b.add_child(_stat_row("Cœur miroir", "1 résurrection"))
	b.add_child(_stat_row("Corruption", "28 %"))
	b.add_child(_line(DANGER))
	b.add_child(_label("NŒUD SÉLECTIONNÉ • %s" % (selection + 1), 19, CREAM, true))
	b.add_child(_button_action("ENTRER", VIOLET, CREAM, "Nœud de Faille prêt"))


func _render_activity(screen_id: String) -> void:
	var activity_data: Dictionary = {
		"rhythm_game": ["DANSE DES CONSTELLATIONS", "RYTHME • 2 JOUEURS", "Synchronisez les pas sur les pulsations astrales.", PINK, ["A / D • Changer de voie", "Espace • Pulsation", "Combo partagé"]],
		"astral_hunt": ["CHASSE ASTRALE", "PRÉCISION • SOLO", "Marquez les anomalies avant leur disparition.", CYAN, ["Souris / tactile • Viser", "Maintenir • Charger", "Cibles dorées = bonus"]],
		"outfit_workshop": ["ATELIER DES TENUES", "PUZZLE • CRÉATION", "Assemblez formes, matières et motifs sans dépasser le budget.", GOLD, ["Glisser • Assembler", "Rotation • Ajuster", "3 contraintes par commande"]],
	}
	var data: Array = activity_data[screen_id]
	var content := _screen(data[0], data[1], data[2], "res://assets/backgrounds/astral-super-magic-v1.png", "hub_pc")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var stage := _glass(data[3])
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(stage)
	var st := _padded_stack(stage, 24)
	st.add_child(_label("APERÇU DE L’ACTIVITÉ", 14, data[3], true))
	st.add_child(_label("ZONE DE JEU INTERACTIVE", 34, CREAM, true))
	var pulse := _progress(data[3], 68)
	pulse.custom_minimum_size.y = 34
	st.add_child(pulse)
	var demo := _button_action("TESTER LE RETOUR VISUEL", data[3], INK if data[3] in [CYAN, GOLD] else CREAM, "PARFAIT • +200 • COMBO ×8")
	demo.size_flags_vertical = Control.SIZE_EXPAND_FILL
	st.add_child(demo)
	var rules := _glass(data[3])
	rules.custom_minimum_size.x = 470 if not compact else 0
	body.add_child(rules)
	var rr := _padded_stack(rules, 22)
	rr.add_child(_label("RÈGLES ESSENTIELLES", 14, data[3], true))
	for rule in data[4]:
		rr.add_child(_label("◇  " + rule, 16, CREAM))
	rr.add_child(_stat_row("Meilleur score", "184 200"))
	rr.add_child(_stat_row("Récompense du jour", "120 éclats"))
	rr.add_child(_button_action("LANCER LA PARTIE", data[3], INK if data[3] in [CYAN, GOLD] else CREAM, "Mode prêt • gameplay détaillé à venir"))


func _render_settings() -> void:
	var content := _screen("PARAMÈTRES", "SYSTÈME • PROFIL LOCAL", "Les changements sont prévisualisés et restent réversibles.", "res://assets/backgrounds/astral-observatory-v3.png", "hub_pc")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var nav := _glass(VIOLET)
	nav.custom_minimum_size.x = 300 if not compact else 0
	body.add_child(nav)
	var n := _padded_stack(nav, 18)
	for tab in ["GRAPHISMES", "AUDIO", "COMMANDES", "COMPTE"]:
		if tab == "COMPTE":
			n.add_child(_route_button("COMPTE / RÉSEAU", "network_error", SURFACE))
		else:
			n.add_child(_button_action(tab, VIOLET if tab == "GRAPHISMES" else SURFACE, CREAM, "Onglet : " + tab))
	n.add_child(_route_button("ACCESSIBILITÉ", "accessibility", CYAN, INK))
	n.add_child(_route_button("CONTENU", "download_content", GOLD, INK))
	var options := _glass(CYAN)
	options.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(options)
	var o := _padded_stack(options, 22)
	o.add_child(_label("GRAPHISMES", 15, CYAN, true))
	o.add_child(_option_slider("Échelle de rendu", 85))
	o.add_child(_option_slider("Luminosité", 62))
	o.add_child(_option_slider("Intensité des effets", 74))
	o.add_child(_option_toggle("Synchronisation verticale", true))
	o.add_child(_option_toggle("Flou cinétique", false))
	o.add_child(_option_toggle("Mode économie mobile", false))
	o.add_child(_button_action("APPLIQUER", GOLD, INK, "Paramètres appliqués"))


func _render_accessibility() -> void:
	var content := _screen("ACCESSIBILITÉ", "CONFORT • LISIBILITÉ • SAISIE", "Chaque option peut être testée sans quitter cet écran.", "res://assets/backgrounds/astral-observatory-v3.png", "settings")
	var body: BoxContainer = VBoxContainer.new() if compact else HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(body)
	var options := _glass(CYAN)
	options.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(options)
	var o := _padded_stack(options, 22)
	o.add_child(_label("AFFICHAGE ET MOUVEMENT", 14, CYAN, true))
	o.add_child(_option_slider("Taille du texte", 130))
	o.add_child(_option_toggle("Contraste élevé", high_contrast))
	o.add_child(_option_toggle("Réduction des mouvements", true))
	o.add_child(_option_toggle("Sous-titres des voix", true))
	o.add_child(_option_toggle("Signaux sans couleur", true))
	o.add_child(_option_toggle("Maintien remplacé par bascule", false))
	var preview := _glass(GOLD)
	preview.custom_minimum_size.x = 480 if not compact else 0
	body.add_child(preview)
	var p := _padded_stack(preview, 24)
	p.add_child(_label("APERÇU EN DIRECT", 14, GOLD, true))
	p.add_child(_label("Fusion parfaite", 32, CREAM, true))
	p.add_child(_label("Un anneau, une forme et un libellé accompagnent toujours la couleur.", 18, MUTED))
	p.add_child(_progress(CYAN, 72))
	p.add_child(_button_action("TESTER LES SIGNAUX", CYAN, INK, "Signal visuel + vibration simulée"))
	p.add_child(_button_action("ENREGISTRER", GOLD, INK, "Préférences d’accessibilité enregistrées"))


func _render_download() -> void:
	var content := _screen("CONTENU ADDITIONNEL", "GESTION DU STOCKAGE", "Téléchargez seulement les chapitres et voix nécessaires.", "res://assets/backgrounds/astral-observatory-v3.png", "settings")
	var panel := _glass(GOLD)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(panel)
	var stack := _padded_stack(panel, 28)
	stack.add_child(_label("PACK CHAPITRES I–III", 16, GOLD, true))
	stack.add_child(_label("1,8 Go • 4,2 Go disponibles • Wi-Fi recommandé", 18, MUTED))
	var progress := _progress(CYAN, download_value)
	progress.custom_minimum_size.y = 42
	stack.add_child(progress)
	stack.add_child(_stat_row("Progression", "%d %%" % int(download_value)))
	stack.add_child(_stat_row("État", "Téléchargement en pause"))
	stack.add_child(_line(CYAN))
	for pack in [["VOIX FRANÇAISES", "420 Mo • Installé"], ["TEXTURES HD", "960 Mo • Optionnel"], ["CHAPITRE IV", "740 Mo • Disponible"]]:
		stack.add_child(_stat_row(pack[0], pack[1]))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 12)
	var download := _button("REPRENDRE", GOLD, INK)
	download.pressed.connect(_advance_download)
	actions.add_child(download)
	actions.add_child(_route_button("JOUER AU PROLOGUE", "hub_pc", CYAN, INK))
	stack.add_child(actions)


func _render_network_error() -> void:
	_background("res://assets/backgrounds/astral-observatory-v3.png", 0.55)
	var dim := ColorRect.new()
	dim.color = Color(0.01, 0.015, 0.04, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var modal := _glass(DANGER)
	modal.anchor_left = 0.28 if not compact else 0.07
	modal.anchor_right = 0.72 if not compact else 0.93
	modal.anchor_top = 0.18
	modal.anchor_bottom = 0.82
	add_child(modal)
	var stack := _padded_stack(modal, 34)
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	var icon := _label("!", 72, DANGER, true)
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(icon)
	var title := _label("CONNEXION INTERROMPUE", 30, CREAM, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(title)
	var message := _label("Votre progression locale est sauvegardée. Vous pouvez réessayer ou revenir au mode hors ligne.", 17, MUTED)
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(message)
	stack.add_child(_stat_row("Code", "ASTRA-204"))
	stack.add_child(_button_action("RÉESSAYER", DANGER, CREAM, "Connexion rétablie"))
	stack.add_child(_route_button("CONTINUER HORS LIGNE", "hub_pc", SURFACE))


func _render_placeholder(screen_id: String) -> void:
	var content := _screen(screen_id.to_upper(), "ÉCRAN INTERACTIF", "Cet écran est relié au routeur principal.", "res://assets/backgrounds/astral-observatory-v3.png", "hub_pc")
	var panel := _glass(CYAN)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(panel)
	var stack := _padded_stack(panel, 30)
	stack.add_child(_label("ÉTAT DISPONIBLE", 32, CREAM, true))
	stack.add_child(_route_button("RETOUR AU HUB", "hub_pc", GOLD, INK))


func _screen(title: String, eyebrow: String, subtitle: String, background_path: String, back_route: String) -> VBoxContainer:
	_background(background_path, 0.40 if high_contrast else 0.14)
	var shade := ColorRect.new()
	shade.color = Color(0.01, 0.015, 0.05, 0.24 if not high_contrast else 0.62)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var page := MarginContainer.new()
	page.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	page.add_theme_constant_override("margin_left", 28 if compact else 42)
	page.add_theme_constant_override("margin_right", 28 if compact else 42)
	page.add_theme_constant_override("margin_top", 22)
	page.add_theme_constant_override("margin_bottom", 24)
	add_child(page)
	var full := VBoxContainer.new()
	full.add_theme_constant_override("separation", 16)
	page.add_child(full)
	var header := HBoxContainer.new()
	header.custom_minimum_size.y = 80
	header.add_theme_constant_override("separation", 18)
	full.add_child(header)
	var back := _button("‹", SURFACE)
	back.custom_minimum_size = Vector2(58, 58)
	back.pressed.connect(_route.bind(back_route))
	header.add_child(back)
	var copy := VBoxContainer.new()
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(copy)
	copy.add_child(_label(eyebrow, 13, CYAN, true))
	copy.add_child(_label(title, 30 if compact else 38, CREAM, true))
	var sub := _label(subtitle, 14, MUTED)
	sub.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	copy.add_child(sub)
	header.add_child(_chip("3 210 ◇", GOLD))
	header.add_child(_chip("RANG 27", VIOLET))
	var content := VBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 14)
	full.add_child(content)
	return content


func _background(path: String, darkness: float) -> void:
	var texture := TextureRect.new()
	texture.texture = load(path)
	texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	texture.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	texture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	texture.modulate = Color(1.0 - darkness * 0.35, 1.0 - darkness * 0.25, 1.0, 1)
	texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(texture)


func _glass(accent := Color("#374260")) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.012, 0.017, 0.042, 0.82)
	style.border_color = Color(accent, 0.62)
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.shadow_color = Color(0, 0, 0, 0.56)
	style.shadow_size = 12
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
	stack.add_theme_constant_override("separation", 12)
	margin.add_child(stack)
	return stack


func _image_panel(path: String, minimum: Vector2, contain := false) -> PanelContainer:
	var panel := _glass(CYAN)
	panel.custom_minimum_size = minimum
	var image := TextureRect.new()
	image.texture = load(path)
	image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED if contain else TextureRect.STRETCH_KEEP_ASPECT_COVERED
	image.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(image)
	return panel


func _stage_art(data: Dictionary) -> String:
	return str(data.get("fullbody_art", data.get("art", "")))


func _guardian_card(index: int, size: Vector2) -> PanelContainer:
	var data := _guardian(index)
	var accent := _guardian_color(index)
	var card := _glass(accent)
	card.custom_minimum_size = size
	var stack := _padded_stack(card, 6)
	var portrait := TextureRect.new()
	portrait.texture = load(data.get("art", ""))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_child(portrait)
	var name := _label("%s • %s" % [data.get("name", ""), data.get("rarity", "")], 14, CREAM, true)
	name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(name)
	var role := _label(data.get("title", ""), 12, accent, true)
	role.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(role)
	return card


func _offer_card(title: String, meta: String, accent: Color, art_path: String) -> PanelContainer:
	var card := _glass(accent)
	card.custom_minimum_size = Vector2(250, 220)
	var stack := _padded_stack(card, 8)
	var art := TextureRect.new()
	art.texture = load(art_path)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	art.custom_minimum_size.y = 132
	art.size_flags_vertical = Control.SIZE_EXPAND_FILL
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(art)
	stack.add_child(_label(title, 15, CREAM, true))
	var meta_label := _label(meta, 12, accent, true)
	meta_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	stack.add_child(meta_label)
	var hit := Button.new()
	hit.flat = true
	hit.focus_mode = Control.FOCUS_NONE
	hit.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	hit.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hit.pressed.connect(_show_feedback.bind("Détail ouvert : " + title))
	card.add_child(hit)
	return card


func _guardian_tile(index: int, size: Vector2) -> PanelContainer:
	var data := _guardian(index)
	var accent := _guardian_color(index)
	var card := _glass(GOLD if index == guardian_index else accent)
	card.custom_minimum_size = size
	var stack := _padded_stack(card, 4)
	var portrait := TextureRect.new()
	portrait.texture = load(data.get("art", ""))
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack.add_child(portrait)
	var name := _label(data.get("name", "").to_upper(), 11, CREAM, true)
	name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	stack.add_child(name)
	var meta := _label("%s • %s" % [data.get("rarity", ""), data.get("element", "")], 9, accent, true)
	meta.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(meta)
	var hit := Button.new()
	hit.flat = true
	hit.focus_mode = Control.FOCUS_NONE
	hit.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	hit.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hit.pressed.connect(_select_guardian.bind(index))
	card.add_child(hit)
	return card


func _choice_card(title: String, meta: String, accent: Color, selected: bool) -> Button:
	var button := _button("%s\n%s" % [title, meta], accent if selected else Color("#151a31"), INK if selected and accent in [CYAN, GOLD, GREEN] else CREAM)
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.add_theme_font_size_override("font_size", 15)
	var normal := button.get_theme_stylebox("normal").duplicate() as StyleBoxFlat
	normal.border_color = accent
	normal.set_border_width_all(2 if selected else 1)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	button.add_theme_stylebox_override("normal", normal)
	return button


func _button(text: String, color: Color, text_color := CREAM) -> Button:
	var button := Button.new()
	button.text = text
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_color_override("font_pressed_color", text_color)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	normal.border_color = Color(color.lightened(0.35), 0.75)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(4)
	normal.content_margin_left = 16
	normal.content_margin_right = 16
	normal.content_margin_top = 12
	normal.content_margin_bottom = 12
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = color.lightened(0.12)
	hover.set_border_width_all(2)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	return button


func _route_button(text: String, route: String, color: Color, text_color := CREAM) -> Button:
	var button := _button(text, color, text_color)
	button.pressed.connect(_route.bind(route))
	return button


func _button_action(text: String, color: Color, text_color: Color, feedback: String) -> Button:
	var button := _button(text, color, text_color)
	button.pressed.connect(_show_feedback.bind(feedback))
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
	var left := _label(left_text, 14, MUTED)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(left)
	var right := _label(right_text, 14, CREAM, true)
	right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(right)
	return row


func _chip(text: String, accent: Color) -> PanelContainer:
	var chip := _glass(accent)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_top", 9)
	margin.add_theme_constant_override("margin_bottom", 9)
	chip.add_child(margin)
	margin.add_child(_label(text, 13, accent, true))
	return chip


func _line(color: Color) -> HSeparator:
	var line := HSeparator.new()
	line.custom_minimum_size.y = 10
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
	progress.add_theme_font_size_override("font_size", 13)
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


func _option_slider(name: String, value: float) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.add_child(_stat_row(name, "%d %%" % int(value)))
	var slider := HSlider.new()
	slider.min_value = 50
	slider.max_value = 150
	slider.value = value
	slider.custom_minimum_size.y = 28
	box.add_child(slider)
	return box


func _option_toggle(name: String, enabled: bool) -> CheckButton:
	var toggle := CheckButton.new()
	toggle.text = name
	toggle.button_pressed = enabled
	toggle.add_theme_font_size_override("font_size", 15)
	toggle.add_theme_color_override("font_color", CREAM)
	return toggle


func _set_onboarding_step(index: int) -> void:
	onboarding_step = clampi(index, 0, 2)
	render("onboarding")


func _finish_or_advance_onboarding() -> void:
	if onboarding_step >= 2:
		_route("hub_pc")
	else:
		onboarding_step += 1
		render("onboarding")


func _set_selection(index: int) -> void:
	selection = index
	render(current_screen)


func _select_guardian(index: int) -> void:
	guardian_index = clampi(index, 0, guardians.size() - 1)
	guardian_selected.emit(guardian_index)
	render(current_screen)


func _advance_download() -> void:
	download_value = minf(100.0, download_value + 21.0)
	render("download_content")


func _show_feedback(message: String) -> void:
	var notice := _glass(CYAN)
	notice.anchor_left = 0.33 if not compact else 0.08
	notice.anchor_right = 0.67 if not compact else 0.92
	notice.anchor_top = 0.86
	notice.anchor_bottom = 0.95
	add_child(notice)
	var label := _label(message, 15, CREAM, true)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	notice.add_child(label)
	notice.modulate.a = 0
	var tween := create_tween()
	tween.tween_property(notice, "modulate:a", 1.0, 0.12)
	tween.tween_interval(1.2)
	tween.tween_property(notice, "modulate:a", 0.0, 0.2)
	tween.tween_callback(notice.queue_free)


func _route(screen_id: String) -> void:
	route_requested.emit(screen_id)

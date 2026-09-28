extends RefCounted

const GUARDIAN_CATALOG := "res://data/guardians_3d_v2.json"
const LOADOUT_CATALOG := "res://data/loadouts_3d_v2.json"
const SUMMON_CATALOG := "res://data/summons_3d_v2.json"

var guardians: Dictionary = {}
var loadouts: Dictionary = {}
var summons: Dictionary = {}


func _init() -> void:
	_index_guardians(_read_json(GUARDIAN_CATALOG))
	_index_loadouts(_read_json(LOADOUT_CATALOG))
	_index_summons(_read_json(SUMMON_CATALOG))


func _read_json(catalog_path: String) -> Dictionary:
	var file := FileAccess.open(catalog_path, FileAccess.READ)
	if file == null:
		push_error("Catalogue 3D absent : %s" % catalog_path)
		return {}
	var parsed = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		return parsed
	push_error("Catalogue 3D invalide : %s" % catalog_path)
	return {}


func _index_guardians(catalog: Dictionary) -> void:
	for item in catalog.get("guardians", []):
		guardians[str(item.get("id", ""))] = item


func _index_loadouts(catalog: Dictionary) -> void:
	for item in catalog.get("items", []):
		var guardian_id := str(item.get("guardianId", ""))
		if not loadouts.has(guardian_id):
			loadouts[guardian_id] = []
		loadouts[guardian_id].append(item)


func _index_summons(catalog: Dictionary) -> void:
	for item in catalog.get("items", []):
		summons[str(item.get("id", ""))] = item
	for item in catalog.get("livingOrbs", []):
		summons[str(item.get("id", ""))] = item


func instantiate_guardian(guardian_id: String) -> Node3D:
	return _instantiate_path(str(guardians.get(guardian_id, {}).get("runtime", "")))


func instantiate_loadout(
	guardian_id: String,
	kind: String,
	variant: String = "signature"
) -> Node3D:
	for item in loadouts.get(guardian_id, []):
		if item.get("kind", "") == kind and item.get("variant", "") == variant:
			return _instantiate_path(str(item.get("runtime", "")))
	return null


func instantiate_summon(summon_id: String) -> Node3D:
	var item: Dictionary = summons.get(summon_id, {})
	return _instantiate_path(str(item.get("runtime", "")))


func guardian_animation(guardian_id: String) -> String:
	var clips: Array = guardians.get(guardian_id, {}).get("animationClips", [])
	return str(clips[0]) if not clips.is_empty() else ""


func _instantiate_path(resource_path: String) -> Node3D:
	if resource_path.is_empty():
		return null
	var resource = load(resource_path)
	if resource is PackedScene:
		return resource.instantiate()
	push_error("Modèle 3D non importé : %s" % resource_path)
	return null

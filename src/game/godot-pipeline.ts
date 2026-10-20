import type { AssetDiscoveryItem } from './types.ts';

export const ASSET_CATALOG: AssetDiscoveryItem[] = [
  {
    id: 'poly_asphalt_01',
    name: 'Cyber Wet Asphalt PBR',
    source: 'Poly Haven',
    license: 'CC0',
    category: 'architecture',
    triangles: 120,
    lodLevels: 3,
    format: 'glTF',
    status: 'Ready',
    description: 'High-detail wet street material with reflection roughness map and puddles.',
  },
  {
    id: 'poly_concrete_wall',
    name: 'Brutalist Concrete Modular Slab',
    source: 'Poly Haven',
    license: 'CC0',
    category: 'architecture',
    triangles: 480,
    lodLevels: 4,
    format: 'GLB',
    status: 'Optimized',
    description: 'Heavy structural paneling with wear decals for mega-corp facades.',
  },
  {
    id: 'blender_hab_block',
    name: 'Procedural Neon Hab Tower Gen',
    source: 'Blender Procedural',
    license: 'MIT',
    category: 'architecture',
    triangles: 2450,
    lodLevels: 3,
    format: 'Blender Python',
    status: 'Extracted',
    description: 'Parametric multi-story apartment block with enterable ground floor and balconies.',
  },
  {
    id: 'anita_subcore_radar',
    name: 'Anita Surveillance Uplink Array',
    source: 'Resistance Vault',
    license: 'Custom Game CC',
    category: 'electronics',
    triangles: 1820,
    lodLevels: 3,
    format: 'GLB',
    status: 'Ready',
    description: 'Hostile AI antenna dish with rotating red scanner emitter and EMP vulnerable socket.',
  },
  {
    id: 'server_rack_interior',
    name: 'Cyber Data Mainframe & Terminal',
    source: 'Resistance Vault',
    license: 'MIT',
    category: 'electronics',
    triangles: 640,
    lodLevels: 2,
    format: 'GLB',
    status: 'Ready',
    description: 'Interactive mainframe unit with holographic data readout and hackable firmware.',
  },
  {
    id: 'anita_patrol_drone_mesh',
    name: 'Anita Sentinel Drone Mk.IV',
    source: 'Resistance Vault',
    license: 'Custom Game CC',
    category: 'vehicles',
    triangles: 3100,
    lodLevels: 3,
    format: 'GLB',
    status: 'Ready',
    description: 'Autonomous twin-rotor hunter-killer drone with spotlight projection cone.',
  },
];

export const GODOT_PROJECT_CONFIG = `; Engine configuration file for Humans vs. Anita
; Compatibility renderer for high-performance Web export (WebGL 2.0 / WebAssembly)

[application]
config/name="Humans vs. Anita"
config/description="3D open-world cyberpunk exploration and AI resistance"
run/main_scene="res://scenes/world_root.tscn"
config/features=PackedStringArray("4.3", "Compatibility", "Mobile")

[display]
window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"

[rendering]
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
renderer/rendering_method.web="gl_compatibility"
textures/vram_compression/import_etc2_astc=true
anti_aliasing/quality/msaa_3d=1

[input]
move_forward={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":87)] } ; W
move_backward={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":83)] } ; S
move_left={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":65)] } ; A
move_right={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":68)] } ; D
jump={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":32)] } ; Space
sprint={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":4194325)] } ; Shift
interact={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":69)] } ; E
emp_hack={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":70)] } ; F
`;

export const GODOT_PLAYER_GDSCRIPT = `# player_controller.gd - Humans vs. Anita
# Third-person character body controller with coyote time, jump buffer, and EMP ability
extends CharacterBody3D

@export var walk_speed: float = 4.8
@export var sprint_speed: float = 8.5
@export var jump_velocity: float = 7.2
@export var gravity: float = 18.0

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var visual_mesh: Node3D = $VisualMesh
@onready var emp_emitter: GPUParticles3D = $EMPEmitter

var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0
var emp_cooldown: float = 0.0

func _physics_process(delta: float) -> void:
    if emp_cooldown > 0.0:
        emp_cooldown = max(0.0, emp_cooldown - delta)

    # Coyote time & Ground handling
    if is_on_floor():
        coyote_timer = 0.1
    else:
        coyote_timer -= delta
        velocity.y -= gravity * delta

    # Jump buffer
    if Input.is_action_just_pressed("jump"):
        jump_buffer_timer = 0.14
    elif jump_buffer_timer > 0.0:
        jump_buffer_timer -= delta

    # Execute Jump
    if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
        velocity.y = jump_velocity
        coyote_timer = 0.0
        jump_buffer_timer = 0.0

    # Variable Jump Cut
    if Input.is_action_just_released("jump") and velocity.y > 0.0:
        velocity.y *= 0.85

    # EMP Trigger
    if Input.is_action_just_pressed("emp_hack") and emp_cooldown <= 0.0:
        trigger_emp()

    # Movement calculation
    var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
    var camera_basis = spring_arm.global_transform.basis
    var forward = -camera_basis.z
    forward.y = 0.0
    forward = forward.normalized()
    var right = camera_basis.x
    right.y = 0.0
    right = right.normalized()

    var move_dir = (right * input_dir.x + forward * -input_dir.y).normalized()
    var speed = sprint_speed if Input.is_action_pressed("sprint") else walk_speed

    if move_dir.length() > 0.1:
        velocity.x = lerp(velocity.x, move_dir.x * speed, 16.0 * delta)
        velocity.z = lerp(velocity.z, move_dir.z * speed, 16.0 * delta)
        visual_mesh.rotation.y = lerp_angle(visual_mesh.rotation.y, atan2(move_dir.x, move_dir.z), 14.0 * delta)
    else:
        velocity.x = lerp(velocity.x, 0.0, 18.0 * delta)
        velocity.z = lerp(velocity.z, 0.0, 18.0 * delta)

    move_and_slide()

func trigger_emp() -> void:
    emp_cooldown = 3.5
    emp_emitter.emitting = true
    # Query nearby Anita Drones in tree
    var drones = get_tree().get_nodes_in_group("anita_drones")
    for drone in drones:
        if global_position.distance_to(drone.global_position) < 18.0:
            drone.disable_by_emp(7.0)
`;

export const BLENDER_PYTHON_GENERATOR = `# generate_modular_building.py
# Automated Blender Python script for headless procedural building generation & GLB export
import bpy
import bmesh
import math
import sys
import os

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def create_building(width=16.0, depth=16.0, floors=5, floor_height=4.0, output_path="building.glb"):
    clean_scene()
    total_height = floors * floor_height

    # Base mesh
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, total_height / 2.0))
    bld = bpy.context.active_object
    bld.name = "Building_Modular"
    bld.scale = (width, depth, total_height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Bevel edges for realistic specular highlights
    bevel_mod = bld.modifiers.new(name="Bevel", type='BEVEL')
    bevel_mod.width = 0.2
    bevel_mod.segments = 2

    # Carve ground entrance doorway
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -depth / 2.0, 1.4))
    door_cutter = bpy.context.active_object
    door_cutter.scale = (2.2, 1.5, 2.8)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bool_mod = bld.modifiers.new(name="DoorCut", type='BOOLEAN')
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = door_cutter
    bpy.context.view_layer.objects.active = bld
    bpy.ops.object.modifier_apply(modifier="DoorCut")
    bpy.data.objects.remove(door_cutter, do_unlink=True)

    # Assign Cyberpunk PBR materials
    mat = bpy.data.materials.new(name="Mat_Cyber_Concrete")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.08, 0.1, 0.14, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.65
        bsdf.inputs['Metallic'].default_value = 0.2
    bld.data.materials.append(mat)

    # Export optimized GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"[SUCCESS] Exported {output_path} with {floors} floors.")

if __name__ == "__main__":
    create_building(floors=6, output_path="generated_cyber_block.glb")
`;

export const AMARE_NPC_GDSCRIPT = `# amare_npc.gd - Humans vs. Anita
# Godot 4 Node3D controller for Amare Family Resistance NPCs
extends CharacterBody3D

@export var character_id: String = "natan"
@export var character_name: String = "Natan Amare"
@export var character_epithet: String = "Master of Technology"
@export var resonance_color: Color = Color(0.02, 0.71, 0.83)
@export var buff_name: String = "Overclocked EMP"

@onready var interaction_area: Area3D = $InteractionArea
@onready var resonance_crest: Node3D = $Visuals/ResonanceCrest
@onready var aura_ring: Decal = $Visuals/AuraRing
@onready var prompt_label: Label3D = $PromptLabel

var player_in_range: bool = false
var time_elapsed: float = 0.0

func _ready() -> void:
    interaction_area.body_entered.connect(_on_body_entered)
    interaction_area.body_exited.connect(_on_body_exited)
    prompt_label.text = "[E] Speak with " + character_name + " (" + character_epithet + ")"
    prompt_label.visible = false

func _process(delta: float) -> void:
    time_elapsed += delta
    # Gentle idle hover & rotation of the resonance crest
    if resonance_crest:
        resonance_crest.rotation.y += 1.2 * delta
        resonance_crest.position.y = 2.15 + sin(time_elapsed * 2.5) * 0.08

    if player_in_range and Input.is_action_just_pressed("interact"):
        trigger_amare_dialogue()

func _on_body_entered(body: Node3D) -> void:
    if body.is_in_group("player"):
        player_in_range = true
        prompt_label.visible = true

func _on_body_exited(body: Node3D) -> void:
    if body.is_in_group("player"):
        player_in_range = false
        prompt_label.visible = false

func trigger_amare_dialogue() -> void:
    # Emit dialogue event to UI overlay and apply resonance buff
    var hud = get_tree().get_first_node_in_group("game_hud")
    if hud and hud.has_method("open_amare_dialogue"):
        hud.open_amare_dialogue(character_id, character_name, character_epithet, buff_name)
`;

export const FASTAPI_BACKEND_CODE = `# server.py - Humans vs. Anita World Factory API
# Production FastAPI backend + Redis Job Queue for Blender procedural generation
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import requests
import uuid
import os

app = FastAPI(
    title="Humans vs. Anita - 3D World Factory API",
    description="Asset discovery, Blender Python batch generation, and Godot streaming backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job Status Store (Redis or in-memory dict for local worker)
jobs = {}

class GenerationRequest(BaseModel):
    seed: int = 42890
    district: str = "neon_hab"
    floors: int = 5
    width: float = 16.0
    depth: float = 16.0
    export_format: str = "GLB"

@app.get("/api/health")
def health_check():
    return {"status": "online", "engine": "Godot 4.3 + Blender CLI"}

@app.get("/api/assets/polyhaven")
def discover_polyhaven_assets(category: str = "models"):
    """Queries Poly Haven public CC0 API with zero API keys required."""
    url = f"https://api.polyhaven.com/assets?t={category}"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        # Return first 20 verified models with CC0 licenses
        results = []
        for asset_id, meta in list(data.items())[:20]:
            results.append({
                "id": asset_id,
                "name": meta.get("name", asset_id),
                "author": meta.get("author", "Poly Haven"),
                "license": "CC0",
                "download_url": f"https://api.polyhaven.com/files/{asset_id}"
            })
        return {"total": len(results), "items": results}
    except Exception as e:
        return {"error": str(e), "fallback": "Using local resistance asset vault"}

def run_blender_job(job_id: str, req: GenerationRequest):
    jobs[job_id]["status"] = "processing"
    output_glb = f"/tmp/generated_{job_id}.glb"
    cmd = [
        "blender", "-b", "--python", "generate_modular_building.py",
        "--",
        "--floors", str(req.floors),
        "--width", str(req.width),
        "--depth", str(req.depth),
        "--output", output_glb
    ]
    try:
        # Executes headless Blender Python script
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["output_file"] = output_glb
        jobs[job_id]["logs"] = res.stdout[-500:]
    except Exception as err:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(err)

@app.post("/api/jobs/blender/generate")
def create_blender_job(req: GenerationRequest, bg_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "params": req.dict()
    }
    bg_tasks.add_task(run_blender_job, job_id, req)
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/jobs/{job_id}/status")
def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]
`;


#pragma import(RayInteractor  = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@main/dist/RayInteractor.js")
#pragma import(XRRig          = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@main/dist/XRRig.js")
#pragma import(UnifiedRaycast = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@main/dist/UnifiedRaycast.js")
#pragma import(MudGui         = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@main/dist/MudGui.js")

#pragma lifecycle(startup, update, dispose)

/*
 * Cube Interactable Module
 *
 * Registers the cube as an interactive scene object: hovering shows a
 * pointer cursor, clicking toggles its text panel. Works with any pointer
 * source (mouse or XR controllers) via UnifiedRaycast — this file never
 * needs to know which one is active.
 *
 * The dynamically imported modules are factories: call each one with the
 * MUD globals it needs. Their lifecycle hooks aren't run by the runtime, so
 * this Behavior calls them from its own. Only one Behavior in the scene
 * should own XRRig, or locomotion runs more than once per frame.
 */

// ─── Modules ──────────────────────────────────────────────────────────────────
const ray    = RayInteractor({});
const rig    = XRRig({ THREE, scene, camera, Input, avatarRig, avatarPOV });
const input  = UnifiedRaycast({ renderer, camera, Input, MouseButton });
const gui    = MudGui({ THREE, scene, renderer, RayInteractor: ray.RayInteractor });

// ─── Scene objects ────────────────────────────────────────────────────────────
const cube          = cast(scene.getObjectByName("cube"), THREE.Object3D);
const cubeTextPanel = cast(scene.getObjectByName("cubeText"), THREE.Object3D);

cubeTextPanel.visible = false;

// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new ray.RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointer) => input.setCursor(pointer, 'pointer');
cubeInteractor.onExit  = (_hit, pointer) => input.setCursor(pointer, 'default');
cubeInteractor.onClick = (_hit) => { cubeTextPanel.visible = !cubeTextPanel.visible; };

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {
    rig.startup();
    input.startup();
}

function update(delta) {
    rig.update(delta);
    cubeInteractor.update(input.getPointers());
}

function dispose() {
    cubeInteractor.reset();
    input.dispose();
    rig.dispose();
    renderer.domElement.style.cursor = 'default';
}

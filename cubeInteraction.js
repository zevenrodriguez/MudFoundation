#pragma import (ray, input)
#pragma lifecycle(startup, update, dispose)

/*
 * Cube Interactable Module
 *
 * Registers the cube as an interactive scene object: hovering shows a
 * pointer cursor, clicking toggles its text panel. Works with any pointer
 * source (mouse or XR controllers) via UnifiedRaycast — this file never
 * needs to know which one is active.
 *
 * Requires the MudModules Behavior to run first.
 */

// ─── Scene objects ────────────────────────────────────────────────────────────
const cube          = cast(scene.getObjectByName("cube"), THREE.Object3D);
const cubeTextPanel = cast(scene.getObjectByName("cubeText"), THREE.Object3D);

cubeTextPanel.visible = false;

// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new ray.RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointer) => {
    input.setCursor(pointer, 'pointer'); 
};
cubeInteractor.onExit  = (_hit, pointer) => {
    input.setCursor(pointer, 'default');
};
cubeInteractor.onClick = (_hit) => { 
    cubeTextPanel.visible = !cubeTextPanel.visible; 
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {}

function update() {
    cubeInteractor.update(input.getPointers());
}

function dispose() {
    cubeInteractor.reset();
}

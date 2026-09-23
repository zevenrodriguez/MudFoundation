#pragma import (RayInteractor, getPointers, setCursor)
#pragma lifecycle(startup, update, dispose)

/*
 * Cube Interactable Module
 *
 * Registers the cube as an interactive scene object: hovering shows a
 * pointer cursor, clicking toggles its text panel. Works with any pointer
 * source (mouse or XR controllers) via UnifiedRaycast — this file never
 * needs to know which one is active.
 */

// ─── Scene objects ────────────────────────────────────────────────────────────
const cube          = cast(scene.getObjectByName("cube"), THREE.Object3D);
const cubeTextPanel = cast(scene.getObjectByName("cubeText"), THREE.Object3D);

cubeTextPanel.visible = false;

// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointer) => setCursor(pointer, 'pointer');
cubeInteractor.onExit  = (_hit, pointer) => setCursor(pointer, 'default');
cubeInteractor.onClick = (_hit) => { cubeTextPanel.visible = !cubeTextPanel.visible; };

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {}

function update() {
    const pointers = getPointers();
    cubeInteractor.update(pointers);
}

function dispose() {
    cubeInteractor.reset();
    renderer.domElement.style.cursor = 'default';
}

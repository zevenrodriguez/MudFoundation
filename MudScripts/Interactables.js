#pragma import (MudText, MudButton, RayInteractor, getPointers, PointerType)
#pragma lifecycle(startup, update, dispose)

/*
 * Interactables Module
 *
 * The primary place to register interactive scene objects and GUI elements,
 * and to define what happens when they're hovered or clicked. Works with any
 * pointer source (mouse or XR controllers) via UnifiedRaycast — this file
 * never needs to know which one is active.
 */

const domElement = renderer.domElement;

// ─── Scene objects ────────────────────────────────────────────────────────────
const cube   = cast(scene.getObjectByName("cube"), THREE.Object3D);
const sphere = cast(scene.getObjectByName("sphere"), THREE.Object3D);

const cubeTextPanel   = cast(scene.getObjectByName("cubeText"), THREE.Object3D);
const sphereTextPanel = cast(scene.getObjectByName("sphereText"), THREE.Object3D);

cubeTextPanel.visible   = false;
sphereTextPanel.visible = false;

// ─── GUI elements ─────────────────────────────────────────────────────────────
const statusLabel = MudText({
    sceneMesh:       cast(scene.getObjectByName("statusLabel"), THREE.Mesh),
    text:            'This is a MudText Box. This is a MudText Box. This is a MudText Box.',
    textColor:       '#ffffff',
    backgroundColor: '#111111',
    borderColor:     '#444444',
});

const actionButton = MudButton({
    sceneMesh:            cast(scene.getObjectByName("actionButton"), THREE.Mesh),
    text:                 'Hello!',
    textColor:            '#ffffff',
    backgroundColor:      '#2255cc',
    hoverBackgroundColor: '#4477ff',
    borderColor:          '#99bbff',
    hoverBorderColor:     '#ffffff',
});

const infoPanel = MudText({
    sceneMesh:       cast(scene.getObjectByName("infoPanel"), THREE.Mesh),
    text:            'Hello from MudGUI! Hello from MudGUI! Hello from MudGUI! Hello from MudGUI! ',
    textColor:       '#ffffff',
    backgroundColor: '#1a3a1a',
    borderColor:     '#44aa44',
});

infoPanel.mesh.visible = false;

// ─── Cursor helper ────────────────────────────────────────────────────────────
// XR pointers have no on-screen cursor, so only react to the mouse pointer.
function setCursor(pointer, style) {
    if (pointer.type === PointerType.Mouse) domElement.style.cursor = style;
}

// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointer) => setCursor(pointer, 'pointer');
cubeInteractor.onExit  = (_hit, pointer) => setCursor(pointer, 'default');
cubeInteractor.onClick = (_hit) => { cubeTextPanel.visible = !cubeTextPanel.visible; };

// ─── Sphere interactor ────────────────────────────────────────────────────────
const sphereInteractor = new RayInteractor(sphere);

sphereInteractor.onEnter = (_hit, pointer) => {
    sphere.material.color.set(0xff6600);
    sphereTextPanel.visible = true;
    setCursor(pointer, 'pointer');
};
sphereInteractor.onExit = (_hit, pointer) => {
    sphere.material.color.set(0xffffff);
    sphereTextPanel.visible = false;
    setCursor(pointer, 'default');
};

// ─── Button interactor ────────────────────────────────────────────────────────
actionButton._interactor.onEnter = (_hit, pointer) => { actionButton.hover();   setCursor(pointer, 'pointer'); };
actionButton._interactor.onExit  = (_hit, pointer) => { actionButton.unhover(); setCursor(pointer, 'default'); };
actionButton.onClick             = (_hit) => { infoPanel.mesh.visible = !infoPanel.mesh.visible; };

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {}

function update() {
    const pointers = getPointers();

    cubeInteractor.update(pointers);
    sphereInteractor.update(pointers);
    actionButton.update(pointers);
}

function dispose() {
    cubeInteractor.reset();
    sphereInteractor.reset();
    actionButton.reset();
    domElement.style.cursor = 'default';
}

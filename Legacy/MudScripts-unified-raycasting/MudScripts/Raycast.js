#pragma import (RayInteractor, RaycastObjects, ToggleObjects, GUIElements)
#pragma lifecycle(startup, update, dispose)

/*
 * Raycast — unified pointer + interaction driver
 *
 * MUD Verses run in one of two input modes at any given moment:
 *   - Desktop: a single mouse pointer, raycast against the active camera.
 *   - VR: one raycast per tracked XR controller. XRRig.js owns starting and
 *     stopping Input.xr (and draws the laser-pointer lines); this module
 *     just reads controller poses from it.
 *
 * getActivePointers() below turns whichever mode is active into the same
 * shape — a "pointer": { id, kind, raycast, isPressed, isReleased }. That
 * means every interactive object's hover/click behaviour is defined exactly
 * once, and is simply driven by however many pointers are active this
 * frame — one mouse pointer on desktop, one or two controllers in VR —
 * instead of duplicating the same logic per input device.
 */

const domElement        = renderer.domElement;
const XR_TRIGGER_BUTTON = 0; // controller trigger, per the WebXR gamepad mapping

// ─── Pointer resolution ─────────────────────────────────────────────────────
// Returns this frame's active pointers. Exactly one mode is active at a
// time: XR whenever a controller is being tracked, desktop mouse otherwise.
function getActivePointers() {
    if (Input.xr.count() > 0) {
        const pointers = [];

        for (let i = 0; i < Input.xr.count(); i++) {
            const hand = Input.xr.handedness(i);
            const id   = (hand === 'left' || hand === 'right') ? hand : `xr${i}`;

            const raycast = Input.xr.raycast(i);
            raycast.raycaster.ray.origin.copy(raycast.position);
            raycast.raycaster.ray.direction.copy(raycast.direction).normalize();

            pointers.push({
                id,
                kind:       'xr',
                raycast,
                isPressed:  () => Input.xr.isButtonPressed(i, XR_TRIGGER_BUTTON),
                isReleased: () => Input.xr.isButtonReleased(i, XR_TRIGGER_BUTTON),
            });
        }

        return pointers;
    }

    return [{
        id:         'mouse',
        kind:       'mouse',
        raycast:    Input.mouse.raycast(camera),
        isPressed:  () => Input.mouse.isButtonPressed(MouseButton.Left),
        isReleased: () => Input.mouse.isButtonReleased(MouseButton.Left),
    }];
}

// ─── Interactors ────────────────────────────────────────────────────────────
// Defined once — driven by however many pointers are active this frame.

const cube   = RaycastObjects.get("cube");
const sphere = RaycastObjects.get("sphere");

// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointerId) => {
    if (pointerId !== 'mouse') console.log(`${pointerId} controller hover entered (cube)`);
};
cubeInteractor.onExit = (_hit, pointerId) => {
    if (pointerId !== 'mouse') console.log(`${pointerId} controller hover exited (cube)`);
};
cubeInteractor.onClick = (_hit, pointerId) => {
    if (pointerId !== 'mouse') console.log(`${pointerId} controller clicked (cube)`);
    ToggleObjects.get("cubeText").visible = !ToggleObjects.get("cubeText").visible;
};

// ─── Sphere interactor ────────────────────────────────────────────────────────
const sphereInteractor = new RayInteractor(sphere);

sphereInteractor.onEnter = (hit) => {
    hit.object.material.color.set(0xff6600);
    ToggleObjects.get("sphereText").visible = true;
};
sphereInteractor.onExit = (hit) => {
    // Guard with isHovered(): if a second pointer (e.g. the other XR hand)
    // is still on the sphere, don't revert its highlight/text yet.
    if (sphereInteractor.isHovered()) return;
    hit.object.material.color.set(0xffffff);
    ToggleObjects.get("sphereText").visible = false;
};

// ─── Button interactor ────────────────────────────────────────────────────────
const actionButton = GUIElements.get("actionButton");
const infoPanel    = GUIElements.get("infoPanel");

actionButton.onClick = (_hit, _pointerId) => { infoPanel.mesh.visible = !infoPanel.mesh.visible; };

const ALL_INTERACTORS = [cubeInteractor, sphereInteractor, actionButton._interactor];

// Pointer ids seen last frame, so we can reset() any that vanished this
// frame (mode switched, a controller disconnected) instead of leaving
// stuck hover/highlight state behind.
let _previousPointerIds = new Set();

function resetVanishedPointers(currentPointerIds) {
    _previousPointerIds.forEach((id) => {
        if (currentPointerIds.has(id)) return;
        ALL_INTERACTORS.forEach((interactor) => interactor.reset(id));
    });
    _previousPointerIds = currentPointerIds;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {
    // Input.xr's start()/stop() is owned by XRRig.js — this module only
    // reads controller poses from it. Desktop mouse input is this module's
    // own responsibility, since there's no separate "mouse rig".
    Input.mouse.start();
}

function update() {
    const pointers  = getActivePointers();
    const isXRFrame = pointers[0].kind === 'xr';

    resetVanishedPointers(new Set(pointers.map((p) => p.id)));

    for (const pointer of pointers) {
        cubeInteractor.update(pointer.id, pointer.raycast, pointer.isPressed, pointer.isReleased);
        sphereInteractor.update(pointer.id, pointer.raycast, pointer.isPressed, pointer.isReleased);
        actionButton.update(pointer.id, pointer.raycast, pointer.isPressed, pointer.isReleased);
    }

    // The cursor only means something on desktop — in VR the ray line
    // (drawn by XRRig.js) is the pointing indicator.
    domElement.style.cursor = (!isXRFrame && ALL_INTERACTORS.some((interactor) => interactor.isHovered()))
        ? 'pointer'
        : 'default';
}

function dispose() {
    Input.mouse.stop();

    ALL_INTERACTORS.forEach((interactor) => interactor.reset());
    _previousPointerIds = new Set();

    domElement.style.cursor = 'default';
}

#pragma export (getActivePointers)

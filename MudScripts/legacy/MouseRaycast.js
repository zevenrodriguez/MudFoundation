#pragma import (RayInteractor, RaycastObjects, ToggleObjects, togglePanel, GUIElements)
#pragma lifecycle(startup, update, dispose)

const domElement   = renderer.domElement;


// ─── Cube interactor ──────────────────────────────────────────────────────────
const cubeInteractor = new RayInteractor(RaycastObjects.get("cube"));

cubeInteractor.onEnter = (_hit) => { domElement.style.cursor = 'pointer'; };
cubeInteractor.onExit  = (_hit) => { domElement.style.cursor = 'default'; };
cubeInteractor.onClick = (_hit) => { ToggleObjects.get("cubeText").visible = !ToggleObjects.get("cubeText").visible; };

// ─── Sphere interactor ────────────────────────────────────────────────────────
const sphere           = RaycastObjects.get("sphere");
const sphereInteractor = new RayInteractor(sphere);

sphereInteractor.onEnter = (_hit) => {
    _hit.object.material.color.set(0xff6600);
    ToggleObjects.get("sphereText").visible = true;
    domElement.style.cursor = 'pointer';
};
sphereInteractor.onExit = (_hit) => {
    _hit.object.material.color.set(0xffffff);
    ToggleObjects.get("sphereText").visible = false;
    domElement.style.cursor = 'default';
};

// ─── Button interactor ────────────────────────────────────────────────────────
const actionButton = GUIElements.get("actionButton");
const infoPanel    = GUIElements.get("infoPanel");
actionButton._interactor.onEnter = (_hit) => { actionButton.hover();   domElement.style.cursor = 'pointer'; };
actionButton._interactor.onExit  = (_hit) => { actionButton.unhover(); domElement.style.cursor = 'default'; };
actionButton.onClick             = (_hit) => { infoPanel.mesh.visible = !infoPanel.mesh.visible; };

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {
    Input.mouse.start();
}

function update() {
    const mouseRaycast = Input.mouse.raycast(camera);
    const isPressed    = () => Input.mouse.isButtonPressed(MouseButton.Left);
    const isReleased   = () => Input.mouse.isButtonReleased(MouseButton.Left);

    cubeInteractor.update(mouseRaycast, isPressed, isReleased);
    sphereInteractor.update(mouseRaycast, isPressed, isReleased);
    actionButton.update(mouseRaycast, isPressed, isReleased);
}

function dispose() {
    Input.mouse.stop();
    cubeInteractor.reset();
    sphereInteractor.reset();
    actionButton.reset();
    domElement.style.cursor = 'default';
}

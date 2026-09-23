#pragma import (RayInteractor, RaycastObjects, ToggleObjects, GUIElements)
#pragma lifecycle(startup, update, dispose)

// ─── Controllers ──────────────────────────────────────────────────────────────
const controllers = { left: null, right: null, leftIndex: -1, rightIndex: -1 };

// ─── Cube interactors ─────────────────────────────────────────────────────────
const leftInteractor  = new RayInteractor(RaycastObjects.get("cube"));
const rightInteractor = new RayInteractor(RaycastObjects.get("cube"));

leftInteractor.onEnter  = (_hit) => { console.log("Left controller hover entered"); };
leftInteractor.onExit   = (_hit) => { console.log("Left controller hover exited"); };
leftInteractor.onClick  = (_hit) => { console.log("Left controller clicked"); ToggleObjects.get("cubeText").visible = !ToggleObjects.get("cubeText").visible; };

rightInteractor.onEnter = (_hit) => { console.log("Right controller hover entered"); };
rightInteractor.onExit  = (_hit) => { console.log("Right controller hover exited"); };
rightInteractor.onClick = (_hit) => { console.log("Right controller clicked"); ToggleObjects.get("cubeText").visible = !ToggleObjects.get("cubeText").visible; };

// ─── Sphere interactors ───────────────────────────────────────────────────────
const leftSphereInteractor  = new RayInteractor(RaycastObjects.get("sphere"));
const rightSphereInteractor = new RayInteractor(RaycastObjects.get("sphere"));

leftSphereInteractor.onEnter  = (_hit) => { _hit.object.material.color.set(0xff6600);  ToggleObjects.get("sphereText").visible = true; };
leftSphereInteractor.onExit   = (_hit) => { _hit.object.material.color.set(0xffffff);  ToggleObjects.get("sphereText").visible = false; };

rightSphereInteractor.onEnter = (_hit) => { _hit.object.material.color.set(0xff6600);  ToggleObjects.get("sphereText").visible = true; };
rightSphereInteractor.onExit  = (_hit) => { _hit.object.material.color.set(0xffffff);  ToggleObjects.get("sphereText").visible = false; };

// ─── Button interactors ───────────────────────────────────────────────────────
const actionButton = GUIElements.get("actionButton");
const infoPanel    = GUIElements.get("infoPanel");


const leftBtnInteractor  = new RayInteractor(actionButton.mesh);
const rightBtnInteractor = new RayInteractor(actionButton.mesh);

leftBtnInteractor.onEnter  = (_hit) => { actionButton.hover(); };
leftBtnInteractor.onExit   = (_hit) => { actionButton.unhover(); };
leftBtnInteractor.onClick  = (_hit) => { console.log('clicked'); infoPanel.mesh.visible = !infoPanel.mesh.visible; };

rightBtnInteractor.onEnter  = (_hit) => { actionButton.hover(); };
rightBtnInteractor.onExit   = (_hit) => { actionButton.unhover(); };
rightBtnInteractor.onClick  = (_hit) => { console.log('clicked'); infoPanel.mesh.visible = !infoPanel.mesh.visible; };


function startup() {
}

function update() {
    if (Input.xr.count() < 1) return;

    controllers.left  = null;
    controllers.right = null;

    for (let i = 0; i < Input.xr.count(); i++) {
        const raycast = Input.xr.raycast(i);
        const hand    = Input.xr.handedness(i);

        if (hand === 'left')  {
            controllers.left      = raycast;
            controllers.leftIndex = i;
        }
        if (hand === 'right') {
            controllers.right      = raycast;
            controllers.rightIndex = i;
        }
    }

    if (controllers.left) {
        controllers.left.raycaster.ray.origin.copy(controllers.left.position);
        controllers.left.raycaster.ray.direction.copy(controllers.left.direction).normalize();

        const lPressed  = () => Input.xr.isButtonPressed(controllers.leftIndex, 0);
        const lReleased = () => Input.xr.isButtonReleased(controllers.leftIndex, 0);
        leftInteractor.update(controllers.left, lPressed, lReleased);
        leftSphereInteractor.update(controllers.left, lPressed, lReleased);
        leftBtnInteractor.update(controllers.left, lPressed, lReleased);
    }

    if (controllers.right) {
        controllers.right.raycaster.ray.origin.copy(controllers.right.position);
        controllers.right.raycaster.ray.direction.copy(controllers.right.direction).normalize();

        const rPressed  = () => Input.xr.isButtonPressed(controllers.rightIndex, 0);
        const rReleased = () => Input.xr.isButtonReleased(controllers.rightIndex, 0);
        rightInteractor.update(controllers.right, rPressed, rReleased);
        rightSphereInteractor.update(controllers.right, rPressed, rReleased);
        rightBtnInteractor.update(controllers.right, rPressed, rReleased);
    }
}

function dispose() {
    leftInteractor.reset();
    rightInteractor.reset();
    leftSphereInteractor.reset();
    rightSphereInteractor.reset();
    leftBtnInteractor.reset();
    rightBtnInteractor.reset();
}

#pragma lifecycle(startup, dispose)

/*
 * Unified Pointer Raycasting
 *
 * Produces one list of "pointers" per frame, normalized so callers don't need
 * to know whether input is coming from the mouse or from XR controllers.
 *
 * Each pointer looks like:
 *   { id, type, raycaster, isPressed(), isReleased() }
 *
 * When an XR session is active, one pointer is returned per XR controller.
 * Otherwise, a single mouse pointer is returned.
 *
 * NOTE: this module starts/stops mouse input itself, but does not start XR
 * input — XRRig.js owns that (it needs XR running for locomotion regardless
 * of raycasting), so an XR session must already be active for XR pointers to
 * show up here.
 */

const PointerType = { Mouse: 'mouse', XR: 'xr' };

function startup() {
    Input.mouse.start();
}

/**
 * Sets the on-screen cursor style. XR pointers have no on-screen cursor, so
 * this only has an effect for the mouse pointer.
 * @param {Object} pointer - a pointer from getPointers()
 * @param {string} style - a CSS cursor value, e.g. 'pointer' or 'default'
 */
function setCursor(pointer, style) {
    if (pointer.type === PointerType.Mouse) renderer.domElement.style.cursor = style;
}

function dispose() {
    Input.mouse.stop();
}

/**
 * @returns {Array} pointers for the current frame
 */
function getPointers() {
    const pointers = [];
    const xrCount  = Input.xr.count();

    if (xrCount > 0) {
        for (let i = 0; i < xrCount; i++) {
            const raycast = Input.xr.raycast(i);
            raycast.raycaster.ray.origin.copy(raycast.position);
            raycast.raycaster.ray.direction.copy(raycast.direction).normalize();

            const hand = Input.xr.handedness(i);

            // Snapshot press/release once per controller per frame — these
            // read edge-triggered engine state, so polling them lazily (only
            // when a given interactor's hit-test passes) means how many times
            // they fire depends on how many interactables are being checked
            // and in what order, letting one controller's edge get consumed
            // before another interactor (or the other hand) ever sees it.
            const pressed  = Input.xr.isButtonPressed(i, 0);
            const released = Input.xr.isButtonReleased(i, 0);

            pointers.push({
                id:         (hand === 'left' || hand === 'right') ? hand : `xr${i}`,
                type:       PointerType.XR,
                handedness: hand,
                raycaster:  raycast.raycaster,
                isPressed:  () => pressed,
                isReleased: () => released,
            });
        }
    } else {
        const mouseRaycast = Input.mouse.raycast(camera);
        const pressed  = Input.mouse.isButtonPressed(MouseButton.Left);
        const released = Input.mouse.isButtonReleased(MouseButton.Left);

        pointers.push({
            id:         'mouse',
            type:       PointerType.Mouse,
            raycaster:  mouseRaycast.raycaster,
            isPressed:  () => pressed,
            isReleased: () => released,
        });
    }

    return pointers;
}

#pragma export (getPointers, PointerType, setCursor);

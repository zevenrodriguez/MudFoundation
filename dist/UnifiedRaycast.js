// AUTO-GENERATED from UnifiedRaycast.js by build.py — edit the source, then rebuild.
//
//   #pragma import(UnifiedRaycast = "<url to this file>")
//   const lib = UnifiedRaycast({ THREE, renderer, camera, Input, MouseButton });
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define([], factory);
    else root.UnifiedRaycast = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    return function UnifiedRaycast(mud) {
        const { THREE, renderer, camera, Input, MouseButton } = mud || {};

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
         * Pointers are read once per frame in update(), and getPointers() hands every
         * caller that same list. XR button edges are consumed when read, so if each
         * Behavior polled them itself, the first one to run each frame would take the
         * click and the rest would never see it. This module must therefore update
         * before any Behavior that calls getPointers().
         *
         * NOTE: this module starts/stops mouse input itself, but does not start XR
         * input — XRRig.js owns that (it needs XR running for locomotion regardless
         * of raycasting), so an XR session must already be active for XR pointers to
         * show up here.
         */

        const PointerType = { Mouse: 'mouse', XR: 'xr' };

        // Input.xr.raycast(i) appears to hand back a pooled/shared raycaster object
        // rather than a fresh one per controller — reusing its reference directly
        // meant every pointer's hit-test could end up testing whichever controller's
        // ray was written to it last that frame. Each hand gets its own persistent
        // THREE.Raycaster here so nothing else can mutate it out from under us.
        const _handRaycasters = new Map();

        // This frame's pointers, rebuilt by update()
        let _pointers = [];

        function raycasterFor(id) {
            let raycaster = _handRaycasters.get(id);
            if (!raycaster) {
                raycaster = new THREE.Raycaster();
                _handRaycasters.set(id, raycaster);
            }
            return raycaster;
        }

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

        function update() {
            _pointers = readPointers();
        }

        function dispose() {
            Input.mouse.stop();
            _pointers = [];
        }

        /**
         * @returns {Array} pointers for the current frame
         */
        function getPointers() {
            return _pointers;
        }

        function readPointers() {
            const pointers = [];
            const xrCount  = Input.xr.count();

            if (xrCount > 0) {
                for (let i = 0; i < xrCount; i++) {
                    const raycast = Input.xr.raycast(i);
                    const hand    = Input.xr.handedness(i);
                    const id      = (hand === 'left' || hand === 'right') ? hand : `xr${i}`;

                    const raycaster = raycasterFor(id);
                    raycaster.ray.origin.copy(raycast.position);
                    raycaster.ray.direction.copy(raycast.direction).normalize();

                    // Snapshot press/release once per controller per frame — these
                    // read edge-triggered engine state, so polling them lazily (only
                    // when a given interactor's hit-test passes) means how many times
                    // they fire depends on how many interactables are being checked
                    // and in what order, letting one controller's edge get consumed
                    // before another interactor (or the other hand) ever sees it.
                    const pressed  = Input.xr.isButtonPressed(i, 0);
                    const released = Input.xr.isButtonReleased(i, 0);

                    pointers.push({
                        id,
                        type:       PointerType.XR,
                        handedness: hand,
                        raycaster,
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

        return { getPointers: getPointers, PointerType: PointerType, setCursor: setCursor, startup: startup, update: update, dispose: dispose };
    };
}));

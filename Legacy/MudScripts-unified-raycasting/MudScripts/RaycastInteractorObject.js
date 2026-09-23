
/**
 * RayInteractor — a stateful, multi-pointer raycast interaction primitive.
 *
 * One interactor is created per target object, and it can be driven by any
 * number of simultaneous pointers — the desktop mouse, the left XR
 * controller, the right XR controller, whatever else shows up later. Each
 * pointer's hover/press state is tracked independently (keyed by
 * `pointerId`), so the same interactor safely handles things like "left
 * hand is hovering but right hand isn't" or "the mouse takes over after the
 * headset comes off" without one pointer's state clobbering another's.
 *
 * This is what lets Raycast.js define each interactive object's behaviour
 * exactly once and simply feed it whichever pointer(s) — mouse or XR
 * controllers — are active this frame.
 *
 * Usage:
 *   const interactor = new RayInteractor(targetObject);
 *   interactor.onEnter = (hit, pointerId) => { ... };
 *   interactor.onHover = (hit, pointerId) => { ... };
 *   interactor.onExit  = (hit, pointerId) => { ... };
 *   interactor.onClick = (hit, pointerId) => { ... };
 *
 *   // In your update loop, once per active pointer:
 *   interactor.update(pointerId, raycast, isPressed, isReleased);
 *
 *   // When a pointer stops existing this frame (mode switch, controller
 *   // disconnect), clear its state so hover/press don't get stuck:
 *   interactor.reset(pointerId);
 */
function RayInteractor(targetObject) {
    this.targetObject = targetObject;

    // Callbacks — assign these after construction. Every callback receives
    // the THREE.js intersection (`hit`) and the id of the pointer that
    // triggered it, e.g. 'mouse', 'left', 'right'.
    this.onEnter = () => {};
    this.onHover = () => {};
    this.onExit  = () => {};
    this.onClick = () => {};

    // Internal state — one entry per pointer currently tracked by this interactor.
    // Map<pointerId, { currentHit: Intersection|null, triggerPressed: boolean }>
    this._pointerStates = new Map();
}

/** @private Lazily creates/returns the per-pointer state bucket. */
RayInteractor.prototype._stateFor = function(pointerId) {
    let state = this._pointerStates.get(pointerId);
    if (!state) {
        state = { currentHit: null, triggerPressed: false };
        this._pointerStates.set(pointerId, state);
    }
    return state;
};

/**
 * Call once per frame, once per active pointer.
 * @param {string}        pointerId  - Stable id for the pointer driving this
 *                                     update (e.g. 'mouse', 'left', 'right').
 * @param {RaycastOutput}  raycast    - The raycast data (has .raycaster)
 * @param {Function}       isPressed  - () => boolean, true while that pointer's button is held
 * @param {Function}       isReleased - () => boolean, true the frame that pointer's button is released
 */
RayInteractor.prototype.update = function(pointerId, raycast, isPressed, isReleased) {
    const state = this._stateFor(pointerId);

    const hits       = raycast.raycaster.intersectObject(this.targetObject, true);
    const isHitting  = hits.length > 0;
    const currentHit = isHitting ? hits[0] : null;
    const wasHitting = state.currentHit !== null;
    const previousHit = state.currentHit;

    // Commit state before firing callbacks, so a callback that inspects
    // isHovered() (to check "is any *other* pointer still on this object")
    // sees this pointer's up-to-date status rather than its stale one.
    state.currentHit = currentHit;

    if (isHitting && !wasHitting) {
        this.onEnter(currentHit, pointerId);
    }

    if (isHitting) {
        this.onHover(currentHit, pointerId);

        if (isPressed() && !state.triggerPressed) {
            state.triggerPressed = true;
        }

        if (isReleased() && state.triggerPressed) {
            this.onClick(currentHit, pointerId);
            state.triggerPressed = false;
        }
    }

    if (!isHitting && wasHitting) {
        this.onExit(previousHit, pointerId);
        state.triggerPressed = false;
    }
};

/**
 * Clear hover/press state for one pointer (pass its id) — e.g. it stopped
 * existing because the app switched from XR to desktop, or a controller
 * disconnected. Call with no arguments to reset every pointer at once,
 * e.g. on dispose. Fires onExit for any pointer that was still hovering,
 * so cursors/highlights never get stuck on.
 */
RayInteractor.prototype.reset = function(pointerId) {
    if (pointerId !== undefined) {
        const state = this._pointerStates.get(pointerId);
        if (state) {
            const hit = state.currentHit;
            this._pointerStates.delete(pointerId);
            if (hit !== null) {
                this.onExit(hit, pointerId);
            }
        }
        return;
    }

    const entries = Array.from(this._pointerStates.entries());
    this._pointerStates.clear();
    entries.forEach(([id, state]) => {
        if (state.currentHit !== null) {
            this.onExit(state.currentHit, id);
        }
    });
};

/** True if any pointer is currently hovering this interactor's target. */
RayInteractor.prototype.isHovered = function() {
    for (const state of this._pointerStates.values()) {
        if (state.currentHit !== null) return true;
    }
    return false;
};

#pragma export (RayInteractor);

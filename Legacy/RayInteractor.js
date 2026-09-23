
/**
 * RayInteractor — tracks hover/press state per pointer, so a single instance
 * can be driven by any number of simultaneous pointers (mouse, left XR
 * controller, right XR controller, ...) without duplicating callbacks per
 * pointer.
 *
 * Usage:
 *   const interactor = new RayInteractor(targetObject);
 *   interactor.onEnter = (hit, pointer) => { ... };
 *   interactor.onHover = (hit, pointer) => { ... }; 
 *   interactor.onExit  = (hit, pointer) => { ... };
 *   interactor.onClick = (hit, pointer) => { ... };
 *
 *   // In your update loop:
 *   interactor.update(pointers); // pointers from UnifiedRaycast.getPointers()
 */
function RayInteractor(targetObject) {
    this.targetObject = targetObject;

    // Callbacks — assign these after construction
    this.onEnter = () => {};
    this.onHover = () => {};
    this.onExit  = () => {};
    this.onClick = () => {};

    // Internal state, keyed by pointer.id
    this._states = new Map();
}

/**
 * Call once per frame with the current pointer list.
 * @param {Array} pointers - pointers this frame, each with .raycaster, .isReleased()
 */
RayInteractor.prototype.update = function(pointers) {
    const seen = new Set();

    for (const pointer of pointers) {
        seen.add(pointer.id);

        const hits       = pointer.raycaster.intersectObject(this.targetObject, true);
        const isHitting  = hits.length > 0;
        const currentHit = isHitting ? hits[0] : null;

        let state = this._states.get(pointer.id);
        if (!state) {
            console.log(`[xr debug] NEW STATE id=${pointer.id} (existing ids: ${[...this._states.keys()].join(',')})`);
            state = { hitting: false, lastHit: null };
            this._states.set(pointer.id, state);
        }

        if (isHitting !== state.hitting || pointer.isReleased()) {
            console.log(`[xr debug] id=${pointer.id} isHitting=${isHitting} wasHitting=${state.hitting} released=${pointer.isReleased()}`);
        }

        if (isHitting && !state.hitting) {
            this.onEnter(currentHit, pointer);
        }

        if (isHitting) {
            this.onHover(currentHit, pointer);

            // Click fires off the release alone — some XR controllers never
            // report a matching press edge (isButtonPressed can be broken
            // per-hand), but the release edge has proven reliable for both.
            if (pointer.isReleased()) {
                this.onClick(currentHit, pointer);
            }
        } else if (state.hitting) {
            // Just left the target this frame. The release edge and the
            // raycast losing the target can land a frame apart (trigger-pull
            // jitter, or a one-frame lag between button state and pose) — if
            // we were hitting a moment ago and the release just fired, still
            // count it rather than silently swallowing the click.
            if (pointer.isReleased()) {
                this.onClick(state.lastHit, pointer);
            }
            this.onExit(state.lastHit, pointer);
        }

        state.hitting = isHitting;
        state.lastHit = currentHit;
    }

    // A pointer that vanished mid-hover (e.g. an XR controller disconnected)
    // still needs its exit callback fired, or the target is left stuck hovered.
    for (const [id, state] of this._states) {
        if (seen.has(id)) continue;
        if (state.hitting) this.onExit(state.lastHit, { id });
        this._states.delete(id);
    }
};

/** Manually reset all hover/press state (e.g. when the object is disabled). */
RayInteractor.prototype.reset = function() {
    for (const [id, state] of this._states) {
        if (state.hitting) this.onExit(state.lastHit, { id });
    }
    this._states.clear();
};

#pragma export (RayInteractor);

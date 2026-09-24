#pragma import(RayInteractor  = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@3000fde/dist/RayInteractor.js")
#pragma import(XRRig          = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@3000fde/dist/XRRig.js")
#pragma import(UnifiedRaycast = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@3000fde/dist/UnifiedRaycast.js")
#pragma import(MudGui         = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@3000fde/dist/MudGui.js")

#pragma lifecycle(startup, update, dispose)

/*
 * MUD Modules
 *
 * Loads the MudFoundation modules once and shares them with every other
 * Behavior in the scene:
 *
 *   #pragma import (ray, rig, input, gui)
 *
 *   ray   — RayInteractor   new ray.RayInteractor(object)
 *   rig   — XRRig           XR input, controller ray lines, locomotion
 *   input — UnifiedRaycast  input.getPointers(), input.setCursor(pointer, style)
 *   gui   — MudGui          gui.MudText({...}), gui.MudButton({...})
 *
 * The dynamically imported modules' lifecycle hooks aren't run by the
 * runtime, so this Behavior runs them. It must execute before any Behavior
 * that imports from it — place it first in the hierarchy or give it the
 * lowest executionIndex.
 */

// ─── Modules ──────────────────────────────────────────────────────────────────
const ray   = RayInteractor({});
const rig   = XRRig({ THREE, scene, camera, Input, avatarRig, avatarPOV });
const input = UnifiedRaycast({ THREE, renderer, camera, Input, MouseButton });
const gui   = MudGui({ THREE, scene, renderer, RayInteractor: ray.RayInteractor });

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {
    rig.startup();
    input.startup();
}

function update(delta) {
    rig.update(delta);
}

function dispose() {
    input.dispose();
    rig.dispose();
    renderer.domElement.style.cursor = 'default';
}

#pragma export (ray, rig, input, gui)

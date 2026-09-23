#pragma import (MudText, MudButton)
#pragma lifecycle(dispose)


/*
 * Interactable Objects Module
 *
 * This module owns the scene registry only — it does not raycast or drive
 * any hover/click behaviour itself. It:
 * 1. Finds objects in the scene
 * 2. Stores them in Maps for easy access
 * 3. Builds the GUI elements (MudText/MudButton)
 *
 * Raycast.js is what actually interacts with these objects — for both the
 * desktop mouse and XR controllers — by importing the maps below and
 * attaching a RayInteractor to whichever ones need hover/click behaviour.
 */


// ─── Store Objects in Maps ───────────────────────────────────────────────────
// Maps are like dictionaries - they store key-value pairs
// We store the objects so other modules can get them by name


// ─── Get Objects from the Scene ───────────────────────────────────────────────
// Find the 3D objects (things you can click/interact with)
const cube = cast(scene.getObjectByName("cube"), THREE.Object3D);
const sphere = cast(scene.getObjectByName("sphere"), THREE.Object3D);


/**
 * Map of clickable/raycastable objects
 * Access with: RaycastObjects.get("cube") or RaycastObjects.get("sphere")
 */
const RaycastObjects = new Map();
RaycastObjects.set("cube", cube);
RaycastObjects.set("sphere", sphere);


// Find the UI panels (text displays that show/hide)
const cubeTextPanel = cast(scene.getObjectByName("cubeText"), THREE.Object3D);
const sphereTextPanel = cast(scene.getObjectByName("sphereText"), THREE.Object3D);

/**
 * Map of UI panels that can be toggled on/off
 * Access with: ToggleObjects.get("cubeText") or ToggleObjects.get("sphereText")
 */
const ToggleObjects = new Map();
ToggleObjects.set("cubeText", cubeTextPanel);
ToggleObjects.set("sphereText", sphereTextPanel);

// ─── Initialize ──────────────────────────────────────────────────────────────
// Hide the text panels when the scene starts

cubeTextPanel.visible = false;
sphereTextPanel.visible = false;

// ─── Create GUI elements ──────────────────────────────────────────────────────
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

// ─── Info panel (hidden by default) ──────────────────────────────────────────
const infoPanel = MudText({
    sceneMesh:       cast(scene.getObjectByName("infoPanel"), THREE.Mesh),
    text:            'Hello from MudGUI! Hello from MudGUI! Hello from MudGUI! Hello from MudGUI! ',
    textColor:       '#ffffff',
    backgroundColor: '#1a3a1a',
    borderColor:     '#44aa44',
});

infoPanel.mesh.visible = false;

// ─── Store in map for shared access ──────────────────────────────────────────
const GUIElements = new Map();
GUIElements.set("statusLabel", statusLabel);
GUIElements.set("actionButton", actionButton);
GUIElements.set("infoPanel",    infoPanel);


// ─── Dispose ──────────────────────────────────────────────────────────────────
// Called automatically by MUD when leaving the verse.
// Cleans up all GUI elements so they don't persist across verse transitions.
function dispose() {
    GUIElements.forEach(function(element) {
        if (element && typeof element.dispose === 'function') {
            element.dispose();
        }
    });
    GUIElements.clear();
}

#pragma export (RaycastObjects, ToggleObjects, GUIElements);


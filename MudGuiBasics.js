#pragma import (gui, input)
#pragma lifecycle(startup, update, dispose)

/*
 * Button Toggle Text Example
 *
 * A MudButton that shows and hides a MudText panel. The button's label
 * changes to match what the next click will do.
 *
 * Scene setup: two planes, named "toggleButton" and "infoText", placed where
 * the button and the panel should appear. MudGui hides the planes and draws
 * its panels in their place.
 *
 * Requires the MudModules Behavior to run first.
 */

// ─── Panels ───────────────────────────────────────────────────────────────────
const infoText = gui.MudText({
    sceneMesh: scene.getObjectByName("infoText"),
    text:      'Hello! This panel is toggled by the button.',
    fontSize:  40,
});

const toggleButton = gui.MudButton({
    sceneMesh: scene.getObjectByName("toggleButton"),
    text:      'Hide info',
});

// ─── Toggle ───────────────────────────────────────────────────────────────────
toggleButton.onClick = () => {
    if (infoText.mesh.visible == true) {
        infoText.mesh.visible = false;
        toggleButton.setText('Show info');
    } else {
        infoText.mesh.visible = true;
        toggleButton.setText('Hide info');
    }

    // setText redraws in the normal colors — the pointer is still on the
    // button, so put the hover highlight back
    toggleButton.hover();

    console.log('[MudGuiBasics] infoText visible:', infoText.mesh.visible);
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────
function startup() {}

function update() {
    toggleButton.update(input.getPointers());
}

function dispose() {
    toggleButton.dispose();
    infoText.dispose();
}

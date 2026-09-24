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
// Every option is listed below with its default value. All of them are
// optional — leave out any you don't need to change.

const infoText = gui.MudText({
    sceneMesh:       scene.getObjectByName("infoText"), // default: null — editor object to take position, rotation and size from
    text:            'Hello! This panel is toggled by the button.', // default: ''
    width:           0.4,        // meters — ignored when sceneMesh is set
    height:          0.15,       // meters — ignored when sceneMesh is set
    resolution:      512,        // canvas width in pixels; raise it if text looks blurry
    fontSize:        40,         // default: 48 — canvas pixels
    fontFamily:      'Arial',
    textColor:       '#ffffff',
    backgroundColor: '#222222',
    borderColor:     '#555555',
    borderWidth:     6,          // canvas pixels; 0 for no border
    borderRadius:    24,         // corner rounding, canvas pixels
});

// A button takes every MudText option above, with its own defaults for the
// colors, plus the hover colors.
const toggleButton = gui.MudButton({
    sceneMesh:            scene.getObjectByName("toggleButton"),
    text:                 'Show info',
    width:                0.4,
    height:               0.15,
    resolution:           512,
    fontSize:             48,
    fontFamily:           'Arial',
    textColor:            '#ffffff',
    backgroundColor:      '#2255cc',
    hoverBackgroundColor: '#4477ff',
    borderColor:          '#99bbff',
    hoverBorderColor:     '#ffffff',
    borderWidth:          6,
    borderRadius:         24,
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
function startup() {
    infoText.mesh.visible = false;
}

function update() {
    toggleButton.update(input.getPointers());
}

function dispose() {
    toggleButton.dispose();
    infoText.dispose();
}

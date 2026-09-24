# MudFoundation

Reusable scripts for MUD XR Creator: ray interaction that works the same with a mouse or XR controllers, XR locomotion, and 3D text and buttons.

| Module | What it does |
| --- | --- |
| `RayInteractor` | Hover, exit, and click callbacks for any object in the scene |
| `UnifiedRaycast` | One list of pointers per frame — the mouse on desktop, one per controller in XR |
| `XRRig` | Starts XR input, draws the controller rays, and moves the player with the left thumbstick |
| `MudGui` | `MudText` panels and clickable `MudButton`s |

The modules are loaded once by a `MudModules` Behavior and shared with the rest of your scene. Add it before anything else; [Part 3](#part-3-mudmodules) explains how it works.

---

## Part 1: Making an object interactive

[cubeInteraction.js](cubeInteraction.js) makes a cube clickable: hovering shows a pointer cursor, and clicking shows or hides a text panel. Everything below works with the mouse and with either XR controller, with no extra code.

### Scene setup

1. Add a `MudModules` Behavior at the top of the hierarchy ([Part 3](#part-3-mudmodules)).
2. Add a cube named `cube` and a text object named `cubeText`.
3. Add a Behavior and paste in `cubeInteraction.js`.

### 1. Import what you need

```js
#pragma import (ray, input)
#pragma lifecycle(startup, update, dispose)
```

`ray` gives you the `RayInteractor` class and `input` gives you the pointers. Both come from `MudModules`.

### 2. Find your scene objects

```js
const cube          = cast(scene.getObjectByName("cube"), THREE.Object3D);
const cubeTextPanel = cast(scene.getObjectByName("cubeText"), THREE.Object3D);

cubeTextPanel.visible = false;
```

The names must match the object names in the hierarchy exactly.

### 3. Create an interactor and give it callbacks

```js
const cubeInteractor = new ray.RayInteractor(cube);

cubeInteractor.onEnter = (_hit, pointer) => {
    input.setCursor(pointer, 'pointer');
};
cubeInteractor.onExit = (_hit, pointer) => {
    input.setCursor(pointer, 'default');
};
cubeInteractor.onClick = (_hit) => {
    cubeTextPanel.visible = !cubeTextPanel.visible;
};
```

A `RayInteractor` watches one object, including its children. Assign any of these callbacks; the ones you leave out do nothing.

| Callback | Fires when |
| --- | --- |
| `onEnter(hit, pointer)` | A pointer starts pointing at the object |
| `onHover(hit, pointer)` | Every frame a pointer is on the object |
| `onExit(hit, pointer)` | A pointer moves off the object |
| `onClick(hit, pointer)` | The mouse button or trigger is released while on the object |

- `hit` is the Three.js intersection: `hit.object` is the mesh that was hit, `hit.point` is where.
- `pointer` says which input did it: `pointer.id` is `'mouse'`, `'left'` or `'right'`.
- `input.setCursor` changes the mouse cursor; for XR controllers it does nothing, so it's safe to call either way.

Each pointer is tracked separately, so both controllers can hover the same object at once and each gets its own enter and exit.

### 4. Update it every frame, and reset it on dispose

```js
function update() {
    cubeInteractor.update(input.getPointers());
}

function dispose() {
    cubeInteractor.reset();
}
```

The interactor only checks for hovers and clicks when you call `update`. `reset` fires `onExit` for anything still hovered, so objects aren't left stuck in their hover state.

### Adding more objects

Create one `RayInteractor` per object and update each one with the same pointer list:

```js
function update() {
    const pointers = input.getPointers();
    cubeInteractor.update(pointers);
    sphereInteractor.update(pointers);
}
```

`MudModules` reads the mouse and controllers once at the start of each frame, and `getPointers()` returns that same list to every Behavior that asks. That way a trigger release reaches every button and object, not just the first Behavior to check.

---

## Part 2: MudGui — text and buttons

`MudGui` draws text onto flat panels in 3D space. `MudText` shows text; `MudButton` is a `MudText` that highlights on hover and can be clicked. Import `gui` to use them:

```js
#pragma import (gui, input)
```

### Placing panels

There are two ways to position a panel.

**From the editor (recommended).** Add a plane where you want the panel and pass it as `sceneMesh`. MudGui uses the plane's position, rotation and size, hides the plane, and puts the panel in its place:

```js
const title = gui.MudText({
    sceneMesh: scene.getObjectByName("titlePlane"),
    text:      'Welcome',
});
```

The panel's width and height come from the plane's size along X and Y, so the plane should face forward (along Z) before you rotate it.

**From code.** Leave out `sceneMesh`, give a size in meters, and add the mesh yourself:

```js
const title = gui.MudText({ text: 'Welcome', width: 0.4, height: 0.15 });
title.mesh.position.set(0, 1.5, -1);
scene.add(title.mesh);
```

### MudText

```js
const label = gui.MudText({
    sceneMesh: scene.getObjectByName("scoreLabel"),
    text:      'Score: 0',
    fontSize:  64,
});

label.setText('Score: 10');
```

Long text wraps onto several lines and is centered. `setText` redraws the panel, so call it only when the text changes, not every frame.

| Option | Default | |
| --- | --- | --- |
| `sceneMesh` | `null` | Editor object to take the position and size from |
| `text` | `''` | |
| `width`, `height` | `0.4`, `0.15` | Size in meters, when there's no `sceneMesh` |
| `fontSize` | `48` | In canvas pixels |
| `fontFamily` | `'Arial'` | |
| `textColor` | `'#ffffff'` | |
| `backgroundColor` | `'#222222'` | |
| `borderColor` | `'#555555'` | |
| `borderWidth` | `6` | In canvas pixels; `0` for no border |
| `borderRadius` | `24` | Corner rounding, in canvas pixels |
| `resolution` | `512` | Canvas width in pixels; raise it if text looks blurry |

It returns `{ mesh, setText(text), dispose() }`. Call `dispose()` from your Behavior's `dispose` to remove the panel from the scene. Otherwise every run of the script adds another panel, and old copies pile up in the same spot.

### MudButton

A button takes every `MudText` option, plus hover colors:

| Option | Default |
| --- | --- |
| `backgroundColor` | `'#2255cc'` |
| `hoverBackgroundColor` | `'#4477ff'` |
| `borderColor` | `'#99bbff'` |
| `hoverBorderColor` | `'#ffffff'` |

Set `onClick`, then update the button every frame with the pointers, just like a `RayInteractor`:

```js
#pragma import (gui, input)
#pragma lifecycle(startup, update, dispose)

const infoPanel = gui.MudText({
    sceneMesh: scene.getObjectByName("infoPlane"),
    text:      'Clicked 0 times',
});

const button = gui.MudButton({
    sceneMesh: scene.getObjectByName("buttonPlane"),
    text:      'Click me',
});

let clicks = 0;
button.onClick = () => {
    clicks++;
    infoPanel.setText(`Clicked ${clicks} times`);
};

function startup() {}

function update() {
    button.update(input.getPointers());
}

function dispose() {
    button.dispose();
    infoPanel.dispose();
}
```

The button returns:

| | |
| --- | --- |
| `mesh` | The panel mesh |
| `setText(text)` | Change the label |
| `onClick(hit, pointer)` | Assign this to handle clicks |
| `update(pointers)` | Call every frame |
| `reset()` | Clear the hover state, e.g. when hiding the button |
| `dispose()` | Remove the button from the scene; call it in your Behavior's `dispose` |
| `hover()`, `unhover()` | Force the hover look on or off |

To hide a button, set `button.mesh.visible = false` and call `button.reset()`. Rays still hit hidden objects, so also skip `button.update(...)` while it's hidden.

---

## Part 3: MudModules

[MudModules.js](MudModules.js) loads the modules from this repository and shares them with the rest of your scene. Add it once, as its own Behavior.

```js
#pragma import(RayInteractor  = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@d5c718f/dist/RayInteractor.js")
#pragma import(XRRig          = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@d5c718f/dist/XRRig.js")
#pragma import(UnifiedRaycast = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@d5c718f/dist/UnifiedRaycast.js")
#pragma import(MudGui         = "https://cdn.jsdelivr.net/gh/zevenrodriguez/MudFoundation@d5c718f/dist/MudGui.js")

const ray   = RayInteractor({});
const rig   = XRRig({ THREE, scene, camera, Input, avatarRig, avatarPOV });
const input = UnifiedRaycast({ THREE, renderer, camera, Input, MouseButton });
const gui   = MudGui({ THREE, scene, renderer, RayInteractor: ray.RayInteractor });

#pragma export (ray, rig, input, gui)
```

It does three things:

1. **Loads the modules from the web.** The URL form of `#pragma import` ([MUD docs: dynamic imports](https://docs.mud.foundation/Advance%20Documentation/dynamic-import)) downloads each file when the scene starts, so you don't paste the modules into every project.
2. **Sets each module up.** A loaded module can't see MUD's built-in objects on its own, so each one is a function you call with the objects it needs (`THREE`, `scene`, `Input`, ...). The result is what gets exported.
3. **Runs their startup, update and dispose.** MUD doesn't call lifecycle hooks for loaded modules, so `MudModules` calls them from its own: it starts XR and mouse input, moves the player each frame, and stops input when the scene closes. Because this happens only here, it runs once per frame no matter how many Behaviors import the modules.

Any Behavior can then use them with a normal import:

```js
#pragma import (ray, input, gui)
```

| Export | Use it for |
| --- | --- |
| `ray` | `new ray.RayInteractor(object)` |
| `input` | `input.getPointers()`, `input.setCursor(pointer, style)`, `input.PointerType` |
| `gui` | `gui.MudText({...})`, `gui.MudButton({...})` |
| `rig` | Controller ray lines and locomotion; usually you don't need to touch it |

### It must run first

MUD needs an export to exist before anything imports it. Put `MudModules` above every other Behavior in the hierarchy, or give it the lowest `executionIndex`. If another Behavior reports that `ray`, `input` or `gui` is undefined, this is the cause.

### Updating the modules

The URLs are pinned to a commit (`@d5c718f`). The headset's browser keeps downloaded files for up to 7 days, so a link like `@main` can keep running old code after you push a fix. A new commit hash is a new link, so it always loads fresh.

The files in `dist/` are generated from the source files in the repository root. To change a module:

1. Edit the source file, e.g. `UnifiedRaycast.js`.
2. Run `python build.py` to regenerate `dist/`.
3. Commit and push both.
4. Change the `@<hash>` in `MudModules.js` to the new commit hash (`git log -1 --format=%h`).

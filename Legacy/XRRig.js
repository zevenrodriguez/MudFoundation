#pragma lifecycle(startup, update, dispose)

// ─── Constants ────────────────────────────────────────────────────────────────
const MOVE_SPEED = 2.0;
const RAY_LENGTH = 15;

// ─── Scratch vector — reused every frame to avoid allocation ─────────────────
const _move = new THREE.Vector3();
const rayEndPosition = new THREE.Vector3();

// ─── XR ray lines ─────────────────────────────────────────────────────────────
let leftRay = null;
let rightRay = null;

function makeRayLine(color = 0x0000ff, length = RAY_LENGTH) {
    if (!scene) {
        console.error("Scene not initialized");
        return null;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -length)
    ]);

    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;

    scene.add(line);

    return { line, length };
}

function updateRayLine(rayLine, raycast) {
    if (!rayLine || !raycast) return;

    raycast.raycaster.ray.origin.copy(raycast.position);
    raycast.raycaster.ray.direction.copy(raycast.direction).normalize();

    rayEndPosition
        .copy(raycast.direction)
        .normalize()
        .multiplyScalar(rayLine.length)
        .add(raycast.position);

    const positions = rayLine.line.geometry.attributes.position;
    positions.setXYZ(0, raycast.position.x, raycast.position.y, raycast.position.z);
    positions.setXYZ(1, rayEndPosition.x, rayEndPosition.y, rayEndPosition.z);
    positions.needsUpdate = true;
}

function startup() {
    Input.xr.start();

    leftRay  = makeRayLine(0x0000FF);
    rightRay = makeRayLine(0xFF0000);
}

function update(delta) {
    if (Input.xr.count() < 1) {
        if (leftRay?.line) leftRay.line.visible = false;
        if (rightRay?.line) rightRay.line.visible = false;
        return;
    }

    if (leftRay?.line) leftRay.line.visible = false;
    if (rightRay?.line) rightRay.line.visible = false;

    for (let i = 0; i < Input.xr.count(); i++) {
        const raycast = Input.xr.raycast(i);

        if (Input.xr.handedness(i) === 'left' && leftRay) {
            leftRay.line.visible = true;
            updateRayLine(leftRay, raycast);
        }

        if (Input.xr.handedness(i) === 'right' && rightRay) {
            rightRay.line.visible = true;
            updateRayLine(rightRay, raycast);
        }

        if (Input.xr.handedness(i) !== 'left') continue;

        const axes = Input.xr.axes(i);
        if (!axes || axes.length < 4) continue;

        const strafe  = axes[2];  // left/right
        const forward = axes[3];  // forward/back

        if (strafe === 0 && forward === 0) continue;

        // Build a flat movement vector in camera-relative space
        _move.set(
            -strafe  * MOVE_SPEED * delta,
             0,
            -forward * MOVE_SPEED * delta
        );

        // Rotate by the headset/POV orientation so forward is where you're looking
        _move.applyQuaternion(avatarPOV.quaternion);

        // Keep movement flat — no flying up/down
        _move.y = 0;

        avatarRig.position.add(_move);
    }
}

function dispose() {
    Input.xr.stop();

    if (leftRay?.line)  scene?.remove(leftRay.line);
    if (rightRay?.line) scene?.remove(rightRay.line);
}

#pragma export (makeRayLine, updateRayLine)


#pragma lifecycle(startup, dispose)

/*
 * SplatLoader — simple Gaussian splat loader for XR Creator.
 *
 * 1. Name the object the splat's floor should sit on "splatAnchor" — your walkable plane,
 *    or an empty object on the ground. Only its position is used.
 * 2. Attach a Behavior anywhere and paste this file.
 * 3. Set SPLAT_URL and ANCHOR_NAME below, then Play.
 *
 * Supports .spz, .ply, .splat, .ksplat (URL must allow CORS).
 *
 * How it works (and why):
 *  - `#pragma import` runs URLs as classic scripts, but Spark only ships ES-module /
 *    CommonJS builds → we download Spark's CommonJS build as text and run it with
 *    the runtime's own THREE handed in as require("three") (one copy of three.js).
 *  - Behaviors run in a sandbox without `fetch` (and possibly Worker/Blob). Spark
 *    needs those, so we run Spark in the real page window (reached through the
 *    renderer's canvas). If that's blocked, we fall back to MUD's HttpRequest API.
 *  - We download the splat file ourselves and hand Spark the bytes.
 *  - Spark 0.1.10 on purpose: Spark 2.x needs three r180+, the MUD runtime is r173.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
//const SPLAT_URL    = "https://sparkjs.dev/assets/splats/butterfly.spz";
const SPLAT_URL    = "https://www.zevenrodriguez.com/MudFoundation/desertroom.spz";

const ANCHOR_NAME  = "splatAnchor";  // empty object placed in the editor
const FLIP_UPRIGHT = true;           // most captures load upside-down; set false if yours doesn't

// Floor alignment: find the walkable floor in the splat, level it against world up, and
// put it at the anchor's position (the anchor can be your walkable plane). Only the
// anchor's position is used — its rotation/scale are ignored, so a plane rotated to
// lie flat doesn't tip the splat on its side.
const ALIGN_TO_FLOOR   = true;
const YAW_DEGREES      = 0;          // spin the splat around world up to face it the way you want
const CENTER_ON_ANCHOR = true;       // also move the floor's middle to the anchor (x/z); false keeps x/z as captured
const FLOOR_OFFSET     = 0;          // extra lift (splat units) if feet sink in or float
const MAX_FLOOR_TILT   = 30;         // degrees; how crooked the capture's floor may be
const FLOOR_TOLERANCE  = 0.005;      // inlier band, as a fraction of the splat's size
const MAX_BELOW_FLOOR  = 0.1;        // a floor has at most this fraction of splats under it (rules out ceilings/tables)
const MAX_SAMPLES      = 60000;      // splats sampled for the fit

const SPARK_URL = "https://cdn.jsdelivr.net/npm/@sparkjsdev/spark@0.1.10/dist/spark.cjs.min.js";
const TIMEOUT_MS = 120000;           // big splat files can take a while

// ─── State ────────────────────────────────────────────────────────────────────
let sparkRenderer = null;
let splat         = null;
let anchor        = null;
let disposed      = false;

function log(msg)  { console.log("[SplatLoader] " + msg); }
function warn(msg) { console.warn("[SplatLoader] " + msg); }

// ─── Real page window (has fetch, Worker, Blob…) if the sandbox lets us reach it
function getPageWindow() {
    try {
        const win = renderer.domElement.ownerDocument.defaultView;
        if (win && typeof win.fetch === "function") {
            return win;
        }
    } catch (e) {
        // fall through
    }
    return null;
}

const pageWindow = getPageWindow();

// fetch-compatible function: real fetch if available, else MUD's HttpRequest
// (HttpRequest.get resolves to a standard Response object).
function httpFetch(input) {
    const url = (typeof input === "string") ? input : String(input && (input.url || input.href || input));
    if (pageWindow) {
        return pageWindow.fetch(url);
    }
    return HttpRequest.get(url, { timeout: TIMEOUT_MS });
}

// Try each way of reaching a URL until one works:
//   1. direct            (blocked if the page's CSP connect-src doesn't list the host)
//   2. SURL(url)         (MUD's link proxy — allowed by the CSP)
//   3. HttpRequest(SURL) (MUD's own HTTP API)
function download(url, kind) {
    const attempts = [
        { name: "direct",      run: function () { return httpFetch(url); } },
        { name: "SURL proxy",  run: function () { return httpFetch(SURL(url)); } },
        { name: "HttpRequest", run: function () { return HttpRequest.get(SURL(url), { timeout: TIMEOUT_MS }); } }
    ];

    function tryAt(i, lastError) {
        if (i >= attempts.length) {
            return Promise.reject(new Error("all download routes failed for " + url + " (last: " + lastError + ")"));
        }
        return attempts[i].run()
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("HTTP " + res.status);
                }
                log(kind + " downloaded via " + attempts[i].name);
                return kind === "text" ? res.text() : res.arrayBuffer();
            })
            .catch(function (e) {
                warn(kind + " via " + attempts[i].name + " failed: " + e);
                return tryAt(i + 1, e);
            });
    }
    return tryAt(0, null);
}

function downloadText(url)  { return download(url, "text"); }
function downloadBytes(url) { return download(url, "bytes"); }

// Run Spark's CommonJS build with THREE injected. `fetch` is passed in as a
// parameter so Spark's internal fetch (used to start its WASM) works either way.
function loadSpark() {
    return downloadText(SPARK_URL).then(function (code) {
        const module  = { exports: {} };
        const require = function (name) {
            if (name === "three") {
                return THREE;
            }
            // "url" is only used on Spark's Node code path; stub it just in case.
            return {
                pathToFileURL: function (p) {
                    return { href: String(p) };
                }
            };
        };
        // Function constructor = CommonJS wrapper (page CSP allows 'unsafe-eval').
        // Prefer the page window's Function so Spark sees real Worker/Blob/URL globals.
        const Wrapper = pageWindow ? pageWindow.Function : Function;
        const run = Wrapper("module", "exports", "require", "fetch", code);
        run(module, module.exports, require, httpFetch);
        return module.exports;
    });
}

// ─── Floor alignment ──────────────────────────────────────────────────────────
// Sample splat centers (already rotated by `preRotation`) as a flat xyz array.
function samplePoints(mesh, preRotation) {
    const total  = mesh.packedSplats.numSplats || 0;
    const stride = Math.max(1, Math.floor(total / MAX_SAMPLES));
    const pts = [];
    const v = new THREE.Vector3();
    mesh.forEachSplat(function (i, center, scales, quaternion, opacity) {
        if (i % stride !== 0 || opacity < 0.3) {
            return;
        }
        v.copy(center).applyQuaternion(preRotation);
        pts.push(v.x, v.y, v.z);
    });
    return new Float32Array(pts);
}

// RANSAC for the walkable floor: the near-horizontal plane with the most splats
// on it and (almost) none below it. Returns { normal, centroid, inliers } or null.
function findFloor(pts) {
    const count = pts.length / 3;
    if (count < 3) {
        return null;
    }
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
        box.expandByPoint(p.set(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]));
    }
    const thresh  = Math.max(box.getSize(p).length() * FLOOR_TOLERANCE, 1e-4);
    const minUp   = Math.cos(MAX_FLOOR_TILT * Math.PI / 180);
    const evalN   = Math.min(count, 4000);
    const evalIdx = new Uint32Array(evalN);
    for (let i = 0; i < evalN; i++) {
        evalIdx[i] = Math.floor(Math.random() * count);
    }

    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const n = new THREE.Vector3();
    let best = null;
    for (let iter = 0; iter < 500; iter++) {
        const i0 = Math.floor(Math.random() * count) * 3;
        const i1 = Math.floor(Math.random() * count) * 3;
        const i2 = Math.floor(Math.random() * count) * 3;
        a.set(pts[i0], pts[i0 + 1], pts[i0 + 2]);
        b.set(pts[i1], pts[i1 + 1], pts[i1 + 2]).sub(a);
        c.set(pts[i2], pts[i2 + 1], pts[i2 + 2]).sub(a);
        n.crossVectors(b, c);
        if (n.lengthSq() < 1e-12) {
            continue;
        }
        n.normalize();
        if (n.y < 0) {
            n.negate();
        }
        if (n.y < minUp) {
            continue;
        }
        const d = -n.dot(a);
        let inliers = 0, below = 0;
        for (let k = 0; k < evalN; k++) {
            const j = evalIdx[k] * 3;
            const dist = n.x * pts[j] + n.y * pts[j + 1] + n.z * pts[j + 2] + d;
            if (Math.abs(dist) < thresh) {
                inliers++;
            } else if (dist < 0) {
                below++;
            }
        }
        if (below > evalN * MAX_BELOW_FLOOR) {
            continue;
        }
        if (!best || inliers > best.inliers) {
            best = { normal: n.clone(), d: d, inliers: inliers };
        }
    }
    if (!best) {
        return null;
    }

    // Refine with least squares y = ax + bz + e over every inlier.
    let N = 0, sx = 0, sy = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sxy = 0, szy = 0;
    for (let i = 0; i < count; i++) {
        const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
        const dist = best.normal.x * x + best.normal.y * y + best.normal.z * z + best.d;
        if (Math.abs(dist) >= thresh) {
            continue;
        }
        N++; sx += x; sy += y; sz += z;
        sxx += x * x; sxz += x * z; szz += z * z; sxy += x * y; szy += z * y;
    }
    const centroid = new THREE.Vector3(sx / N, sy / N, sz / N);
    const m = new THREE.Matrix3().set(sxx, sxz, sx, sxz, szz, sz, sx, sz, N);
    let normal = best.normal;
    if (Math.abs(m.determinant()) > 1e-9) {
        const coef = new THREE.Vector3(sxy, szy, sy).applyMatrix3(m.invert());
        normal = new THREE.Vector3(-coef.x, 1, -coef.y).normalize();
    }
    return { normal: normal, centroid: centroid, inliers: N };
}

// World-space position of the anchor (the splat lives at scene root, not under it).
function anchorWorldPosition() {
    anchor.updateWorldMatrix(true, false);
    return anchor.getWorldPosition(new THREE.Vector3());
}

function yawQuaternion() {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW_DEGREES * Math.PI / 180);
}

function flipQuaternion() {
    const flip = new THREE.Quaternion();
    if (FLIP_UPRIGHT) {
        flip.set(1, 0, 0, 0);
    }
    return flip;
}

// Level the splat on its floor and put the floor at the anchor's position.
function alignToFloor(mesh) {
    const flip = flipQuaternion();
    const yaw  = yawQuaternion();
    const pts = samplePoints(mesh, flip);
    const floor = findFloor(pts);
    const level = new THREE.Quaternion();
    let base;
    if (floor) {
        level.setFromUnitVectors(floor.normal, new THREE.Vector3(0, 1, 0));
        base = floor.centroid.clone().applyQuaternion(level);
        const tilt = Math.acos(Math.min(1, floor.normal.y)) * 180 / Math.PI;
        log("floor found: " + floor.inliers + " of " + (pts.length / 3) + " sampled splats, tilt " + tilt.toFixed(1) + "°");
    } else {
        // No clear floor: sit the lowest ~2% of splats on the anchor instead.
        const ys = new Float32Array(pts.length / 3);
        let cx = 0, cz = 0;
        for (let i = 0; i < ys.length; i++) {
            ys[i] = pts[i * 3 + 1];
            cx += pts[i * 3];
            cz += pts[i * 3 + 2];
        }
        ys.sort();
        base = new THREE.Vector3(cx / (ys.length || 1), ys.length ? ys[Math.floor(ys.length * 0.02)] : 0, cz / (ys.length || 1));
        warn("no floor plane found, using the bottom of the splat");
    }

    mesh.quaternion.copy(yaw).multiply(level).multiply(flip);
    mesh.position.set(
        CENTER_ON_ANCHOR ? -base.x : 0,
        -base.y + FLOOR_OFFSET,
        CENTER_ON_ANCHOR ? -base.z : 0
    ).applyQuaternion(yaw).add(anchorWorldPosition());
    const q = mesh.quaternion, pos = mesh.position;
    log("aligned: position (" + pos.x.toFixed(3) + ", " + pos.y.toFixed(3) + ", " + pos.z.toFixed(3) + ")" +
        ", quaternion (" + q.x.toFixed(4) + ", " + q.y.toFixed(4) + ", " + q.z.toFixed(4) + ", " + q.w.toFixed(4) + ")");
}

function startup() {
    log("THREE.REVISION = " + THREE.REVISION + ", page window " + (pageWindow ? "found" : "NOT found (using HttpRequest)"));

    anchor = scene.getObjectByName(ANCHOR_NAME);
    if (!anchor) {
        warn("no object named '" + ANCHOR_NAME + "', adding splat to scene root");
        anchor = scene;
    }

    log("SURL(spark) = " + SURL(SPARK_URL));

    Promise.all([loadSpark(), downloadBytes(SPLAT_URL)])
        .then(function (results) {
            const Spark = results[0];
            const bytes = results[1];
            if (disposed) {
                return;
            }
            log("Spark loaded, splat file " + Math.round(bytes.byteLength / 1024) + " KB");

            sparkRenderer = new Spark.SparkRenderer({ renderer: renderer });
            scene.add(sparkRenderer);

            splat = new Spark.SplatMesh({
                fileBytes: new Uint8Array(bytes),
                fileName: SPLAT_URL,          // lets Spark detect the format from the extension
                onLoad: function (mesh) {
                    log("splat ready: " + SPLAT_URL);
                    if (ALIGN_TO_FLOOR && !disposed) {
                        try {
                            alignToFloor(mesh);
                        } catch (e) {
                            warn("floor alignment failed: " + e);
                        }
                    }
                }
            });
            // Added to the scene root (not the anchor) so the anchor's rotation/scale
            // can't tip the splat; alignToFloor() refines this once the splat loads.
            splat.quaternion.copy(yawQuaternion()).multiply(flipQuaternion());
            splat.position.copy(anchorWorldPosition());
            scene.add(splat);
        })
        .catch(function (e) {
            warn("failed: " + e);
            if (e && e.stack) {
                console.warn(e.stack);
            }
        });
}

function dispose() {
    disposed = true;
    if (splat) {
        scene.remove(splat);
        if (typeof splat.dispose === "function") {
            splat.dispose();
        }
    }
    if (sparkRenderer) {
        scene.remove(sparkRenderer);
        if (typeof sparkRenderer.dispose === "function") {
            sparkRenderer.dispose();
        }
    }
    splat = null;
    sparkRenderer = null;
}
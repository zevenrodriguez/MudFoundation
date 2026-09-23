"""
Builds URL-importable versions of the MudFoundation modules into dist/.

The source files are MUD Behavior scripts: they use #pragma import/export/
lifecycle, which only the XR Creator preprocessor understands. A dynamic
import (#pragma import(Name = "URL")) loads the URL as a plain JavaScript
library, so the #pragma lines are a syntax error there. This script:

  - strips the #pragma lines,
  - wraps each module in a factory that receives the MUD globals it uses
    (THREE, scene, Input, ...) and the modules it imports,
  - returns the exports plus its lifecycle hooks (startup/update/dispose),
    which the importing Behavior calls itself,
  - exposes the factory UMD-style (CommonJS / AMD / global), like Moment.js.

Usage:  python build.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
MODULES = ["RayInteractor", "UnifiedRaycast", "XRRig", "MudGui"]

# Globals the XR Creator scripting runtime provides to Behaviors.
MUD_GLOBALS = [
    "THREE", "scene", "renderer", "camera", "Input", "MouseButton",
    "avatarRig", "avatarPOV",
]

PRAGMA = re.compile(r"^\s*#pragma\s+(\w+)\s*\((.*?)\)\s*;?\s*$")


def names(arg_list):
    return [n.strip() for n in arg_list.split(",") if n.strip()]


def build(name):
    src = (ROOT / f"{name}.js").read_text(encoding="utf-8")
    imports, exports, lifecycle, body = [], [], {}, []

    for line in src.splitlines():
        m = PRAGMA.match(line)
        if not m:
            body.append(line)
            continue
        kind, args = m.groups()
        if kind == "import":
            imports += names(args)
        elif kind == "export":
            exports += names(args)
        elif kind == "lifecycle":
            for hook in names(args):
                key, _, fn = hook.partition("=")
                lifecycle[key.strip()] = (fn or key).strip()
        else:
            raise ValueError(f"{name}.js: unsupported #pragma {kind}")

    code = "\n".join(body).strip("\n")
    deps = [g for g in MUD_GLOBALS if re.search(rf"\b{g}\b", code)] + imports
    returned = [f"{e}: {e}" for e in exports]
    returned += [f"{hook}: {fn}" for hook, fn in lifecycle.items()]

    indented = "\n".join(("        " + l) if l.strip() else "" for l in code.splitlines())

    out = f"""// AUTO-GENERATED from {name}.js by build.py — edit the source, then rebuild.
//
//   #pragma import({name} = "<url to this file>")
//   const lib = {name}({{ {", ".join(deps)} }});
(function (root, factory) {{
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define([], factory);
    else root.{name} = factory();
}}(typeof globalThis !== 'undefined' ? globalThis : this, function () {{
    return function {name}(mud) {{
        const {{ {", ".join(deps)} }} = mud || {{}};

{indented}

        return {{ {", ".join(returned)} }};
    }};
}}));
"""
    DIST.mkdir(exist_ok=True)
    (DIST / f"{name}.js").write_text(out, encoding="utf-8", newline="\n")
    print(f"dist/{name}.js  needs: {', '.join(deps) or '-'}  returns: {', '.join(exports + list(lifecycle))}")


if __name__ == "__main__":
    for m in MODULES:
        build(m)

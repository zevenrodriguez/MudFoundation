// AUTO-GENERATED from MudGui.js by build.py — edit the source, then rebuild.
//
//   #pragma import(MudGui = "<url to this file>")
//   const lib = MudGui({ THREE, scene, renderer, RayInteractor });
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define([], factory);
    else root.MudGui = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    return function MudGui(mud) {
        const { THREE, scene, renderer, RayInteractor } = mud || {};

        // ─────────────────────────────────────────────────────────────────────────────
        // Internal — rounded rectangle helper
        // ─────────────────────────────────────────────────────────────────────────────
        function _roundRect(ctx, x, y, w, h, r, fillColor, strokeColor, lineWidth) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y,         x + r, y);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            if (lineWidth > 0) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth   = lineWidth;
                ctx.stroke();
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // MudText — factory function
        // Renders text onto a 3D plane via a canvas texture.
        //
        // Pass an existing scene mesh to use its position/rotation/scale:
        //   const label = MudText({ sceneMesh: scene.getObjectByName("myLabel"), text: 'Hello' });
        //
        // Or create its own mesh and add it manually:
        //   const label = MudText({ text: 'Hello', width: 0.4, height: 0.15 });
        //   scene.add(label.mesh);
        //
        //   label.setText('World');
        // ─────────────────────────────────────────────────────────────────────────────
        function MudText(options) {
            const opts = Object.assign({
                sceneMesh:       null,
                text:            '',
                width:           0.4,
                height:          0.15,
                resolution:      512,
                fontSize:        48,
                fontFamily:      'Arial',
                textColor:       '#ffffff',
                backgroundColor: '#222222',
                borderColor:     '#555555',
                borderWidth:     6,
                borderRadius:    24,
            }, options);

            // ── Resolve mesh + dimensions ─────────────────────────────────────────────
            let mesh;
            if (opts.sceneMesh) {
                const ref  = opts.sceneMesh;
                const box  = new THREE.Box3().setFromObject(ref);
                const size = new THREE.Vector3();
                box.getSize(size);
                opts.width  = size.x || opts.width;
                opts.height = size.y || opts.height;

                // Hide the reference primitive — it was only there for placement
                ref.visible = false;

                // Create a fresh plane at the reference's world position/rotation
                mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, opts.height), null);
                ref.getWorldPosition(mesh.position);
                ref.getWorldQuaternion(mesh.quaternion);
                scene.add(mesh);
            } else {
                mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, opts.height), null);
            }

            // ── Canvas + texture ──────────────────────────────────────────────────────
            const aspect  = opts.width / opts.height;
            const canvasW = opts.resolution;
            const canvasH = Math.round(opts.resolution / aspect);
            const canvas  = renderer.domElement.ownerDocument.createElement('canvas');
            canvas.width  = canvasW;
            canvas.height = canvasH;
            const ctx     = canvas.getContext('2d');
            const texture = new THREE.CanvasTexture(canvas);
            if (THREE.SRGBColorSpace !== undefined) texture.colorSpace = THREE.SRGBColorSpace;

            mesh.material = new THREE.MeshBasicMaterial({
                map:         texture,
                side:        THREE.DoubleSide,
                transparent: true,
            });

            // ── Private draw ─────────────────────────────────────────────────────────
            function draw(bgColor, borderColor) {
                const bw      = opts.borderWidth;
                const r       = opts.borderRadius;
                const padding = bw + 16;

                ctx.clearRect(0, 0, canvasW, canvasH);
                _roundRect(ctx, bw / 2, bw / 2, canvasW - bw, canvasH - bw, r, bgColor, borderColor, bw);

                ctx.fillStyle = opts.textColor;
                ctx.font      = `${opts.fontSize}px ${opts.fontFamily}`;
                ctx.textAlign = 'center';

                // ── Word wrap ────────────────────────────────────────────────────────
                const maxWidth   = canvasW - padding * 2;
                const lineHeight = opts.fontSize * 1.2;
                const words      = opts.text.split(' ');
                const lines      = [];
                let   current    = '';

                for (let i = 0; i < words.length; i++) {
                    const test = current ? current + ' ' + words[i] : words[i];
                    if (ctx.measureText(test).width > maxWidth && current) {
                        lines.push(current);
                        current = words[i];
                    } else {
                        current = test;
                    }
                }
                if (current) lines.push(current);

                // Draw lines centered vertically
                const totalH  = lines.length * lineHeight;
                const startY  = (canvasH - totalH) / 2 + lineHeight / 2;

                ctx.textBaseline = 'middle';
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], canvasW / 2, startY + i * lineHeight);
                }

                texture.needsUpdate       = true;
                mesh.material.needsUpdate = true;
            }

            // ── Public API ────────────────────────────────────────────────────────────
            const self = {
                mesh: mesh,
                setText: function(text) {
                    opts.text = text;
                    draw(opts.backgroundColor, opts.borderColor);
                },
                _draw: draw,
                _opts: opts,
            };

            self.setText(opts.text);
            return self;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // MudButton — factory function
        // A MudText that responds to raycast hover and click.
        //
        // Pass an existing scene mesh to drive position/size from the editor:
        //   const btn = MudButton({ sceneMesh: scene.getObjectByName("myButton"), text: 'Go' });
        //   btn.onClick = () => { console.log('clicked'); };
        //
        //   // In update loop:
        //   btn.update(raycast, isPressed, isReleased);
        // ─────────────────────────────────────────────────────────────────────────────
        function MudButton(options) {
            const opts = Object.assign({
                backgroundColor:      '#2255cc',
                hoverBackgroundColor: '#4477ff',
                borderColor:          '#99bbff',
                hoverBorderColor:     '#ffffff',
            }, options);

            const normalBg     = opts.backgroundColor;
            const hoverBg      = opts.hoverBackgroundColor;
            const normalBorder = opts.borderColor;
            const hoverBorder  = opts.hoverBorderColor;

            const base       = MudText(opts);
            const interactor = new RayInteractor(base.mesh);

            interactor.onEnter = function(_hit) { base._draw(hoverBg, hoverBorder); };
            interactor.onExit  = function(_hit) { base._draw(normalBg, normalBorder); };

            const self = {
                mesh:        base.mesh,
                setText:     base.setText,
                onClick:     function() {},
                _interactor: interactor,
                hover:   function() { base._draw(hoverBg,   hoverBorder);  },
                unhover: function() { base._draw(normalBg,  normalBorder); },
                update: function(pointers) {
                    interactor.update(pointers);
                },
                reset: function() {
                    interactor.reset();
                    base._draw(normalBg, normalBorder);
                },
            };

            interactor.onClick = function(_hit) { self.onClick(_hit); };

            return self;
        }

        return { MudText: MudText, MudButton: MudButton };
    };
}));

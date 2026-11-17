/*
 * CG_1: Cara 2D hecha de triángulos, que se mueve con matrices.
 * - La rotación de la cara es alrededor del pivote (el rombo gris).
 * - La traslación y la escala NO dependen del pivote.
 * - Un menú permite elegir en qué orden se aplican las 3 transformaciones.
 *
 * Jesús Espinoza
 * A01781963
 * 2026-11-10
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond, smiley } from '../libs/shapes.js';
import { V2, M3, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';

// Los shaders están en archivos aparte
import vsGLSL from './vs_matrices_vcolor.glsl?raw';
import fsGLSL from './fs_vertex_color.glsl?raw';

// Opciones del menú: cada letra es una transformación, en el orden en que
// se aplican a la cara.  s = escala, r = rotación, t = traslación
const ORDERS: Record<string, string[]> = {
    'scale -> rotation -> translation': ['s', 'r', 't'],
    'scale -> translation -> rotation': ['s', 't', 'r'],
    'translation -> scale -> rotation': ['t', 's', 'r'],
    'rotation -> translation -> scale': ['r', 't', 's'],
    'rotation -> scale -> translation': ['r', 's', 't'],
};


class FaceScene extends Scene {
    // Orden elegido en el menú (empieza con el que se ve más natural)
    settings = { order: 'scale -> translation -> rotation' };

    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Cada objeto tiene sus propios datos y su propio VAO
        // (addObject crea el VAO). Los dos usan el mismo shader.

        // La cara empieza en el centro de la pantalla
        const face = this.addObject('face', smiley(120), [1, 1, 1, 1]);
        face.transforms.t.x = gl.canvas.width / 2;
        face.transforms.t.y = gl.canvas.height / 2;

        // El pivote empieza a la derecha de la cara
        const pivot = this.addObject('pivot', diamond(20), [0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 2 + 250;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Dibuja la escena en cada cuadro
    protected render(): void {
        const { gl, programInfo } = this;
        const face = this.getObject('face');
        const pivot = this.getObject('pivot');
        const px = pivot.transforms.t.x;
        const py = pivot.transforms.t.y;

        // 1) Las 3 matrices de la cara
        const s: Mat3 = M3.scale(V2.create(face.transforms.s.x, face.transforms.s.y));
        const t: Mat3 = M3.translation(V2.create(face.transforms.t.x, face.transforms.t.y));

        // Rotar alrededor del pivote = llevar el pivote al origen,
        // girar, y regresar el pivote a su lugar
        let r: Mat3 = M3.translation(V2.create(-px, -py));
        r = M3.multiply(M3.rotation(face.transforms.rr.z), r);
        r = M3.multiply(M3.translation(V2.create(px, py)), r);

        // 2) Se juntan en una sola matriz, en el orden del menú.
        //    Cada matriz nueva se multiplica por la IZQUIERDA,
        //    así se aplica después de las anteriores.
        const matrices: Record<string, Mat3> = { s, r, t };
        let faceMatrix: Mat3 = M3.identity();
        for (const step of ORDERS[this.settings.order]) {
            faceMatrix = M3.multiply(matrices[step], faceMatrix);
        }

        // 3) Dibujar la cara
        gl.useProgram(programInfo.program);
        twgl.setUniforms(programInfo, {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: faceMatrix,
        });
        gl.bindVertexArray(face.vao);
        twgl.drawBufferInfo(gl, face.bufferInfo);

        // 4) Dibujar el pivote (solo se traslada)
        twgl.setUniforms(programInfo, {
            u_transforms: M3.translation(V2.create(px, py)),
        });
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    // Controles de lil-gui. Cada control cambia directamente el valor,
    // y la escena se vuelve a dibujar sola en cada cuadro.
    setupUI(): void {
        const { gl } = this;
        const face = this.getObject('face');
        const pivot = this.getObject('pivot');
        const gui = new GUI();

        // Menú para elegir el orden de las transformaciones
        gui.add(this.settings, 'order', Object.keys(ORDERS)).name('Order');

        const faceFolder = gui.addFolder('Face');
        faceFolder.add(face.transforms.t, 'x', 0, gl.canvas.width).name('translate x');
        faceFolder.add(face.transforms.t, 'y', 0, gl.canvas.height).name('translate y');
        faceFolder.add(face.transforms.rr, 'z', 0, Math.PI * 2).name('rotation');
        faceFolder.add(face.transforms.s, 'x', -5, 5).name('scale x');
        faceFolder.add(face.transforms.s, 'y', -5, 5).name('scale y');

        const pivotFolder = gui.addFolder('Pivot');
        pivotFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width).name('x');
        pivotFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height).name('y');
    }
}

// Punto de inicio: prepara WebGL, crea la escena y los controles
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new FaceScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main();

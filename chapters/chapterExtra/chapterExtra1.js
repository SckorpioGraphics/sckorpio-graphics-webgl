/* #############################################################
SUPPLEMENTAL EXPERIMENT 1: Animated Line and Render Loop

Topics:
- Pixel-space geometry
- Projection matrix
- Uniform matrix
- Dynamic vertex data
- gl.LINES
- requestAnimationFrame()
- Render loop
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================

const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;
    uniform mat3 u_matrix;

    void main() {
        // Transform pixel-space position into clip space
        gl_Position = vec4(
            (u_matrix * vec3(a_position, 1.0)).xy,
            0.0,
            1.0
        );
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        // Set line color
        out_color = u_color;
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        matrix: null,
        color: null
    },
    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.uniforms.matrix = gl.getUniformLocation(this.program, "u_matrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// MESHES
// =============================================================

const line = {
    vertexData: new Float32Array(4),
    buffer: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 2,
    init(gl) {
        this.buffer = gl.createBuffer();
        this.drawMode = gl.LINES;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false, 0, 0);
    },
    update(gl, x1, y1, x2, y2) {
        this.vertexData.set([x1, y1, x2, y2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    },
    draw(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
};

// =============================================================
// RENDER SYSTEM
// =============================================================

const renderSystem = {
    canvas: null,
    gl: null,
    initWebgl() {
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element '#c' not found.");
            return;
        }

        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported by this browser.");
        }
    },
    resizeCanvasToDisplaySize() {
        const width = this.canvas.clientWidth | 0;
        const height = this.canvas.clientHeight | 0;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    },
    init() {
        shader.init(this.gl);
        line.init(this.gl);
    },
    update(now) {
        const radius =
            Math.sqrt(
                this.canvas.width ** 2 +
                this.canvas.height ** 2
            ) * 0.5;

        const angle = now;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const centerX = this.canvas.width * 0.5;
        const centerY = this.canvas.height * 0.5;

        line.update(
            this.gl,
            centerX + x,
            centerY + y,
            centerX - x,
            centerY - y
        );
    },
    render() {
        const gl = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(shader.program);

        const projectionMatrix = m3Projection(this.canvas.width, this.canvas.height);

        gl.uniformMatrix3fv(shader.uniforms.matrix, false, projectionMatrix);
        gl.uniform4fv(shader.uniforms.color, [0.39, 0.33, 0.58, 1.0]);
        line.draw(gl);
    }
};

// =============================================================
// Camera-Related Matrix Functions
// =============================================================

/**
 * Generates a 3x3 projection matrix converting
 * pixel coordinates into WebGL clip space.
 *
 * Pixel space:
 *     (0,0) → top-left
 *
 * Clip space:
 *     (-1,+1) → top-left
 *     (+1,-1) → bottom-right
 */

function m3Projection(width, height) {
    return new Float32Array([
         2 / width,          0, 0,
                 0, -2 / height, 0,
                -1,          1, 1
    ]);
}

// =============================================================
// MAIN
// =============================================================

function appLoop(now = 0) {
    renderSystem.resizeCanvasToDisplaySize();
    renderSystem.update(now * 0.001);
    renderSystem.render();
    requestAnimationFrame(frameTime => appLoop(frameTime));
}

function appInit() {
    // init renderSystem
    renderSystem.initWebgl();
    renderSystem.init();
}

function main() {
    appInit();
    appLoop();
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================

window.addEventListener("DOMContentLoaded", main);

export {
    main
};

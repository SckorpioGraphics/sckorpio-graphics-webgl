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

class BasicShader {
    constructor() {
        this.vertexShaderSource = `#version 300 es
    in vec2 a_position;
    uniform mat3 u_matrix;

    void main() {
        // Transform pixel-space position into clip space
        gl_Position = vec4(
        (u_matrix * vec3(a_position, 1.0)).xy,
        0.0,
        1.0
        );
    }`;
        this.fragmentShaderSource = `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        // Set line color
        out_color = u_color;
    }`;
        this.program = null;
        this.attributes = {
            position: null
        };
        this.uniforms = {
            matrix: null,
            color: null
        };
    }

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

class Line {
    constructor(options = {}) {
        const { shader, texture = null, ...config } = options;
        this.shader = shader;
        this.texture = texture;
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) this[key] = value;
        }
    }

    vertexData = new Float32Array(4);
    buffer = null;
    drawMode = null;
    drawOffset = 0;
    drawCount = 2;
    init(gl) {
        this.buffer = gl.createBuffer();
        this.drawMode = gl.LINES;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.vertexAttribPointer(this.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);
    }
    update(gl, x1, y1, x2, y2) {
        this.vertexData.set([x1, y1, x2, y2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    }
    draw(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
}

// =============================================================
// RENDER SYSTEM
// =============================================================

class RenderSystem {
    constructor(options = {}) {
        const { camera = null, shaders = {}, textures = {}, meshes = {} } = options;
        this.camera = camera;
        this.shaders = shaders;
        this.textures = textures;
        this.meshes = meshes;
    }

    canvas = null;
    gl = null;

    initWebgl() {
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element '#c' not found.");
            return false;
        }

        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported by this browser.");
            return false;
        }
        return true;
    }
    resizeCanvasToDisplaySize() {
        const width = this.canvas.clientWidth | 0;
        const height = this.canvas.clientHeight | 0;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }
    init() {
        if (!this.gl && !this.initWebgl()) return false;

        const gl = this.gl;
        // Initialize resources
        for (const shader of Object.values(this.shaders)) shader.init(gl);
        for (const texture of Object.values(this.textures)) texture.init(gl);
        for (const meshOrMeshes of Object.values(this.meshes)) {
            const meshes = Array.isArray(meshOrMeshes) ? meshOrMeshes : [meshOrMeshes];
            for (const mesh of meshes) {
                if (mesh.textureName) mesh.texture = this.textures[mesh.textureName];
                mesh.init(gl);
            }
        }
        return true;
    }
    update(now) {
        const {line} = this.meshes;
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
    }
    render() {
        const gl = this.gl;
        const {shader} = this.shaders;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(shader.program);

        const projectionMatrix = m3Projection(this.canvas.width, this.canvas.height);

        gl.uniformMatrix3fv(shader.uniforms.matrix, false, projectionMatrix);
        gl.uniform4fv(shader.uniforms.color, [0.39, 0.33, 0.58, 1.0]);
        // RENDER MESHES
        for (const meshOrMeshes of Object.values(this.meshes)) {
            const meshes = Array.isArray(meshOrMeshes) ? meshOrMeshes : [meshOrMeshes];
            for (const mesh of meshes) mesh.draw(gl, this.canvas.width, this.canvas.height);
        }
    }
}

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

class App {
    constructor() {
        this.createScene();
    }
    createScene() {
        const camera = new Camera();
        const shader = new BasicShader();
        const shaders = { shader };
        const meshes = {};
        meshes.line = new Line({ shader });
        this.renderSystem = new RenderSystem({ camera, shaders, meshes });
    }


    init() {
        // init renderSystem
        if (!this.renderSystem.init()) return false;
        return true;
    }

    loop(now = 0) {
        this.renderSystem.resizeCanvasToDisplaySize();
        this.renderSystem.update(now * 0.001);
        this.renderSystem.render();
        requestAnimationFrame(frameTime => this.loop(frameTime));
    }
}

function main() {
    const app = new App();
    if (!app.init()) return;
    app.loop();
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================

window.addEventListener("DOMContentLoaded", main);

export {
    main
};

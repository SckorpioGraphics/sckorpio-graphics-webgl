/* #############################################################
CHAPTER 2c: Creating a Basic Triangle — Clean Structure
- Template for this series
#############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
const shader = {
    vertexShaderSource: `#version 300 es
        in vec2 a_position;

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `,

    fragmentShaderSource: `#version 300 es
        precision mediump float;
        out vec4 out_Color;

        void main() {
            out_Color = vec4(0.39, 0.33, 0.58, 1.0);
        }
    `,

    program: null,

    attributes: {
        position: null
    },

    uniforms: {},

    // FUNCTIONS
    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, shader.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Get attribute locations
        this.attributes.position = gl.getAttribLocation(shader.program,"a_position");
        // Get uniform locations
    }
};

// Compile Shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if(compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

// Link Program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);

    if(linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// MESHES
// =============================================================
const triangle = {
    //         v2
    //         /\
    //        /  \
    //       /    \
    //      /      \
    //     /        \
    //    v0--------v1

    // CPU Data
    positions: new Float32Array([
        -0.5, 0.0, // v0
        0.0, 0.5,  // v1
        0.5, 0.0   // v2
    ]),

    // GPU Data
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //Functions
    init(gl, shader) {
        // Connect shader to mesh
        this.shader = shader;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.positions,gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Enable position attribute
        gl.enableVertexAttribArray(this.shader.attributes.position);

        // Bind Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 3;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(
            this.drawMode,
            this.drawOffset,
            this.drawCount
        );
        gl.bindVertexArray(null);
    }
};

// =============================================================
// RENDER SYSTEM
// =============================================================
const renderSystem = {
    canvas: null,
    gl: null,

    initWebgl() {
        // Canvas
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element #c not found.");
            return false;
        }

        // Context
        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported or unavailable.");
            return false;
        }
    },
    // RESIZE
    resizeCanvasToDisplaySize(multiplier = 1) {
        const width = (this.canvas.clientWidth * multiplier) | 0;
        const height = (this.canvas.clientHeight * multiplier) | 0;

        if (this.canvas.width !== width ||
            this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    },
    // INIT
    init() {
        this.initWebgl();
        const gl = this.gl;

        // Resources Initialise
        shader.init(gl);
        triangle.init(gl, shader);
    },
    // RENDER
    render() {
        const gl = this.gl;
        // Viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // Background
        gl.clearColor(0.32, 0.63, 0.67, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Render Meshes
        triangle.draw(gl);
    },
};

// =============================================================
// MAIN
// =============================================================
function app() {
    renderSystem.resizeCanvasToDisplaySize();
    renderSystem.render();
}

function appInit() {
    renderSystem.init();
    window.addEventListener("resize", () => app());
}

function main() {
    appInit();
    app();
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
window.addEventListener("DOMContentLoaded", main);

export { main };

/* #############################################################
CHAPTER 6a: Varying Vertex Color

Topics:
- Using Vertex data itself for Vertex Color
- Adding a basic UI to manipulate
- Vertex vertexData
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;
    out vec4 v_color;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = gl_Position * 0.5 + 0.5;
    }
`,

    fragmentShaderSource: `#version 300 es
    precision highp float;
    in vec4 v_color;
    out vec4 out_color;

    void main() {
        out_color = v_color;
    }
    `,

    program: null,

    attributes: {
        position: null
    },

    uniforms: {},

    //FUNCTIONS

    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, shader.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Get attribute locations
        this.attributes.position = gl.getAttribLocation(shader.program,"a_position");
        // Get uniform locations
        // Future uniforms will be stored here.
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

    // CPU DATA
    vertexData: new Float32Array([
        -0.5,  0.0,  // v0
        0.5, 0.0,    // v1
        0.0,  0.5,   // v2
    ]),

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Connect shader to mesh
        this.shader = shader;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // NOTE: Vertex data will be updated from the UI during rendering.

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

    updateData(gl) {
        gl.bindVertexArray(triangle.vao);

        // Vertex data CPU side
        this.vertexData = new Float32Array([
            gui.state.aX, gui.state.aY, // Point A
            gui.state.bX, gui.state.bY, // Point B
            gui.state.cX, gui.state.cY  // Point C
        ]);

        // Update vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, triangle.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(
            this.drawMode,
            this.drawOffset,
            this.drawCount
        );
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
    // UPDATE
    update() {
        const gl = this.gl;

        triangle.updateData(gl);
    },
    // RENDER
    render() {
        const gl = this.gl;
        gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

        // Background
        gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
        gl.clear(gl.COLOR_BUFFER_BIT);

        // RENDER MESHES
        //---------------------------------------------------
        triangle.draw(gl);
    },
};

// =============================================================
// GUI Setup Functions
// =============================================================
const gui = {
    state: {
        aX: -0.5, aY: 0.0,
        bX: 0.5, bY: 0.0,
        cX: 0.0, cY: 0.5
    },

    init(func) {
        const gui = new lil.GUI();
        const vertexFolder = gui.addFolder("Vertex Positions");

        // Point A
        const pointAFolder = vertexFolder.addFolder("Point A");
        pointAFolder.add(this.state, "aX", -1, 1).name("X").onChange(func);
        pointAFolder.add(this.state, "aY", -1, 1).name("Y").onChange(func);

        // Point B
        const pointBFolder = vertexFolder.addFolder("Point B");
        pointBFolder.add(this.state, "bX", -1, 1).name("X").onChange(func);
        pointBFolder.add(this.state, "bY", -1, 1).name("Y").onChange(func);

        // Point C
        const pointCFolder = vertexFolder.addFolder("Point C");
        pointCFolder.add(this.state, "cX", -1, 1).name("X").onChange(func);
        pointCFolder.add(this.state, "cY", -1, 1).name("Y").onChange(func);
    }
};
// =============================================================
// MAIN
// =============================================================
function app() {
    renderSystem.resizeCanvasToDisplaySize();
    renderSystem.update();
    renderSystem.render();
}

function appInit() {
    renderSystem.init();
    gui.init(() => app());
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

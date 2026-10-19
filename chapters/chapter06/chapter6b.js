/* #############################################################
CHAPTER 6b: Dynamic Rectangle

Topics:
- Making a rectangle
- Adding a basic UI to manipulate
- Vertex positions
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
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
        out_Color = vec4(0.39, 0.33, 0.58, 1.0); // Sckorpio Purple
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
// SCENE OBJECTS
// =============================================================
const rectangle = {
    //    v1--------v2
    //    | \        |
    //    |    \     |
    //    |       \  |
    //    v0--------v1

    // CPU DATA
    positions: new Float32Array([
        -0.5,  -0.5,   // v0
        -0.5, 0.5,   // v1
        0.5,  0.5,   // v2
        0.5, -0.5   // v3
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
        // Connect shader to object
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
            2,          // size: 2 components (X, Y)
            gl.FLOAT,   // type: 32-bit float
            false,      // normalize
            0,          // stride: tightly packed
            0           // offset: start of buffer
        );

        // Draw data
        this.drawMode = gl.TRIANGLE_STRIP;
        this.drawOffset = 0;
        this.drawCount = 4;
    },

    updateData(gl) {
        // Vertex data CPU side
        this.positions = new Float32Array([
            gui.state.centerX - gui.state.length / 2.0,
            gui.state.centerY + gui.state.width / 2.0, // Point 0

            gui.state.centerX + gui.state.length / 2.0,
            gui.state.centerY + gui.state.width / 2.0, // Point 1

            gui.state.centerX - gui.state.length / 2.0,
            gui.state.centerY - gui.state.width / 2.0, // Point 2

            gui.state.centerX + gui.state.length / 2.0,
            gui.state.centerY - gui.state.width / 2.0  // Point 3
        ]);

        // Update vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
    }
};

// =============================================================
// GUI Setup Functions
// =============================================================
const gui = {
    state: {
        centerX: 0.0,
        centerY: 0.0,
        length: 0.5,
        width: 0.5
    },

    init(render) {
        const gui = new lil.GUI();
        const rectangleFolder = gui.addFolder("Rectangle");

        // Center
        const centerFolder = rectangleFolder.addFolder("Center");
        centerFolder.add(this.state, "centerX", -1, 1).name("centerX").onChange(render);
        centerFolder.add(this.state, "centerY", -1, 1).name("centerY").onChange(render);

        // Dimension
        const dimFolder = rectangleFolder.addFolder("Dimensions");
        dimFolder.add(this.state, "length", 0, 2).name("length").onChange(render);
        dimFolder.add(this.state, "width", 0, 2).name("width").onChange(render);
    }
};

// =============================================================
// RENDER
// =============================================================
function render(gl) {
    // Canvas
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

    // Background
    gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
    gl.clear(gl.COLOR_BUFFER_BIT);

    // UPDATE THINGS
    //---------------------------------------------------
    rectangle.updateData(gl);

    // DRAW THINGS
    //---------------------------------------------------
    // Shader
    gl.useProgram(shader.program);
    // Rectangle
    gl.bindVertexArray(rectangle.vao);
    gl.drawArrays(
        rectangle.drawMode,
        rectangle.drawOffset,
        rectangle.drawCount
    );
}

// =============================================================
// MAIN
// =============================================================
function main() {
    //Canvas
    const canvas = document.querySelector("#c");
    if(!canvas) {console.error("Canvas element not found");return;}

    //Context
    const gl = canvas.getContext("webgl2");
    if(!gl) {console.error("WebGL2 is not supported by this browser");return;}

    //GUI
    gui.init(() => render(gl));

    //Shaders
    shader.init(gl);

    //Objects
    rectangle.init(gl, shader);

    //Render
    render(gl);

    //Resize
    window.addEventListener("resize", () => render(gl));
}

// =============================================================
// HELPER FUNCS
// =============================================================
// Resize Canvas
function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;

    if(canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }

    return false;
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
window.addEventListener("DOMContentLoaded", main);

export {
    main
};
/* #############################################################
CHAPTER 7b: Multiple Buffers

Topics:
- Using Separate Buffer for Vertex Color
- Adding a basic UI to manipulate
- Vertex vertexPositions
- Vertex color
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;
    in vec3 a_color;

    out vec4 v_color;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = vec4(a_color, 1.0);
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
        position: null,
        color: null
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
        this.attributes.position = gl.getAttribLocation(this.program,"a_position");
        this.attributes.color = gl.getAttribLocation(this.program, "a_color");
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
const triangle = {
    //         v2
    //         /\
    //        /  \
    //       /    \
    //      /      \
    //     /        \
    //    v0--------v1

    // CPU DATA
    vertexPositions: new Float32Array(),
    vertexColors: new Float32Array(),

    //GPU DATA
    shader: null,
    vao: null,
    positionVbo: null,
    colorVbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Shader
        this.shader = shader;

        // Vertex Buffer(s)
        this.positionVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
        // Position data will be updated from the UI during rendering.
        this.colorVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVbo);
        // Color data will be updated from the UI during rendering.

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex vertexPositions attrib
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            0,                      // Stride : 0
            0                       // Offset : 0 (Both 0, as dedicated buffer for this)
        );  

        // Vertex vertexColors attrib
        gl.enableVertexAttribArray(this.shader.attributes.color);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVbo);
        gl.vertexAttribPointer(
            this.shader.attributes.color,
            3,
            gl.FLOAT,
            false,
            0,                      // Stride : 0
            0                       // Offset : 0 (Both 0, as dedicated buffer for this)
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 3;
    },

    updateData(gl) {
        gl.bindVertexArray(triangle.vao);

        // Vertex data CPU side
        this.vertexPositions = new Float32Array([
            gui.state.aX, gui.state.aY, // Point A
            gui.state.bX, gui.state.bY, // Point B
            gui.state.cX, gui.state.cY  // Point C
        ]);

        // Update vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexPositions, gl.DYNAMIC_DRAW);

        // Color Data CPU Side
        this.vertexColors = new Float32Array([
            gui.state.aR, gui.state.aG, gui.state.aB, // Point A
            gui.state.bR, gui.state.bG, gui.state.bB, // Point B
            gui.state.cR, gui.state.cG, gui.state.cB  // Point C
        ]);

        // Update color data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexColors, gl.DYNAMIC_DRAW);
    }
};

// =============================================================
// GUI Setup Functions
// =============================================================
const gui = {
    state: {
        // Vertex Positions
        aX: -0.5, aY: 0.0,
        bX: 0.5, bY: 0.0,
        cX: 0.0, cY: 0.5,

        // Vertex Colors
        aR: 1.0, aG: 0.0, aB: 0.0,
        bR: 0.0, bG: 1.0, bB: 0.0,
        cR: 0.0, cG: 0.0, cB: 1.0
    },

    init(render) {
        const gui = new lil.GUI();

        // ---------------------------------------------------------
        // VERTICES
        // ---------------------------------------------------------

        const verticesFolder = gui.addFolder("Vertices");

        // Point A
        const pointAFolder = verticesFolder.addFolder("Point A");
        pointAFolder.add(this.state, "aX", -1, 1).name("X").onChange(render);
        pointAFolder.add(this.state, "aY", -1, 1).name("Y").onChange(render);

        // Point B
        const pointBFolder = verticesFolder.addFolder("Point B");
        pointBFolder.add(this.state, "bX", -1, 1).name("X").onChange(render);
        pointBFolder.add(this.state, "bY", -1, 1).name("Y").onChange(render);

        // Point C
        const pointCFolder = verticesFolder.addFolder("Point C");
        pointCFolder.add(this.state, "cX", -1, 1).name("X").onChange(render);
        pointCFolder.add(this.state, "cY", -1, 1).name("Y").onChange(render);

        // ---------------------------------------------------------
        // COLORS
        // ---------------------------------------------------------

        const colorFolder = gui.addFolder("Color");

        // Point A
        const pointAColorFolder = colorFolder.addFolder("Point A");
        pointAColorFolder.add(this.state, "aR", 0, 1).name("R").onChange(render);
        pointAColorFolder.add(this.state, "aG", 0, 1).name("G").onChange(render);
        pointAColorFolder.add(this.state, "aB", 0, 1).name("B").onChange(render);

        // Point B
        const pointBColorFolder = colorFolder.addFolder("Point B");
        pointBColorFolder.add(this.state, "bR", 0, 1).name("R").onChange(render);
        pointBColorFolder.add(this.state, "bG", 0, 1).name("G").onChange(render);
        pointBColorFolder.add(this.state, "bB", 0, 1).name("B").onChange(render);

        // Point C
        const pointCColorFolder = colorFolder.addFolder("Point C");
        pointCColorFolder.add(this.state, "cR", 0, 1).name("R").onChange(render);
        pointCColorFolder.add(this.state, "cG", 0, 1).name("G").onChange(render);
        pointCColorFolder.add(this.state, "cB", 0, 1).name("B").onChange(render);
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
    triangle.updateData(gl);

    // DRAW THINGS
    //---------------------------------------------------
    // Shader
    gl.useProgram(shader.program);
    // Rectangle
    gl.bindVertexArray(triangle.vao);
    gl.drawArrays(
        triangle.drawMode,
        triangle.drawOffset,
        triangle.drawCount
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
    triangle.init(gl, shader);

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
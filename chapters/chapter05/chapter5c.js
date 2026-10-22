/* #############################################################
CHAPTER 5c: Dynamic Polygon Outline

Topics:
- Learning Topology LINE_LOOP
- Making a Polygon to Circle
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
// MESHES
// =============================================================
const polygon = {
    /*
             #5---#4
           /         \
         #0           #3
           \         /
             #1---#2
    */

    // CPU DATA
    positions: new Float32Array(),
    indices: new Float32Array(),
    // Will be filled dynamically

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    ibo: null,
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

        // Index Buffer
        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

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
        this.drawMode = gl.LINE_LOOP;
        this.drawOffset = 0;
        this.drawCount = 0;
        this.drawType = gl.UNSIGNED_SHORT;
    },

    updateData(gl) {
        // Vertex and index data CPU side
        const positionsData = [];
        const indicesData = [];

        for(let i = 0; i < gui.state.points; i++) {
            const angle = (i / gui.state.points) * (2 * Math.PI);
            const x = gui.state.centerX + Math.sin(angle) * gui.state.radius;
            const y = gui.state.centerY + Math.cos(angle) * gui.state.radius;
            positionsData.push(x);
            positionsData.push(y);
            indicesData.push(i);
        }

        this.positions = new Float32Array(positionsData);
        this.indices = new Uint16Array(indicesData);

        // Update vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, polygon.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);

        // Update index data on the GPU
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polygon.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.DYNAMIC_DRAW);

        // Update draw data
        this.drawCount = this.indices.length;
    }
};

// =============================================================
// GUI Setup Functions
// =============================================================
const gui = {
    state: {
        centerX: 0.0,
        centerY: 0.0,
        radius: 0.5,
        points: 5
    },

    init(render) {
        const gui = new lil.GUI();
        const polygonFolder = gui.addFolder("Polygon");

        // Center
        const centerFolder = polygonFolder.addFolder("Center");
        centerFolder.add(this.state, "centerX", -1, 1).name("centerX").onChange(render);
        centerFolder.add(this.state, "centerY", -1, 1).name("centerY").onChange(render);

        // Dimension
        const dimFolder = polygonFolder.addFolder("Dimensions");
        dimFolder.add(this.state, "radius", 0, 1).name("radius").onChange(render);
        dimFolder.add(this.state, "points", 3, 20, 1).name("points").onChange(render);
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
    polygon.updateData(gl);

    // RENDER MESHES
    //---------------------------------------------------
    // Shader
    gl.useProgram(shader.program);
    // Polygon
    gl.bindVertexArray(polygon.vao);
    gl.drawElements(
        polygon.drawMode,
        polygon.drawCount,
        polygon.drawType,
        polygon.drawOffset
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
    polygon.init(gl, shader);

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
/* #############################################################
CHAPTER 5d: Dynamic Filled Polygon

Topics:
- Learning Topology TRIANGLE_FAN
- Making a Polygon to Circle
###############################################################
*/

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
             v6---v5
           /   \ /   \
         v1     v0    v4
           \         /
             v2---v3
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
        this.drawMode = gl.TRIANGLE_FAN;
        this.drawOffset = 0;
        this.drawCount = 0;
        this.drawType = gl.UNSIGNED_SHORT;
    },

    updateData(gl) {
        // Vertex and index data CPU side
        const positionsData = [];
        const indicesData = [];

        // Center
        positionsData.push(gui.state.centerX);
        positionsData.push(gui.state.centerY);
        indicesData.push(0);

        for(let i = 0; i < gui.state.points; i++) {
            const angle = (i / gui.state.points) * (2 * Math.PI);
            const x = gui.state.centerX + Math.sin(angle) * gui.state.radius;
            const y = gui.state.centerY + Math.cos(angle) * gui.state.radius;
            positionsData.push(x);
            positionsData.push(y);
            indicesData.push(i + 1);
        }

        // First point repeat
        positionsData.push(positionsData[2]);
        positionsData.push(positionsData[3]);
        indicesData.push(indicesData[1]);

        // Fill New CPU Data
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
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(this.vao);
        gl.drawElements(
            this.drawMode,
            this.drawCount,
            this.drawType,
            this.drawOffset
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
        polygon.init(gl, shader);
    },
    // UPDATE
    update() {
        const gl = this.gl;

        polygon.updateData(gl);
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
        // Polygon
        polygon.draw(gl);
    },
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

    init(func) {
        const gui = new lil.GUI();
        const polygonFolder = gui.addFolder("Polygon");

        // Center
        const centerFolder = polygonFolder.addFolder("Center");
        centerFolder.add(this.state, "centerX", -1, 1).name("centerX").onChange(func);
        centerFolder.add(this.state, "centerY", -1, 1).name("centerY").onChange(func);

        // Dimension
        const dimFolder = polygonFolder.addFolder("Dimensions");
        dimFolder.add(this.state, "radius", 0, 1).name("radius").onChange(func);
        dimFolder.add(this.state, "points", 3, 20, 1).name("points").onChange(func);
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

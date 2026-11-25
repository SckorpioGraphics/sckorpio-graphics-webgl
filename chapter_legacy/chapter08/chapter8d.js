/* #############################################################
CHAPTER 8d: Multiple Objects

Topics:
- Rendering multiple objects
- A Triangle and a Rectangle
- Separate VAO/VBO for each object
- Different shaders
- Different colors
- Multiple draw calls
- Using vertex colors and uniform colors
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const basicShader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec3 u_color;

    out vec4 out_color;

    void main() {
        out_color = vec4(u_color, 1.0);
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        color: null
    },

    //FUNCTIONS

    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Attributes
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        // uniforms
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

//Shader Object2
const colorVertexShader = {
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
    uniforms: {
    },

    //FUNCTIONS

    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Attributes
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.attributes.color = gl.getAttribLocation(this.program, "a_color");
        // uniforms
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
        -0.5, 0.0,
        -0.3, 0.4,
        -0.1, 0.0
    ]),
    color: [1.0,0.0,0.0],

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
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

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
        // Shader
        gl.useProgram(this.shader.program);
        // Uniform
        gl.uniform3fv(this.shader.uniforms.color,this.color);
        // Bind VAO
        gl.bindVertexArray(this.vao);
        // Draw Call
        gl.drawArrays(
            this.drawMode,
            this.drawOffset,
            this.drawCount
        );
    }
};

const rectangle = {
    //    v1--------v2
    //    | \        |
    //    |    \     |
    //    |       \  |
    //    v0--------v1

    // CPU DATA
    vertexData: new Float32Array([
        0.2, -0.2,  1.0, 0.0, 0.0,  // X,Y , R,G,B
        0.2,  0.2,  0.0, 1.0, 0.0,
        0.6, -0.2,  0.0, 0.0, 1.0,

        0.6, -0.2,  0.0, 0.0, 1.0,
        0.6,  0.2,  1.0, 1.0, 0.0,
        0.2,  0.2,  0.0, 1.0, 0.0
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
        // Shader
        this.shader = shader;

        // Vertex Buffer (single.. intervleaved pos+colors)
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex Positions attrib
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            5 * Float32Array.BYTES_PER_ELEMENT, // Stride (x,y + r,g,b = 5)
            0 * Float32Array.BYTES_PER_ELEMENT  // Offset (pos starts at 0)
        );

        // Vertex Colors attrib
        gl.enableVertexAttribArray(this.shader.attributes.color);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(
            this.shader.attributes.color,
            3,
            gl.FLOAT,
            false,
            5 * Float32Array.BYTES_PER_ELEMENT, // Stride (x,y + r,g,b = 5)
            2 * Float32Array.BYTES_PER_ELEMENT  // Offset (pos starts at 2)
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 6;
    },
    draw(gl) {
        // Shader
        gl.useProgram(this.shader.program);
        // No uniforms

        // Bind VAO
        gl.bindVertexArray(this.vao);
        // Draw Call
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
        basicShader.init(gl);
        colorVertexShader.init(gl);
        triangle.init(gl, basicShader);
        rectangle.init(gl, colorVertexShader);
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
        rectangle.draw(gl);
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

/* #############################################################
CHAPTER 10c: 2D World with Multiple Rectangles

Topics:
- Creating multiple random rectangles
- Vertex data in pixel space
- Inverted Y coordinates
- Pixel space -> clip space using a matrix
- Reusing the same buffer for multiple rectangles
###############################################################
*/


// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform mat3 u_projectionMatrix;

    void main() {
        // Apply pixel space -> clip space matrix
        vec3 clipPostion = u_projectionMatrix * vec3(a_position, 1.0);

        // Convert to clip-space position
        gl_Position = vec4(clipPostion.xy, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec3 u_color;
    out vec4 out_Color;

    void main() {
        out_Color = vec4(u_color, 1.0);
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        projectionMatrix: null,
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
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
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
// CAMERA
// =============================================================
const camera = {
    // Camera bounds
    width: 0,
    height: 0,

    // Projection matrix
    projectionMatrix: mat3.create(),

    // FUNCTIONs
    update(gl) {
        // Match the camera's viewing region
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
    },

    updateProjectionMatrix(gl) {
        // Camera bounds
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        // Create projection matrix
        this.projectionMatrix = mat3.fromValues(
            2 / this.width,  0,                  0,
            0,               2 / this.height,    0,
            -1,              -1,                 1,
        );
    }
};

// =============================================================
// MESHES
// =============================================================
const rectangle = {
    //    v1--------v2
    //    | \        |
    //    |    \     |
    //    |       \  |
    //    v0--------v1

    // CPU DATA (In Pixel Space)
    vertexData: new Float32Array(),

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
        // Data will be set dynamically

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
        this.drawCount = 6;
    },
    setRectangle(gl, x, y, width, height) {
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;

        // Already binded in render() check..
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                x1, y1,
                x2, y1,
                x1, y2,

                x1, y2,
                x2, y1,
                x2, y2
            ]),
            gl.DYNAMIC_DRAW
        );
    },
    draw(gl) {
        // vao
        gl.bindVertexArray(this.vao);
        // vbo
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // Draw 50 random rectangles
        for(let i = 0; i < 50; i++) {
            // Generate rectangle in pixel space
            this.setRectangle(
                gl,
                randomInt(camera.width),
                randomInt(camera.height),
                randomInt(200),
                randomInt(200)
            );
            // Set random color
            gl.uniform3f(
                this.shader.uniforms.color,
                Math.random(),
                Math.random(),
                Math.random()
            );
            // Draw Call
            gl.drawArrays(
                this.drawMode,
                this.drawOffset,
                this.drawCount
            );
        }
    }
};

function randomInt(range) {
    return Math.floor(Math.random() * range);
}

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
        rectangle.init(gl, shader);
    },
    // UPDATE
    update() {
        const gl = this.gl;

        camera.updateProjectionMatrix(gl);
    },
    // RENDER
    render() {
        const gl = this.gl;
        gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

        // Background
        gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
        gl.clear(gl.COLOR_BUFFER_BIT);


        // COMMON UNIFORMS
        //---------------------------------------------------
        gl.useProgram(shader.program);
        // Pass projection matrix to shader
        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix,false,camera.projectionMatrix);

        // RENDER MESHES
        //---------------------------------------------------
        // RANDOM 50 RECTANGLES
        rectangle.draw(gl);
    },
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

/* #############################################################
CHAPTER 9d: 2D Camera

Topics:
- Introducing a 2D camera object
- Manipulating clip Bounds from [-1,1] to anything else
- Defining camera bounds
- Defining clip-space bounds
- Passing camera values to the shader
###############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform vec4 u_cameraBounds;
    uniform vec4 u_clipBounds;

    void main() {

        vec2 pixelSize = vec2(
            u_cameraBounds.y - u_cameraBounds.x,
            u_cameraBounds.w - u_cameraBounds.z
        );

        vec2 zeroToOne = vec2(
            (a_position.x - u_cameraBounds.x) / pixelSize.x,
            (a_position.y - u_cameraBounds.z) / pixelSize.y
        );

        vec2 clipSize = vec2(
            u_clipBounds.y - u_clipBounds.x,
            u_clipBounds.w - u_clipBounds.z
        );

        vec2 clipPosition = vec2(
            u_clipBounds.x + zeroToOne.x * clipSize.x,
            u_clipBounds.z + zeroToOne.y * clipSize.y
        );

        gl_Position = vec4(clipPosition, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    out vec4 out_color;

    void main() {
        out_color = vec4(0.39, 0.33, 0.58, 1.0); // Sckorpio Purple
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        cameraBounds: null,
        clipBounds: null
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
        this.uniforms.cameraBounds = gl.getUniformLocation(this.program, "u_cameraBounds");
        this.uniforms.clipBounds = gl.getUniformLocation(this.program, "u_clipBounds");
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
    //pixel bounds
    left: 0,
    right: 800,
    bottom: 0,
    top: 600,

    //clip bounds
    clipLeft: -0.5,
    clipRight: 0.5,
    clipBottom: -0.5,
    clipTop: 0.5,

    // FUNCTIONs
    update(gl) {
        // Match the camera's viewing region
        this.right = gl.canvas.width;
        this.top = gl.canvas.height;
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
    vertexData: new Float32Array([
        20, 20,       // Left Bottom
        200, 20,      // Right Bottom
        20, 100,      // Left Top

        20, 100,      // Left Top
        200, 20,      // Right Bottom
        200, 100      // Right Top
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
        this.drawCount = 6;
    },
    draw(gl) {
        // Shader
        gl.useProgram(this.shader.program);
        // vao
        gl.bindVertexArray(this.vao);
        // draw calls
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
        rectangle.init(gl, shader);
    },
    // UPDATE
    update() {
        const gl = this.gl;

        camera.update(gl);
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
        // Pass camera bounds to shader
        gl.uniform4f(shader.uniforms.cameraBounds,camera.left,camera.right,camera.bottom,camera.top);
        // Pass clip-space bounds to shader
        gl.uniform4f(shader.uniforms.clipBounds,camera.clipLeft,camera.clipRight,camera.clipBottom,camera.clipTop);

        // RENDER MESHES
        //---------------------------------------------------
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

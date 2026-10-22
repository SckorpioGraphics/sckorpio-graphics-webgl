/* #############################################################
CHAPTER 10a: 2D Space

Topics:
- Creating a basic rectangle
- Vertex data in pixel space
- Uniforms for screen-space data
- Pixel space to clip space conversion
###############################################################
*/


// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform vec2 u_resolution;

    void main() {
        // Pixel space to [0, 1]
        vec2 zeroToOne = a_position / u_resolution;

        // [0, 1] to [0, 2]
        vec2 zeroToTwo = zeroToOne * 2.0;

        // [0, 2] to [-1, 1]
        vec2 clipPostion = zeroToTwo - 1.0;

        gl_Position = vec4(clipPostion, 0.0, 1.0);
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
        resolution: null
    },

    //FUNCTIONS

    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, shader.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Attributes
        this.attributes.position = gl.getAttribLocation(shader.program, "a_position");
        // uniforms
        this.uniforms.resolution = gl.getUniformLocation(shader.program, "u_resolution");
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
        // draw call
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
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

    // COMMON UNIFORMS
    //---------------------------------------------------
    // Shader
    gl.useProgram(shader.program);
    // Uniform: canvas resolution 
    gl.uniform2f(shader.uniforms.resolution,gl.canvas.width,gl.canvas.height);
        

    // RENDER MESHES
    //---------------------------------------------------
    // Rectangle
    rectangle.draw(gl);
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
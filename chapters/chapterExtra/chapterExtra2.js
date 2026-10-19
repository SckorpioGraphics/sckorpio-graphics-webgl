/* #############################################################
SUPPLEMENTAL EXPERIMENT 2: Random Pixel-Space Rectangles

Topics:
- Creating multiple random rectangles
- Vertex data in pixel space
- Inverted Y coordinates
- Pixel space -> clip space using a matrix
- Reusing the same buffer for multiple rectangles
- Updating buffer data between draw calls
###############################################################
*/

// =============================================================
// GLOBAL OBJECTS
// =============================================================
let canvas = null;
let gl = null;

// =============================================================
// Scene Objects
// =============================================================

const rectangle = {
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0
};

// =============================================================
// Shader Objects
// =============================================================

/*
    No UI in this chapter yet.

    The focus here is on generating and rendering
    multiple pixel-space rectangles using one buffer.
*/

const shaderInfo = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform mat3 u_projectionMatrix;

    void main() {
        // Convert vec2 position to homogeneous vec3
        vec3 position = vec3(a_position, 1.0);

        // Apply pixel -> clip space matrix
        vec3 transformedPosition = u_projectionMatrix * position;

        // Convert to clip-space position
        gl_Position = vec4(transformedPosition.xy, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        out_color = u_color;
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        projectionMatrix: null,
        color: null
    }
};

// =============================================================
// FUNCTIONS
// =============================================================

// =============================================================
// Shader Creating Functions
// =============================================================

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

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

function setupShader(gl, shader) {
    // Shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, shader.vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShaderSource);
    // Program
    shader.program = createProgram(gl, vertexShader, fragmentShader);
    // Attributes
    shader.attributes.position = gl.getAttribLocation(shader.program, "a_position");
    // uniforms
    shader.uniforms.projectionMatrix = gl.getUniformLocation(shader.program, "u_projectionMatrix");
    shader.uniforms.color = gl.getUniformLocation(shader.program, "u_color");

}

// =============================================================
// Helper Functions
// =============================================================

function randomInt(range) {
    return Math.floor(Math.random() * range);
}

function setRectangle(gl, x, y, width, height) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

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
        gl.STATIC_DRAW
    );
}

// =============================================================
// Scene Objects Creation Functions
// =============================================================

function setupRectangle(gl, shader) {
    rectangle.shader = shader;

    rectangle.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.vbo);

    rectangle.vao = gl.createVertexArray();
    gl.bindVertexArray(rectangle.vao);

    gl.enableVertexAttribArray(
        rectangle.shader.attributes.position
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.vbo);

    gl.vertexAttribPointer(
        rectangle.shader.attributes.position,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    rectangle.drawMode = gl.TRIANGLES;
    rectangle.drawOffset = 0;
    rectangle.drawCount = 6;
}

// =============================================================
// MAIN
// =============================================================

function main() {
    canvas = document.querySelector("#c");
    if(!canvas) {
        console.error("Canvas element not found");
        return;
    }

    gl = canvas.getContext("webgl2");
    if(!gl) {
        console.error("WebGL2 is not supported by this browser");
        return;
    }

    setupShader(gl, shaderInfo);
    setupRectangle(gl, shaderInfo);

    function render() {
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.32, 0.63, 0.67, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(rectangle.shader.program);

        // ---------------------------------------------------------
        // PIXEL SPACE -> CLIP SPACE MATRIX
        // ---------------------------------------------------------

        const width = gl.canvas.width;
        const height = gl.canvas.height;

        /*
            Pixel -> Clip:

            x' = (2 * x / width) - 1
            y' = 1 - (2 * y / height)

            Matrix:

            |  2/w    0     -1 |
            |   0    -2/h    1 |
            |   0     0      1 |
        */

        const projectionMatrix = mat3.fromValues(
            2 / width,  0,           0,
            0,         -2 / height,  0,
            -1,         1,           1
        );

        gl.uniformMatrix3fv(
            rectangle.shader.uniforms.projectionMatrix,
            false,
            projectionMatrix
        );

        // ---------------------------------------------------------
        // RECTANGLES
        // ---------------------------------------------------------

        gl.bindVertexArray(rectangle.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.vbo);

        // Draw 50 random rectangles
        for(let i = 0; i < 50; i++) {

            // Generate rectangle in pixel space
            setRectangle(
                gl,
                randomInt(width),
                randomInt(height),
                randomInt(200),
                randomInt(200)
            );

            // Set random color
            gl.uniform4f(
                rectangle.shader.uniforms.color,
                Math.random(),
                Math.random(),
                Math.random(),
                1.0
            );

            gl.drawArrays(
                rectangle.drawMode,
                rectangle.drawOffset,
                rectangle.drawCount
            );
        }
        // Request next animation frame
        requestAnimationFrame(render);
    }

    // Request next animation frame
    requestAnimationFrame(render);

    // Execute first render call
    render();

    render();
    window.addEventListener("resize", render);
}

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

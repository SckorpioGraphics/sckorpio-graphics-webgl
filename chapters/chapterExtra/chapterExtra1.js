/* #############################################################
SUPPLEMENTAL EXPERIMENT 1: Animated Line and Render Loop

Topics:
- Pixel-space geometry
- Projection matrix
- Uniform matrix
- Dynamic vertex data
- gl.LINES
- requestAnimationFrame()
- Render loop
###############################################################
*/

// =============================================================
// GLOBAL OBJECTS
// =============================================================
let canvas = null;
let gl = null;

const shaderInfo = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;
    uniform mat3 u_matrix;

    void main() {
        // Transform pixel-space position into clip space
        gl_Position = vec4(
            (u_matrix * vec3(a_position, 1.0)).xy,
            0.0,
            1.0
        );
    }
`,

    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        // Set line color
        out_color = u_color;
    }
`
};

// =============================================================
// FUNCTIONS
// =============================================================

// =============================================================
// Shader Creating Functions
// =============================================================

/**
 * Compiles a GLSL shader.
 */

function createShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS
    );

    if (success) return shader;

    console.error(
        "Shader Compilation Error:",
        gl.getShaderInfoLog(shader)
    );

    gl.deleteShader(shader);
}

/**
 * Links vertex and fragment shaders into a GPU program.
 */

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    const success = gl.getProgramParameter(
        program,
        gl.LINK_STATUS
    );

    if (success) return program;

    console.error(
        "Program Linking Error:",
        gl.getProgramInfoLog(program)
    );

    gl.deleteProgram(program);
}

// =============================================================
// Helper Functions
// =============================================================

/**
 * Uploads two 2D points to the active ARRAY_BUFFER.
 */

function setLineGeometry(gl, x1, y1, x2, y2) {
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            x1, y1,
            x2, y2
        ]),
        gl.DYNAMIC_DRAW
    );
}

// =============================================================
// Camera-Related Matrix Functions
// =============================================================

/**
 * Generates a 3x3 projection matrix converting
 * pixel coordinates into WebGL clip space.
 *
 * Pixel space:
 *     (0,0) → top-left
 *
 * Clip space:
 *     (-1,+1) → top-left
 *     (+1,-1) → bottom-right
 */

function m3Projection(width, height) {
    return new Float32Array([
         2 / width,          0, 0,
                 0, -2 / height, 0,
                -1,          1, 1
    ]);
}

// =============================================================
// MAIN
// =============================================================

function main() {

    // -------------------------------------------------------------
    // 1. WEBGL CANVAS
    // -------------------------------------------------------------

    canvas = document.querySelector("#c");

    if (!canvas) {
        console.error("Canvas element '#c' not found.");
        return;
    }

    // Get WebGL 2.0 context
    gl = canvas.getContext("webgl2");

    if (!gl) {
        console.error(
            "WebGL2 is not supported by this browser."
        );
        return;
    }


    // -------------------------------------------------------------
    // 2. SHADERS & PROGRAM
    // -------------------------------------------------------------

    const vertexShader = createShader(
        gl,
        gl.VERTEX_SHADER,
        shaderInfo.vertexShaderSource
    );

    const fragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaderInfo.fragmentShaderSource
    );

    const program = createProgram(
        gl,
        vertexShader,
        fragmentShader
    );


    // -------------------------------------------------------------
    // 3. ATTRIBUTE & UNIFORM LOCATIONS
    // -------------------------------------------------------------

    const locationAttributePosition =
        gl.getAttribLocation(
            program,
            "a_position"
        );

    const matrixLocation =
        gl.getUniformLocation(
            program,
            "u_matrix"
        );

    const colorLocation =
        gl.getUniformLocation(
            program,
            "u_color"
        );


    // -------------------------------------------------------------
    // 4. DATA & BUFFERS
    // -------------------------------------------------------------

    // Create vertex buffer
    const positionBuffer = gl.createBuffer();


    // =============================================================
    // 5. RENDER LOOP
    // =============================================================

    function render(now) {

        // requestAnimationFrame gives time in milliseconds.
        // Convert it to seconds.
        now *= 0.001;


        // ---------------------------------------------------------
        // CANVAS
        // ---------------------------------------------------------

        resizeCanvasToDisplaySize(gl.canvas);

        gl.viewport(
            0,
            0,
            gl.canvas.width,
            gl.canvas.height
        );


        // ---------------------------------------------------------
        // BACKGROUND
        // ---------------------------------------------------------

        gl.clearColor(
            0.0,
            1.0,
            1.0,
            1.0
        );

        gl.clear(gl.COLOR_BUFFER_BIT);


        // ---------------------------------------------------------
        // SHADER
        // ---------------------------------------------------------

        gl.useProgram(program);


        // ---------------------------------------------------------
        // BUFFER / ATTRIBUTE
        // ---------------------------------------------------------

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            positionBuffer
        );

        gl.enableVertexAttribArray(
            locationAttributePosition
        );

        const size = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;

        gl.vertexAttribPointer(
            locationAttributePosition,
            size,
            type,
            normalize,
            stride,
            offset
        );


        // =========================================================
        // CREATE DYNAMIC LINE
        // =========================================================

        // Calculate a radius large enough for the line
        // to reach beyond the canvas corners.
        const radius =
            Math.sqrt(
                gl.canvas.width ** 2 +
                gl.canvas.height ** 2
            ) * 0.5;


        // Use time as the rotation angle.
        const angle = now;

        const x =
            Math.cos(angle) * radius;

        const y =
            Math.sin(angle) * radius;


        // Canvas center
        const centerX =
            gl.canvas.width * 0.5;

        const centerY =
            gl.canvas.height * 0.5;


        // Two endpoints of the rotating line
        const x1 = centerX + x;
        const y1 = centerY + y;

        const x2 = centerX - x;
        const y2 = centerY - y;


        // Upload new vertex positions
        setLineGeometry(
            gl,
            x1,
            y1,
            x2,
            y2
        );


        // =========================================================
        // PROJECTION
        // =========================================================

        const projectionMatrix =
            m3Projection(
                gl.canvas.width,
                gl.canvas.height
            );


        // Upload projection matrix
        gl.uniformMatrix3fv(
            matrixLocation,
            false,
            projectionMatrix
        );


        // =========================================================
        // COLOR
        // =========================================================

        gl.uniform4fv(
            colorLocation,
            [
                0.39,
                0.33,
                0.58,
                1.0
            ]
        );


        // =========================================================
        // DRAW CALL
        // =========================================================

        const primitiveType = gl.LINES;
        const drawOffset = 0;
        const drawCount = 2;

        gl.drawArrays(
            primitiveType,
            drawOffset,
            drawCount
        );


        // =========================================================
        // NEXT FRAME
        // =========================================================

        requestAnimationFrame(render);
    }


    // Start render loop
    requestAnimationFrame(render);
}

/**
 * Resizes the internal drawing buffer to match CSS display pixels.
 */

function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }

    return false;
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================

window.addEventListener(
    "DOMContentLoaded",
    main
);

export {
    main
};

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
// SHADER OBJECTS
// =============================================================

const shader = {
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
    },
    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// MESHES
// =============================================================

const rectangle = {
    shader: null,
    vao: null,
    vbo: null,
    vertexData: new Float32Array(12),
    drawMode: null,
    drawOffset: 0,
    drawCount: 6,
    init(gl, shader) {
        this.shader = shader;
        this.vbo = gl.createBuffer();
        this.vao = gl.createVertexArray();

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.vertexAttribPointer(this.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

        this.drawMode = gl.TRIANGLES;
    },
    setGeometry(gl, x, y, width, height) {
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;

        this.vertexData.set([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
    },
    draw(gl, width, height) {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Draw 50 random rectangles
        for (let i = 0; i < 50; i++) {
            // Generate rectangle in pixel space
            this.setGeometry(
                gl,
                randomInt(width),
                randomInt(height),
                randomInt(200),
                randomInt(200)
            );

            // Set random color
            gl.uniform4f(
                this.shader.uniforms.color,
                Math.random(),
                Math.random(),
                Math.random(),
                1.0
            );

            gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
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
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element not found");
            return;
        }

        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported by this browser");
        }
    },
    resizeCanvasToDisplaySize() {
        const width = this.canvas.clientWidth | 0;
        const height = this.canvas.clientHeight | 0;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    },
    init() {
        shader.init(this.gl);
        rectangle.init(this.gl, shader);
    },
    render() {
        const gl = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.32, 0.63, 0.67, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(rectangle.shader.program);

        // ---------------------------------------------------------
        // PIXEL SPACE -> CLIP SPACE MATRIX
        // ---------------------------------------------------------

        const width = this.canvas.width;
        const height = this.canvas.height;

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

        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix, false, projectionMatrix);
        rectangle.draw(gl, width, height);
    }
};

// =============================================================
// MAIN
// =============================================================

function appLoop() {
    renderSystem.resizeCanvasToDisplaySize();
    renderSystem.render();
    requestAnimationFrame(appLoop);
}

function appInit() {
    // init renderSystem
    renderSystem.initWebgl();
    renderSystem.init();
}

function main() {
    appInit();
    appLoop();
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================

window.addEventListener("DOMContentLoaded", main);

export {
    main
};

/* #############################################################
CHAPTER 7e: All Types of Uniforms

Topics:
- Just showing all types of Uniforms passing ways
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

    uniform vec4 u_color;

    void main() {
        out_color = mix(v_color, u_color, 0.5);
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
        // Shader
        this.shader = shader;

        // Vertex Buffer (single.. intervleaved pos+colors)
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // data will be updated from the UI during rendering.

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
            0 * Float32Array.BYTES_PER_ELEMENT  // Offset (pos starts ar 0)
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
            2 * Float32Array.BYTES_PER_ELEMENT  // Offset (pos starts ar 2)
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 3;
    },

    updateData(gl) {
        gl.bindVertexArray(triangle.vao);

        // Interleaved vertex data CPU side
        // Each vertex = X, Y, R, G, B
        this.vertexData = new Float32Array([
            gui.state.aX, gui.state.aY,
            gui.state.aR, gui.state.aG, gui.state.aB, // Point A

            gui.state.bX, gui.state.bY,
            gui.state.bR, gui.state.bG, gui.state.bB, // Point B

            gui.state.cX, gui.state.cY,
            gui.state.cR, gui.state.cG, gui.state.cB  // Point C
        ]);

        // Update interleaved vertex data on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    },

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform4fv(this.shader.uniforms.color,[gui.state.r, gui.state.g, gui.state.b, 1.0]);
        gl.bindVertexArray(this.vao);
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
        triangle.init(gl, shader);
    },
    // UPDATE
    update() {
        const gl = this.gl;

        triangle.updateData(gl);
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
        // ---------------------------------------------------------
        // MORE WAYS OF PASSING UNIFORMS
        // ---------------------------------------------------------

        /*
        // Float
        gl.uniform1f(floatUniformLoc, v);
        gl.uniform1fv(floatUniformLoc, [v]);

        // vec2
        gl.uniform2f(vec2UniformLoc, v0, v1);
        gl.uniform2fv(vec2UniformLoc, [v0, v1]);

        // vec3
        gl.uniform3f(vec3UniformLoc, v0, v1, v2);
        gl.uniform3fv(vec3UniformLoc, [v0, v1, v2]);

        // vec4
        gl.uniform4f(vec4UniformLoc, v0, v1, v2, v3);
        gl.uniform4fv(vec4UniformLoc, [v0, v1, v2, v3]);

        // mat2
        gl.uniformMatrix2fv(
            mat2UniformLoc,
            false,
            [4x element array]
        );

        // mat3
        gl.uniformMatrix3fv(
            mat3UniformLoc,
            false,
            [9x element array]
        );

        // mat4
        gl.uniformMatrix4fv(
            mat4UniformLoc,
            false,
            [16x element array]
        );

        // int
        gl.uniform1i(intUniformLoc, v);
        gl.uniform1iv(intUniformLoc, [v]);

        // ivec2
        gl.uniform2i(ivec2UniformLoc, v0, v1);
        gl.uniform2iv(ivec2UniformLoc, [v0, v1]);

        // ivec3
        gl.uniform3i(ivec3UniformLoc, v0, v1, v2);
        gl.uniform3iv(ivec3UniformLoc, [v0, v1, v2]);

        // ivec4
        gl.uniform4i(ivec4UniformLoc, v0, v1, v2, v3);
        gl.uniform4iv(ivec4UniformLoc, [v0, v1, v2, v3]);

        // uint
        gl.uniform1ui(uintUniformLoc, v);
        gl.uniform1uiv(uintUniformLoc, [v]);

        // uvec2
        gl.uniform2ui(uvec2UniformLoc, v0, v1);
        gl.uniform2uiv(uvec2UniformLoc, [v0, v1]);

        // uvec3
        gl.uniform3ui(uvec3UniformLoc, v0, v1, v2);
        gl.uniform3uiv(uvec3UniformLoc, [v0, v1, v2]);

        // uvec4
        gl.uniform4ui(uvec4UniformLoc, v0, v1, v2, v3);
        gl.uniform4uiv(uvec4UniformLoc, [v0, v1, v2, v3]);

        // Samplers:
        // sampler2D, sampler3D, samplerCube,
        // samplerCubeShadow, sampler2DShadow,
        // sampler2DArray, sampler2DArrayShadow

        gl.uniform1i(samplerUniformLoc, v);
        gl.uniform1iv(samplerUniformLoc, [v]);
        */
        triangle.draw(gl);
    },
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
        cR: 0.0, cG: 0.0, cB: 1.0,

        // Uniform Color
        r: 0.0, g: 0.0, b: 0.0
    },

    init(func) {
        const gui = new lil.GUI();

        // ---------------------------------------------------------
        // VERTICES
        // ---------------------------------------------------------

        const verticesFolder = gui.addFolder("Vertices");

        // Point A
        const pointAFolder = verticesFolder.addFolder("Point A");
        pointAFolder.add(this.state, "aX", -1, 1).name("X").onChange(func);
        pointAFolder.add(this.state, "aY", -1, 1).name("Y").onChange(func);

        // Point B
        const pointBFolder = verticesFolder.addFolder("Point B");
        pointBFolder.add(this.state, "bX", -1, 1).name("X").onChange(func);
        pointBFolder.add(this.state, "bY", -1, 1).name("Y").onChange(func);

        // Point C
        const pointCFolder = verticesFolder.addFolder("Point C");
        pointCFolder.add(this.state, "cX", -1, 1).name("X").onChange(func);
        pointCFolder.add(this.state, "cY", -1, 1).name("Y").onChange(func);

        // ---------------------------------------------------------
        // VERTEX COLORS
        // ---------------------------------------------------------

        const colorFolder = gui.addFolder("Color");

        // Point A
        const pointAColorFolder = colorFolder.addFolder("Point A");
        pointAColorFolder.add(this.state, "aR", 0, 1).name("R").onChange(func);
        pointAColorFolder.add(this.state, "aG", 0, 1).name("G").onChange(func);
        pointAColorFolder.add(this.state, "aB", 0, 1).name("B").onChange(func);

        // Point B
        const pointBColorFolder = colorFolder.addFolder("Point B");
        pointBColorFolder.add(this.state, "bR", 0, 1).name("R").onChange(func);
        pointBColorFolder.add(this.state, "bG", 0, 1).name("G").onChange(func);
        pointBColorFolder.add(this.state, "bB", 0, 1).name("B").onChange(func);

        // Point C
        const pointCColorFolder = colorFolder.addFolder("Point C");
        pointCColorFolder.add(this.state, "cR", 0, 1).name("R").onChange(func);
        pointCColorFolder.add(this.state, "cG", 0, 1).name("G").onChange(func);
        pointCColorFolder.add(this.state, "cB", 0, 1).name("B").onChange(func);

        // ---------------------------------------------------------
        // UNIFORM COLOR
        // ---------------------------------------------------------
        const uniformColorFolder = gui.addFolder("Uniform Color");
        uniformColorFolder.add(this.state, "r", 0, 1).name("R").onChange(func);
        uniformColorFolder.add(this.state, "g", 0, 1).name("G").onChange(func);
        uniformColorFolder.add(this.state, "b", 0, 1).name("B").onChange(func);
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

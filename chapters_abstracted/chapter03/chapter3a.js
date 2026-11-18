/* #############################################################
CHAPTER 3a: Creating Multiple Triangles

Topics:
- Multiple triangles in a single draw call
- drawArrays()
###############################################################
*/

// =============================================================
// SHADER
// =============================================================
class Shader {
    constructor(options = {}) {
        this.vertexShaderSource = options.vertexShaderSource;
        this.fragmentShaderSource = options.fragmentShaderSource;

        this.attributeNames = options.attributes || {};
        this.uniformNames = options.uniforms || {};

        this.program = null;
        this.attributes = {};
        this.uniforms = {};
    }

    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

        console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if(gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

        console.error("Program Linking Error:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    init(gl) {
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        if(!vertexShader) {
            return;
        }

        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        if(!fragmentShader) {
            gl.deleteShader(vertexShader);
            return;
        }

        this.program = this.createProgram(gl, vertexShader, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if(!this.program) return;

        for(const [key, name] of Object.entries(this.attributeNames))
            this.attributes[key] = gl.getAttribLocation(this.program, name);

        for(const [key, name] of Object.entries(this.uniformNames))
            this.uniforms[key] = gl.getUniformLocation(this.program, name);
    }
}

// =============================================================
// MESH
// =============================================================
class Mesh {
    constructor(options = {}) {
        // CPU Data
        this.vertexData = options.vertexData;
        this.vertexBufferLayout = options.vertexBufferLayout || [];

        // GPU Data
        this.shader = options.shader;
        this.drawMode = options.drawMode || "TRIANGLES";
        this.drawCount = options.drawCount;
        this.drawOffset = options.drawOffset || 0;
        this.indexType = options.indexType || "UNSIGNED_SHORT";

        // GPU Resources
        this.vao = null;
        this.vbo = null;
        this.ibo = null;
    }

    init(gl) {
        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex Buffer Layout
        for(const layout of this.vertexBufferLayout) {
            const location = this.shader.attributes[layout.attribute];
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, layout.size, gl[layout.type], layout.normalized, layout.stride, layout.offset);
        }

        // Draw Configuration
        this.drawMode = gl[this.drawMode];
        this.indexType = gl[this.indexType];
    }

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
    }
}

// =============================================================
// RENDER SYSTEM
// =============================================================
class RenderSystem {
    constructor(options = {}) {
        this.canvas = null;
        this.gl = null;
        this.clearColor = [];
        this.shaders = {};
        this.meshes = {};
    }

    initWebgl() {
        this.canvas = document.querySelector("#c");
        if(!this.canvas) {
            console.error("Canvas element not found");
            return;
        }

        this.gl = this.canvas.getContext("webgl2");
        if(!this.gl) {
            console.error("WebGL2 is not supported by this browser");
            return;
        }
    }

    resizeCanvasToDisplaySize(multiplier = 1) {
        const width = (this.canvas.clientWidth * multiplier) | 0;
        const height = (this.canvas.clientHeight * multiplier) | 0;

        if(this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    addShader(name, shader) {
        this.shaders[name] = shader;
    }

    getShader(name) {
        return this.shaders[name];
    }

    addMesh(name, mesh) {
        this.meshes[name] = mesh;
    }

    getMesh(name) {
        return this.meshes[name];
    }

    setClearColor(r,g,b,a){
        this.clearColor = [r,g,b,a];
    }

    init() {
        // webgl
        this.initWebgl();
        const gl = this.gl;
        // shaders
        for(const shader of Object.values(this.shaders)) {
            shader.init(gl);
        }
        // meshes
        for(const mesh of Object.values(this.meshes)) {
            mesh.init(gl);
        }
    }

    render() {
        const gl = this.gl;
        // viewport
        this.resizeCanvasToDisplaySize();
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Background
        gl.clearColor(this.clearColor[0],this.clearColor[1],this.clearColor[2],this.clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // render meshes
        for(const mesh of Object.values(this.meshes)){
            mesh.draw(gl);
        }  
    }
}

// =============================================================
// APP
// =============================================================
class App {
    constructor() {
        this.renderSystem = new RenderSystem();
        this.createBaseScene();
        this.createScene();
        this.init();
    }

    createBaseScene() {
        // Shaders
        const basicShader = new Shader({
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
                    out_Color = vec4(0.39, 0.33, 0.58, 1.0);
                }
            `,
            attributes: { position: "a_position" },
            uniforms: {}
        });
        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createScene() {
        // Meshes
        const triangle = new Mesh({
            shader: this.renderSystem.getShader("basicShader"),

            vertexData: new Float32Array([
                //     v1       v4       v7
                //     /\       /\       /\
                //    /  \     /  \     /  \
                //   v0--v2   v3--v5   v6--v8

                -0.8, 0.0,  // v0
                -0.6, 0.4,  // v1
                -0.4, 0.0,  // v2

                -0.3, 0.3,  // v3
                0.0,-0.3,  // v4
                0.3, 0.3,  // v5

                0.4, 0.0,  // v6
                0.6, 0.4,  // v7
                0.8, 0.0   // v8
            ]),

            vertexBufferLayout: [
                {
                    attribute: "position",
                    size: 2,
                    type: "FLOAT",
                    normalized: false,
                    stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                    offset: 0 * Float32Array.BYTES_PER_ELEMENT
                }
            ],

            drawMode: "TRIANGLES",
            drawCount: 9
        });
        // Add to RenderSystem
        this.renderSystem.addMesh("triangle",triangle);
    }

    init() {
        this.renderSystem.init();
    }
    
    play() {
        this.renderSystem.render();
        window.addEventListener("resize", () => this.renderSystem.render());
    }
}

// =============================================================
// MAIN
// =============================================================
function main() {
    const app = new App();
    app.play();
}

window.addEventListener("DOMContentLoaded", main);

export { main };
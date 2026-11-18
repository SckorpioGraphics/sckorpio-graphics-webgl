/* #############################################################
CHAPTER 6b: Multiple Buffers

Topics:
- Using Separate Buffer for Vertex Color
- Adding a basic UI to manipulate
- Vertex vertexPositions
- Vertex color
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
        this.colorData = options.colorData;
        this.indexData = options.indexData || null;
        this.dataUsage = options.dataUsage || "STATIC_DRAW";
        this.vertexBufferLayout = options.vertexBufferLayout || [];
        this.colorBufferLayout = options.colorBufferLayout || [];

        // GPU Data
        this.shader = options.shader;
        this.drawMode = options.drawMode || "TRIANGLES";
        this.drawCount = options.drawCount || 0;
        this.drawOffset = options.drawOffset || 0;
        this.drawType = options.drawType || "UNSIGNED_SHORT";

        // GPU Resources
        this.vao = null;
        this.vbo = null;
        this.ibo = null;
    }

    init(gl) {
        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl[this.dataUsage]);

        // Color Buffer
        this.cbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.colorData, gl[this.dataUsage]);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex Buffer Layout
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        for(const layout of this.vertexBufferLayout) {
            const location = this.shader.attributes[layout.attribute];
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, layout.size, gl[layout.type], layout.normalized, layout.stride, layout.offset);
        }

        // Color Buffer Layout
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
        for(const layout of this.colorBufferLayout) {
            const location = this.shader.attributes[layout.attribute];
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, layout.size, gl[layout.type], layout.normalized, layout.stride, layout.offset);
        }

        // Index Buffer
        if(this.indexData) {
            this.ibo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
            // also set draw count to index counts
            this.drawCount = this.indexData.length;
        }

        // Draw Configuration
        this.drawMode = gl[this.drawMode];
        this.drawType = gl[this.drawType];
    }

    updateVertexData(gl, data) {
        this.vertexData = data;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    }

    updateColorData(gl, data) {
        this.colorData = data;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    }

    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(this.vao);
        if(this.indexData) {
            gl.drawElements(this.drawMode, this.drawCount, this.drawType, this.drawOffset);
        }  
        else {
            gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
        }   
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
// GUI
// =============================================================
class GUI {
    constructor(options = {}) {
        this.renderSystem = options.renderSystem;
        this.gui = new lil.GUI();
        this.state = {};
        this.createTriangleFolder();
    }

    createTriangleFolder() {
        const triangle = this.renderSystem.getMesh("triangle");

        this.state = {
            v1x: -0.5, v1y: 0.0,
            v2x: 0.0, v2y: 0.5,
            v3x: 0.5, v3y: 0.0,

            v1r: 1.0, v1g: 0.0, v1b: 0.0,
            v2r: 0.0, v2g: 1.0, v2b: 0.0,
            v3r: 0.0, v3g: 0.0, v3b: 1.0,
        };

        const triangleFolder = this.gui.addFolder("Triangle");

        const vertexFolder = triangleFolder.addFolder("Vertex");
        const vertex1Folder = vertexFolder.addFolder("Vertex 1");
        vertex1Folder.add(this.state, "v1x", -1, 1).name("X").onChange(() => this.updateTriangle());
        vertex1Folder.add(this.state, "v1y", -1, 1).name("Y").onChange(() => this.updateTriangle());
        const vertex2Folder = vertexFolder.addFolder("Vertex 2");
        vertex2Folder.add(this.state, "v2x", -1, 1).name("X").onChange(() => this.updateTriangle());
        vertex2Folder.add(this.state, "v2y", -1, 1).name("Y").onChange(() => this.updateTriangle());
        const vertex3Folder = vertexFolder.addFolder("Vertex 3");
        vertex3Folder.add(this.state, "v3x", -1, 1).name("X").onChange(() => this.updateTriangle());
        vertex3Folder.add(this.state, "v3y", -1, 1).name("Y").onChange(() => this.updateTriangle());

        const colorFolder = triangleFolder.addFolder("Color");
        const color1Folder = colorFolder.addFolder("Vertex 1");
        color1Folder.add(this.state, "v1r", 0, 1).name("R").onChange(() => this.updateTriangle());
        color1Folder.add(this.state, "v1g", 0, 1).name("G").onChange(() => this.updateTriangle());
        color1Folder.add(this.state, "v1b", 0, 1).name("B").onChange(() => this.updateTriangle());
        const color2Folder = colorFolder.addFolder("Vertex 2");
        color2Folder.add(this.state, "v2r", 0, 1).name("R").onChange(() => this.updateTriangle());
        color2Folder.add(this.state, "v2g", 0, 1).name("G").onChange(() => this.updateTriangle());
        color2Folder.add(this.state, "v2b", 0, 1).name("B").onChange(() => this.updateTriangle());
        const color3Folder = colorFolder.addFolder("Vertex 3");
        color3Folder.add(this.state, "v3r", 0, 1).name("R").onChange(() => this.updateTriangle());
        color3Folder.add(this.state, "v3g", 0, 1).name("G").onChange(() => this.updateTriangle());
        color3Folder.add(this.state, "v3b", 0, 1).name("B").onChange(() => this.updateTriangle());
    }

    updateTriangle() {
        const triangle = this.renderSystem.getMesh("triangle");

        const vertexData = new Float32Array([
            this.state.v1x, this.state.v1y,
            this.state.v2x, this.state.v2y,
            this.state.v3x, this.state.v3y
        ]);

        const colorData = new Float32Array([
            this.state.v1r, this.state.v1g, this.state.v1b,
            this.state.v2r, this.state.v2g, this.state.v2b,
            this.state.v3r, this.state.v3g, this.state.v3b,
        ]);

        triangle.updateVertexData(this.renderSystem.gl, vertexData);
        triangle.updateColorData(this.renderSystem.gl, colorData);
        this.renderSystem.render();
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

        this.gui = new GUI({
            renderSystem: this.renderSystem
        });

        this.init();
    }

    createBaseScene() {
        // Shaders
        const colorVertexShader = new Shader({
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
                precision mediump float;
                in vec4 v_color;
                out vec4 out_Color;

                void main() {
                    out_Color = v_color;
                }
            `,
            attributes: { 
                position: "a_position", 
                color: "a_color" 
            },
            uniforms: {}
        });
        // Add to RenderSystem
        this.renderSystem.addShader("colorVertexShader",colorVertexShader);
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createScene() {
        // Meshes
        const triangle = new Mesh({
            shader: this.renderSystem.getShader("colorVertexShader"),

            // CPU DATA
            vertexData: new Float32Array([
                /*
                        v2
                        /\
                       /  \
                      /    \
                    v0------v1
                */
                
                -0.5, 0.0,
                 0.0, 0.5,
                 0.5, 0.0   
            ]),

            colorData: new Float32Array([
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.0, 1.0   
            ]),

            indexData: new Uint16Array([
                0, 1, 2
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

            colorBufferLayout: [
                {
                    attribute: "color",
                    size: 3,
                    type: "FLOAT",
                    normalized: false,
                    stride: 3 * Float32Array.BYTES_PER_ELEMENT,
                    offset: 0 * Float32Array.BYTES_PER_ELEMENT
                }
            ],

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });
        // Add to RenderSystem
        this.renderSystem.addMesh("triangle",triangle);
    }

    init() {
        this.renderSystem.init();
        return true;
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
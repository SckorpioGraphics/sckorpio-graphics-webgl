/* #############################################################
Chapter 6a: Varying Vertex Color

Topics:
- Using Vertex data itself for Vertex Color
- Adding a basic UI to manipulate
- Vertex vertexData
###############################################################
*/

// =============================================================
// SHADER
// =============================================================
class Shader {
    constructor(options = {}) {
        this.vertexShaderSource = options.vertexShaderSource;
        this.fragmentShaderSource = options.fragmentShaderSource;

        this.program = null;
        this.attributes = options.attributes || {};
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

        for (const attribute of Object.values(this.attributes)) {
            attribute.location = gl.getAttribLocation(this.program, attribute.variable);
        }

    }
}

// =============================================================
// MESH
// =============================================================
class MeshObject {
    constructor(options = {}) {
        // CPU Data
        this.vertexData = options.vertexData;
        this.indexData = options.indexData || null;
        this.dataUsage = options.dataUsage || "STATIC_DRAW";
        this.vertexBufferLayout = options.vertexBufferLayout || [];

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

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex Buffer Layout
        for(const layout of this.vertexBufferLayout) {
            const attribute = this.shader.attributes[layout.attribute];
            const location = attribute.location;
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
        this.meshObjects = {};
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

    addMeshObject(name, mesh) {
        this.meshObjects[name] = mesh;
    }

    getMeshObject(name) {
        return this.meshObjects[name];
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
        for(const meshObject of Object.values(this.meshObjects)) {
            meshObject.init(gl);
        }
    }

    update() {
        const gl = this.gl;
        // resize canvas
        this.resizeCanvasToDisplaySize();
    }

    render() {
        const gl = this.gl;
        // viewport
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Background
        gl.clearColor(this.clearColor[0],this.clearColor[1],this.clearColor[2],this.clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // render meshes
        for(const meshObject of Object.values(this.meshObjects)){
            meshObject.draw(gl);
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
        this.state = {
            v0x: -0.5, v0y: 0.0,
            v1x: 0.0, v1y: 0.5,
            v2x: 0.5, v2y: 0.0
        };
        this.createGUIFolder();
        this.onUpdateGUI();
    }

    createGUIFolder() {
        const triangleFolder = this.gui.addFolder("Triangle");

        const vertex0Folder = triangleFolder.addFolder("Vertex 0");
        vertex0Folder.add(this.state, "v0x", -1, 1).name("X").onChange(() => this.onUpdateGUI());
        vertex0Folder.add(this.state, "v0y", -1, 1).name("Y").onChange(() => this.onUpdateGUI());

        const vertex1Folder = triangleFolder.addFolder("Vertex 1");
        vertex1Folder.add(this.state, "v1x", -1, 1).name("X").onChange(() => this.onUpdateGUI());
        vertex1Folder.add(this.state, "v1y", -1, 1).name("Y").onChange(() => this.onUpdateGUI());

        const vertex2Folder = triangleFolder.addFolder("Vertex 2");
        vertex2Folder.add(this.state, "v2x", -1, 1).name("X").onChange(() => this.onUpdateGUI());
        vertex2Folder.add(this.state, "v2y", -1, 1).name("Y").onChange(() => this.onUpdateGUI());
    }

    onUpdateGUI() {
        const triangle = this.renderSystem.getMeshObject("triangle");

        const vertexData = new Float32Array([
            this.state.v0x, this.state.v0y,
            this.state.v1x, this.state.v1y,
            this.state.v2x, this.state.v2y
        ]);

        triangle.updateVertexData(this.renderSystem.gl, vertexData);
    }
}

// =============================================================
// APP
// =============================================================
class App {
    constructor() {
        this.renderSystem = null;
        this.gui = null;
        this.init();
        this.play();
    }

    init() {
        this.renderSystem = new RenderSystem();
        this.createShaders();
        this.createBaseScene();
        this.createScene();
        this.renderSystem.init();

        this.gui = new GUI({
            renderSystem: this.renderSystem
        });

    }

    createShaders() {
        // Shaders
        const basicShader = new Shader({
            vertexShaderSource: `#version 300 es
                in vec2 a_position;
                out vec4 v_color;

                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_color = gl_Position * 0.5 + 0.5;
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
                position: {
                    variable: "a_position",
                    type: "vec2",
                    location: null
                }
            }
        });
        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createBaseScene() {
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createScene() {
        // Meshes
        const triangle = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),

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

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });
        // Add to RenderSystem
        this.renderSystem.addMeshObject("triangle",triangle);
    }
    
    play() {
        this.renderSystem.update();
        this.renderSystem.render();
        requestAnimationFrame(() => this.play());
    }
}

// =============================================================
// MAIN
// =============================================================
function main() {
    const app = new App();
}

window.addEventListener("DOMContentLoaded", main);

export { main };
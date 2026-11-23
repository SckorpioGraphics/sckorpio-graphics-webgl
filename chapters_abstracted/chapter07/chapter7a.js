/* #############################################################
CHAPTER 7a: Uniform

Topics:
- Adding a basic UI to manipulate
- Brightness of the triangle (as a single float)
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
        this.uniforms = options.uniforms || {};
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

        // save attribute locations
        for (const attribute of Object.values(this.attributes)) {
            attribute.location = gl.getAttribLocation(this.program, attribute.variable);
        }

        // save uniform locations
        for (const uniform of Object.values(this.uniforms)) {
            uniform.location = gl.getUniformLocation(this.program, uniform.variable);
        }
    }

    setUniform(gl, key, value) {
        const uniform = this.uniforms[key];

        if (!uniform || uniform.location === null) return;

        switch (uniform.type) {
            case "float":
                gl.uniform1f(uniform.location, value);
            break;
        }
    }
}

// =============================================================
// MESH
// =============================================================
class Mesh {
    constructor(options = {}) {
        // CPU Data
        this.vertexData = options.vertexData;
        this.indexData = options.indexData || null;
        this.dataUsage = options.dataUsage || "STATIC_DRAW";
        this.vertexBufferLayout = options.vertexBufferLayout || [];
        this.uniforms = options.uniforms || {};

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

    setupShader(gl) {
        gl.useProgram(this.shader.program);

        for (const [key, value] of Object.entries(this.uniforms)) {
            this.shader.setUniform(gl, key, value);
        }
    }

    draw(gl) {
        this.setupShader(gl);

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
        this.createGUIFolder();
    }

    createGUIFolder() {
        const triangle = this.renderSystem.getMesh("triangle");

        this.state = {
            v0x: -0.5, v0y: 0.0,
            v1x: 0.0, v1y: 0.5,
            v2x: 0.5, v2y: 0.0,

            intensity: 1.0
        };

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

        const intensityFolder = triangleFolder.addFolder("Intensity");
        intensityFolder.add(this.state, "intensity", 0, 1).name("Intensity").onChange(() => this.onUpdateGUI());
    }

    onUpdateGUI() {
        const triangle = this.renderSystem.getMesh("triangle");

        const vertexData = new Float32Array([
            this.state.v0x, this.state.v0y,
            this.state.v1x, this.state.v1y,
            this.state.v2x, this.state.v2y
        ]);

        triangle.updateVertexData(this.renderSystem.gl, vertexData);

        triangle.uniforms["intensity"] = this.state.intensity;
        this.renderSystem.render();
    }
}

// =============================================================
// APP
// =============================================================
class App {
    constructor() {
        this.renderSystem = null;
        this.gui = null;
        this.create();
        this.init();
    }

    create() {
        this.renderSystem = new RenderSystem();
        this.createShaders();
        this.createBaseScene();
        this.createScene();

        this.gui = new GUI({
            renderSystem: this.renderSystem
        });
    }

    init() {
        this.renderSystem.init();
        window.addEventListener("resize", () => this.play());
        this.play();
    }

    createShaders() {
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
                uniform float u_intensity;
                out vec4 out_Color;

                void main() {
                    out_Color = vec4(0.39, 0.33, 0.58, 1.0) * u_intensity;
                }
            `,
            attributes: { 
                position: {
                    variable: "a_position",
                    type: "vec2",
                    location: null
                }
            },
            uniforms: { 
                intensity: {
                    variable: "u_intensity",
                    type: "float",
                    location: null
                }
            },

        });
        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
    }

    createBaseScene() {
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createScene() {
        // Meshes
        const triangle = new Mesh({
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

            uniforms: {
                intensity: 1.0
            },

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });
        // Add to RenderSystem
        this.renderSystem.addMesh("triangle",triangle);
    }
    
    play() {
        this.renderSystem.update();
        this.renderSystem.render();
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
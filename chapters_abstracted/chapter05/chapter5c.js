/* #############################################################
CHAPTER 5c: Dynamic Polygon Outline

Topics:
- Learning Topology LINE_LOOP
- Making a Polygon to Circle
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
class Mesh {
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
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl[this.dataUsage]);
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

    updateIndexData(gl, data) {
        this.indexData = data;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        this.drawCount = this.indexData.length;
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
        this.createPolygonFolder();
    }

    createPolygonFolder() {
        const polygon = this.renderSystem.getMesh("polygon");

        this.state = {
            centerX: 0.0,
            centerY: 0.0,
            radius: 0.5,
            points: 6
        };

        const polygonFolder = this.gui.addFolder("Polygon");

        // Center
        const centerFolder = polygonFolder.addFolder("Center");
        centerFolder.add(this.state, "centerX", -1, 1).name("centerX").onChange(() => this.updatePolygon());
        centerFolder.add(this.state, "centerY", -1, 1).name("centerY").onChange(() => this.updatePolygon());

        // Dimension
        const dimFolder = polygonFolder.addFolder("Dimensions");
        dimFolder.add(this.state, "radius", 0, 1).name("radius").onChange(() => this.updatePolygon());
        dimFolder.add(this.state, "points", 3, 20, 1).name("points").onChange(() => this.updatePolygon());
    }

    updatePolygon() {
        const polygon = this.renderSystem.getMesh("polygon");

        // Vertex and index data CPU side
        const vertices = [];
        const indices = [];

        for(let i = 0; i < this.state.points; i++) {
            const angle = (i / this.state.points) * (2 * Math.PI);
            const x = this.state.centerX + Math.cos(angle) * this.state.radius;
            const y = this.state.centerY + Math.sin(angle) * this.state.radius;
            vertices.push(x);
            vertices.push(y);
            indices.push(i);
        }

        console.log(vertices);

        const vertexData = new Float32Array(vertices);
        const indexData = new Uint16Array(indices);

        polygon.updateVertexData(this.renderSystem.gl, vertexData);
        polygon.updateIndexData(this.renderSystem.gl, indexData);
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

    createScene() {
        // Meshes
        const polygon = new Mesh({
            shader: this.renderSystem.getShader("basicShader"),

            // CPU DATA
            /*
                  #5---#4
                /         \
                #0         #3
                \         /
                  #1---#2
            */
            vertexData: new Float32Array([
                -0.6,  0.0,  // v0
                -0.3, -0.6,  // v1
                0.3, -0.6,   // v2
                0.6,  0.0,   // v3
                0.3,  0.6,   // v4
                -0.3,  0.6   // v5
            ]),

            indexData: new Uint16Array([
                0, 1, 2, 3, 4, 5
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

            drawMode: "LINE_LOOP",
            drawType: "UNSIGNED_SHORT"
        });
        // Add to RenderSystem
        this.renderSystem.addMesh("polygon",polygon);
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
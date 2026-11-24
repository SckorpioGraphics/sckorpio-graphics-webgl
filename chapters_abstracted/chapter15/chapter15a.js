/* #############################################################
   CHAPTER 15a: Model Matrix — Transformation Composition

   Topics:
   - Building a Model Matrix(within Shader)
   - Translation, Rotation and Scaling
   - Passing the Model Matrix as a uniform
   - Model → View → Projection
   #############################################################
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

            case "int": 
                gl.uniform1i(uniform.location, value);
                break;

            case "vec2":
                gl.uniform2fv(uniform.location, value);
                break;

            case "vec3":
                gl.uniform3fv(uniform.location, value);
                break;

            case "vec4":
                gl.uniform4fv(uniform.location, value);
                break;

            case "mat3":
                gl.uniformMatrix3fv(uniform.location, false, value);
                break;

            case "mat4":
                gl.uniformMatrix4fv(uniform.location, false, value);
                break;

            case "sampler2D":
                gl.uniform1i(uniform.location, value);
                break;
        }
    }
}

// =============================================================
// CAMERA
// =============================================================
class Camera {
    // Camera bounds
    width = 0;
    height = 0;

    // Camera Position
    positionX = -300;
    positionY = -200;
    // Camera Zoom
    zoom = 1.0;
    // Speed
    panSpeed = 10;
    zoomSpeed = 0.1;

    // Control state
    state = {
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,
        zoomIn: false,
        zoomOut: false
    };

    // View Matrix
    viewMatrix = mat3.create();
    // Projection matrix
    projectionMatrix = mat3.create();

    // FUNCTIONs
    update(gl) {
        // Match the camera's viewing region
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        // Update according to camers states
        if(this.state.panUp) this.positionY += this.panSpeed;
        if(this.state.panDown) this.positionY -= this.panSpeed;
        if(this.state.panLeft) this.positionX -= this.panSpeed;
        if(this.state.panRight) this.positionX += this.panSpeed;
        if(this.state.zoomIn) this.zoom += this.zoomSpeed;
        if(this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);
        // update camera matrices
        this.updateViewMatrix(gl);
        this.updateProjectionMatrix(gl);
    }
    updateViewMatrix(gl) {
        // create View matrix
        const matrix = mat3.create();
        mat3.fromTranslation(matrix, [-this.positionX, -this.positionY]);
        mat3.scale(matrix, matrix, [this.zoom, this.zoom]);
        this.viewMatrix = matrix;
    }
    updateProjectionMatrix(gl) {
        // Camera bounds
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        // Create projection matrix
        this.projectionMatrix = mat3.fromValues(
            2 / this.width,  0,                  0,
            0,               2 / this.height,    0,
            -1,              -1,                 1,
        );
    }
}

// =============================================================
// TRANSFORM
// =============================================================
class Transform {
    constructor(options = {}) {
        this.translation = options.translation ?? [0, 0];
        this.rotation = options.rotation ?? 0;
        this.scale = options.scale ?? [1.0, 1.0];
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

        // Transforms
        this.transform = new Transform(options.transform);

        // Uniforms
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

        // Transforms
        this.shader.setUniform(gl, "translation", this.transform.translation);
        this.shader.setUniform(gl, "rotation", this.transform.rotation);
        this.shader.setUniform(gl, "scale", this.transform.scale);

        // Other uniforms
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
        this.camera = new Camera();
        this.commonUniforms = {
            projectionMatrix: null,
            viewMatrix: null
        };
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
        // update camera
        this.camera.update(gl);
    }

    render() {
        const gl = this.gl;
        // viewport
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Background
        gl.clearColor(this.clearColor[0],this.clearColor[1],this.clearColor[2],this.clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // set common uniforms
        this.commonUniforms["projectionMatrix"] = this.camera.projectionMatrix;
        this.commonUniforms["viewMatrix"] = this.camera.viewMatrix;

        // apply common uniforms to shaders
        for(const shader of Object.values(this.shaders)){
            gl.useProgram(shader.program);

            for (const [key, value] of Object.entries(this.commonUniforms)) {
                shader.setUniform(gl, key, value);
            }
        }
        
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
        this.state = {
            translationX: 300,
            translationY: 200,
            rotation: 30,
            scaleX: 1.4,
            scaleY: 1.4,
        };
        this.createGUIFolder();
        this.onUpdateGUI();
    }

    createGUIFolder() {
        const letterFFolder = this.gui.addFolder("LetterF");

        const transformFolder = letterFFolder.addFolder("Translation");
        transformFolder.add(this.state, "translationX", -1000, 1000).name("translationX").onChange(() => this.onUpdateGUI());
        transformFolder.add(this.state, "translationY", -1000, 1000).name("translationY").onChange(() => this.onUpdateGUI());
        transformFolder.add(this.state, "rotation", 0, 360).name("rotation").onChange(() => this.onUpdateGUI());
        transformFolder.add(this.state, "scaleX", -5, 5).name("scaleX").onChange(() => this.onUpdateGUI());
        transformFolder.add(this.state, "scaleY", -5, 5).name("scaleY").onChange(() => this.onUpdateGUI());
    }

    onUpdateGUI() {
        const letterF = this.renderSystem.getMesh("letterF");
        letterF.transform.translation[0] = this.state.translationX;
        letterF.transform.translation[1] = this.state.translationY;
        letterF.transform.rotation = this.state.rotation;
        letterF.transform.scale[0] = this.state.scaleX;
        letterF.transform.scale[1] = this.state.scaleY;

        this.renderSystem.render();
    }
}

class KeyControls {
    constructor(options = {}) {
        this.renderSystem = options.renderSystem;
        this.createKeyEvents();
    }

    createKeyEvents() {
        window.addEventListener("keydown", event => {
            switch(event.key) {
                case "ArrowUp":
                    this.renderSystem.camera.state.panUp = true;
                    break;
                case "ArrowLeft":
                    this.renderSystem.camera.state.panLeft = true;
                    break;
                case "ArrowDown":
                    this.renderSystem.camera.state.panDown = true;
                    break;
                case "ArrowRight":
                    this.renderSystem.camera.state.panRight = true;
                    break;
                case "+":
                case "=":
                    this.renderSystem.camera.state.zoomIn = true;
                    break;
                case "-":
                case "_":
                    this.renderSystem.camera.state.zoomOut = true;
                    break;
                default:
            }
        });

        window.addEventListener("keyup", event => {
            switch(event.key) {
                case "ArrowUp":
                    this.renderSystem.camera.state.panUp = false;
                    break;
                case "ArrowLeft":
                    this.renderSystem.camera.state.panLeft = false;
                    break;
                case "ArrowDown":
                    this.renderSystem.camera.state.panDown = false;
                    break;
                case "ArrowRight":
                    this.renderSystem.camera.state.panRight = false;
                    break;
                case "+":
                case "=":
                    this.renderSystem.camera.state.zoomIn = false;
                    break;
                case "-":
                case "_":
                    this.renderSystem.camera.state.zoomOut = false;
                    break;
                default:
            }
        });
    }
}

// =============================================================
// APP
// =============================================================
class App {
    constructor() {
        this.renderSystem = null;
        this.gui = null;
        this.keyControls = null;
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

        this.keyControls = new KeyControls({
            renderSystem: this.renderSystem
        });
    }

    createShaders() {
        // Shaders
        const basicShader = new Shader({
            vertexShaderSource: `#version 300 es
                in vec2 a_position;

                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;
                uniform vec2 u_translation;
                uniform float u_rotation;
                uniform vec2 u_scale;

                void main() {
                    vec3 localPosition = vec3(a_position, 1.0);

                    mat3 scaleMatrix = mat3(
                        u_scale.x,   0.0,        0.0,
                        0.0,        u_scale.y,   0.0,
                        0.0,        0.0,        1.0
                    );

                    mat3 rotationMatrix = mat3(
                        cos(radians(u_rotation)),       sin(radians(u_rotation)),   0.0,
                        -sin(radians(u_rotation)),      cos(radians(u_rotation)),   0.0,
                        0.0,                            0.0                     ,   1.0
                    );

                    mat3 translationMatrix = mat3(
                        1.0,                0.0,                0.0,
                        0.0,                1.0,                0.0,
                        u_translation.x,    u_translation.y,    1.0
                    );

                    mat3 modelMatrix = translationMatrix * rotationMatrix * scaleMatrix;
                    vec3 worldPosition = modelMatrix * localPosition;
                    vec3 viewPosition = u_viewMatrix * worldPosition;
                    vec3 clipPosition = u_projectionMatrix * viewPosition;

                    gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
                }
            `,
            fragmentShaderSource: `#version 300 es
                precision mediump float;

                uniform vec4 u_color;

                out vec4 out_Color;

                void main() {
                    out_Color = u_color;
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
                projectionMatrix: {
                    variable: "u_projectionMatrix",
                    type: "mat3",
                    location: null
                },
                viewMatrix: {
                    variable: "u_viewMatrix",
                    type: "mat3",
                    location: null
                },
                translation: {
                    variable: "u_translation",
                    type: "vec2",
                    location: null
                },
                rotation: {
                    variable: "u_rotation",
                    type: "float",
                    location: null
                },
                scale: {
                    variable: "u_scale",
                    type: "vec2",
                    location: null
                },
                color: {
                    variable: "u_color",
                    type: "vec4",
                    location: null
                }
            },

        });
        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
    }

    createGrid() {
        const gridRange = 10000;
        const gridSpacing = 100;
        const gridPositionsData = [];

        // Vertical lines
        for(let x = -gridRange; x <= gridRange; x += gridSpacing) {
            gridPositionsData.push(
                x, -gridRange,
                x, gridRange
            );
        }

        // Horizontal lines
        for(let y = -gridRange; y <= gridRange; y += gridSpacing) {
            gridPositionsData.push(
                -gridRange, y,
                gridRange, y
            );
        }

        const gridVertexData = new Float32Array(gridPositionsData);
        const gridDrawCount = gridPositionsData.length / 2.0;

        const grid = new Mesh({
            renderOrder: 1,

            shader: this.renderSystem.getShader("basicShader"),

            // CPU DATA
            vertexData: gridVertexData,
                /*
                    v1------------v2
                    |--|--|--|--|--|
                    |--|--|--|--|--|
                    |--|--|--|--|--|
                    |--|--|--|--|--|
                    |--|--|--|--|--|
                    v0------------v1
                */

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
                color: [0.5, 0.8, 0.8, 1.0] // Sckorpio Grid Cyan
            },

            drawMode: "LINES",
            drawType: "UNSIGNED_SHORT",
            drawCount: gridDrawCount
        });

        // Add to RenderSystem
        this.renderSystem.addMesh("grid",grid);
    }

    createAxis() {
        const axisRange = 10000;

        const xAxis = new Mesh({
            renderOrder: 2,

            shader: this.renderSystem.getShader("basicShader"),

            // CPU DATA
            vertexData: new Float32Array([
                /*
                    -x------0------+x
                */
                
                -axisRange, 0,
                axisRange,  0
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
                color: [1.0, 0.0, 0.0, 1.0] // RED
            },

            drawMode: "LINES",
            drawType: "UNSIGNED_SHORT",
            drawCount: 2
        });

        const yAxis = new Mesh({
            renderOrder: 2,

            shader: this.renderSystem.getShader("basicShader"),

            // CPU DATA
            vertexData: new Float32Array([
                /*
                    +y
                    |
                    |
                    0
                    |
                    |
                    -y
                */
                
                0, -axisRange,
                0, axisRange,
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
                color: [0.0, 1.0, 0.0, 1.0] // GREEN
            },

            drawMode: "LINES",
            drawType: "UNSIGNED_SHORT",
            drawCount: 2
        });

        // Add to RenderSystem
        this.renderSystem.addMesh("xAxis",xAxis);
        this.renderSystem.addMesh("yAxis",yAxis);
    }

    createBaseScene() {
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);

        // Create BaseScene Meshes
        this.createGrid();
        this.createAxis();
    }

    createScene() {
        // Meshes
        const letterF = new Mesh({
            shader: this.renderSystem.getShader("basicShader"),

            /*
                v2-------v3--------v4
                |\       |\         |
                |\       |   \      |
                | \      |      \   |
                |  \     v6________v5
                |   \    |
                |    \   v7_____v8
                |     \  |  \    |
                |      \ |    \  |
                |       \v10____v9
                |        |
                |        |
                v0_______v1
            */

            // CPU DATA
            vertexData: new Float32Array([
                -100, -100,
                -60 , -100,
                -100,  100,
                -60 ,  100,

                // Top bar
                40  ,  100,
                40  ,   60,
                -60 ,   60,

                // Middle bar
                -60 ,  20,
                0   ,  20,
                0   , -20,
                -60 , -20
            ]),

            indexData: new Uint16Array([
                // LEFT COLUMN
                0, 1, 2,
                2, 1, 3,

                // TOP BAR
                3, 6, 5,
                3, 5, 4,

                // MIDDLE BAR
                7, 10, 9,
                7, 9, 8
            ]),

            dataUsage: "DYNAMIC_DRAW",

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

            transform: {
                translation: [300, 200],
                rotation: 30,
                scale: [1.4, 1.4]
            },

            uniforms: {
                color: [0.39, 0.33, 0.58, 1.0], // Sckorpio Purple
                translationX: 0,
                translationY: 0
            },

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });

        // Add to RenderSystem
        this.renderSystem.addMesh("letterF",letterF);
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
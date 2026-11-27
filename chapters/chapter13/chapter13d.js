/* #############################################################
   Chapter 13d: 2D Transformations — Rotation Around a Pivot
   Topics:
   - Rotating a letterF around a pivot
   - Pivot position
   - Translation to and from the pivot
   - Visualizing the pivot
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

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

        console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

        console.error("Program Linking Error:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    init(gl) {
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        if (!vertexShader) return false;

        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            return false;
        }

        this.program = this.createProgram(gl, vertexShader, fragmentShader);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (!this.program) return false;

        // Attribute locations
        for (const attribute of Object.values(this.attributes)) {
            attribute.location = gl.getAttribLocation(this.program, attribute.variable);
        }

        // Uniform locations
        for (const uniform of Object.values(this.uniforms)) {
            uniform.location = gl.getUniformLocation(this.program, uniform.variable);
        }

        return true;
    }

    setUniform(gl, key, value) {
        const uniform = this.uniforms[key];

        if (!uniform || uniform.location === null) return;

        switch (uniform.type) {
            case "float":
                gl.uniform1f(uniform.location, value);
                break;
            case "int":
            case "sampler2D":
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
        }
    }
}

// =============================================================
// CAMERA
// =============================================================
class Camera {
    width = 0;
    height = 0;

    positionX = -300;
    positionY = -200;
    zoom = 1.0;

    panSpeed = 10;
    zoomSpeed = 0.1;

    state = {
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,
        zoomIn: false,
        zoomOut: false
    };

    viewMatrix = mat3.create();
    projectionMatrix = mat3.create();

    update(gl) {
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        if (this.state.panUp) this.positionY += this.panSpeed;
        if (this.state.panDown) this.positionY -= this.panSpeed;
        if (this.state.panLeft) this.positionX -= this.panSpeed;
        if (this.state.panRight) this.positionX += this.panSpeed;
        if (this.state.zoomIn) this.zoom += this.zoomSpeed;
        if (this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);

        this.updateViewMatrix();
        this.updateProjectionMatrix();
    }

    updateViewMatrix() {
        const matrix = mat3.create();

        mat3.fromTranslation(matrix, [-this.positionX, -this.positionY]);
        mat3.scale(matrix, matrix, [this.zoom, this.zoom]);

        this.viewMatrix = matrix;
    }

    updateProjectionMatrix() {
        this.projectionMatrix = mat3.fromValues(
            2 / this.width, 0, 0,
            0, 2 / this.height, 0,
            -1, -1, 1
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
        this.pivot = options.pivot ?? [0, 0];
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

        // Transform
        this.transform = new Transform(options.transform);

        // Shader and uniforms
        this.shader = options.shader;
        this.uniforms = options.uniforms || {};

        // Draw configuration
        this.drawMode = options.drawMode || "TRIANGLES";
        this.drawCount = options.drawCount || 0;
        this.drawOffset = options.drawOffset || 0;
        this.drawType = options.drawType || "UNSIGNED_SHORT";
        this.renderOrder = options.renderOrder ?? 0;

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
        for (const layout of this.vertexBufferLayout) {
            const attribute = this.shader.attributes[layout.attribute];
            const location = attribute.location;

            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(
                location,
                layout.size,
                gl[layout.type],
                layout.normalized,
                layout.stride,
                layout.offset
            );
        }

        // Index Buffer
        if (this.indexData) {
            this.ibo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl[this.dataUsage]);
            this.drawCount = this.indexData.length;
        }

        // Draw Configuration
        this.drawMode = gl[this.drawMode];
        this.drawType = gl[this.drawType];

        gl.bindVertexArray(null);
    }

    setupShader(gl) {
        gl.useProgram(this.shader.program);

        // Transform uniforms
        this.shader.setUniform(gl, "translation", this.transform.translation);
        this.shader.setUniform(gl, "rotation", this.transform.rotation);
        this.shader.setUniform(gl, "pivot", this.transform.pivot);

        // Other uniforms
        for (const [key, value] of Object.entries(this.uniforms)) {
            this.shader.setUniform(gl, key, value);
        }
    }

    draw(gl) {
        this.setupShader(gl);

        gl.bindVertexArray(this.vao);

        if (this.indexData) {
            gl.drawElements(this.drawMode, this.drawCount, this.drawType, this.drawOffset);
        } else {
            gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
        }
    }
}

// =============================================================
// RENDER SYSTEM
// =============================================================
class RenderSystem {
    constructor() {
        this.canvas = null;
        this.gl = null;

        this.clearColor = [0.32, 0.63, 0.67, 1.0];

        this.shaders = {};
        this.meshObjects = {};

        this.camera = new Camera();

        this.commonUniforms = {
            projectionMatrix: null,
            viewMatrix: null
        };
    }

    initWebgl() {
        this.canvas = document.querySelector("#c");

        if (!this.canvas) {
            console.error("Canvas element not found");
            return false;
        }

        this.gl = this.canvas.getContext("webgl2");

        if (!this.gl) {
            console.error("WebGL2 is not supported by this browser");
            return false;
        }

        return true;
    }

    resizeCanvasToDisplaySize(multiplier = 1) {
        const width = (this.canvas.clientWidth * multiplier) | 0;
        const height = (this.canvas.clientHeight * multiplier) | 0;

        if (this.canvas.width !== width || this.canvas.height !== height) {
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

    setClearColor(r, g, b, a) {
        this.clearColor = [r, g, b, a];
    }

    sortMeshes() {
        this.meshObjects = Object.fromEntries(
            Object.entries(this.meshObjects)
                .sort(([, a], [, b]) => a.renderOrder - b.renderOrder)
        );
    }

    init() {
        if (!this.initWebgl()) return false;

        const gl = this.gl;

        // Initialize Shaders
        for (const shader of Object.values(this.shaders)) {
            if (!shader.init(gl)) return false;
        }

        // Initialize Meshes
        for (const meshObject of Object.values(this.meshObjects)) {
            meshObject.init(gl);
        }

        this.sortMeshes();

        return true;
    }

    update() {
        this.resizeCanvasToDisplaySize();
        this.camera.update(this.gl);
    }

    render() {
        const gl = this.gl;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Background
        gl.clearColor(
            this.clearColor[0],
            this.clearColor[1],
            this.clearColor[2],
            this.clearColor[3]
        );
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Common uniforms
        this.commonUniforms.projectionMatrix = this.camera.projectionMatrix;
        this.commonUniforms.viewMatrix = this.camera.viewMatrix;

        // Apply common uniforms to all shaders
        for (const shader of Object.values(this.shaders)) {
            gl.useProgram(shader.program);

            for (const [key, value] of Object.entries(this.commonUniforms)) {
                shader.setUniform(gl, key, value);
            }
        }

        // Render meshes
        for (const meshObject of Object.values(this.meshObjects)) {
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
        this.state = {};
        this.createGUIFolder();
    }

    createGUIFolder() {
        const letterF = this.renderSystem.getMeshObject("letterF");
        const letterFFolder = this.gui.addFolder("LetterF");

        // Transform
        const transformFolder = letterFFolder.addFolder("Transform");
        transformFolder.add(letterF.transform.translation, 0, -1000, 1000).name("translationX");
        transformFolder.add(letterF.transform.translation, 1, -1000, 1000).name("translationX");
        transformFolder.add(letterF.transform, "rotation", 0, 360).name("rotation");
        transformFolder.add(letterF.transform.pivot, 0, -200, 200).name("pivotX");
        transformFolder.add(letterF.transform.pivot, 1, -200, 200).name("pivotY");
    }
}

// =============================================================
// KEY CONTROLS
// =============================================================
class KeyControls {
    constructor(options = {}) {
        this.renderSystem = options.renderSystem;
        this.createKeyEvents();
    }

    createKeyEvents() {
        window.addEventListener("keydown", event => {
            switch (event.key) {
                case "ArrowUp":
                    this.renderSystem.camera.state.panUp = true;
                    break;
                case "ArrowDown":
                    this.renderSystem.camera.state.panDown = true;
                    break;
                case "ArrowLeft":
                    this.renderSystem.camera.state.panLeft = true;
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
            }
        });

        window.addEventListener("keyup", event => {
            switch (event.key) {
                case "ArrowUp":
                    this.renderSystem.camera.state.panUp = false;
                    break;
                case "ArrowDown":
                    this.renderSystem.camera.state.panDown = false;
                    break;
                case "ArrowLeft":
                    this.renderSystem.camera.state.panLeft = false;
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
            }
        });
    }
}

// =============================================================
// APP
// =============================================================
class App {
    constructor() {
        this.renderSystem = new RenderSystem();

        this.createShaders();
        this.createBaseScene();
        this.createScene();

        if (!this.init()) return;

        this.gui = new GUI({
            renderSystem: this.renderSystem
        });

        this.keyControls = new KeyControls({
            renderSystem: this.renderSystem
        });

        this.play();
    }

    createShaders() {
        const basicShader = new Shader({
            vertexShaderSource: `#version 300 es
                in vec2 a_position;

                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;

                uniform vec2 u_translation;
                uniform float u_rotation;
                uniform vec2 u_pivot;

                void main() {
                    vec3 localPosition = vec3(a_position, 1.0);

                    // Translate to pivot
                    mat3 translateToPivot = mat3(
                        1.0, 0.0, 0.0,
                        0.0, 1.0, 0.0,
                        -u_pivot.x, -u_pivot.y, 1.0
                    );

                    // Rotation
                    mat3 rotationMatrix = mat3(
                        cos(radians(u_rotation)), sin(radians(u_rotation)), 0.0,
                        -sin(radians(u_rotation)), cos(radians(u_rotation)), 0.0,
                        0.0, 0.0, 1.0
                    );

                    // Translate back from pivot
                    mat3 translateBack = mat3(
                        1.0, 0.0, 0.0,
                        0.0, 1.0, 0.0,
                        u_pivot.x, u_pivot.y, 1.0
                    );

                    // Object translation
                    mat3 translationMatrix = mat3(
                        1.0, 0.0, 0.0,
                        0.0, 1.0, 0.0,
                        u_translation.x, u_translation.y, 1.0
                    );

                    vec3 worldPosition =
                        translationMatrix *
                        translateBack *
                        rotationMatrix *
                        translateToPivot *
                        localPosition;

                    vec3 viewPosition = u_viewMatrix * worldPosition;
                    vec3 clipPosition = u_projectionMatrix * viewPosition;

                    gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
                }
            `,

            fragmentShaderSource: `#version 300 es
                precision mediump float;

                uniform vec4 u_color;

                out vec4 outColor;

                void main() {
                    outColor = u_color;
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
                viewMatrix: {
                    variable: "u_viewMatrix",
                    type: "mat3",
                    location: null
                },
                projectionMatrix: {
                    variable: "u_projectionMatrix",
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
                pivot: {
                    variable: "u_pivot",
                    type: "vec2",
                    location: null
                },
                color: {
                    variable: "u_color",
                    type: "vec4",
                    location: null
                }
            }
        });

        this.renderSystem.addShader("basicShader", basicShader);
    }

    createGrid() {
        const range = 10000;
        const spacing = 100;
        const positions = [];

        for (let x = -range; x <= range; x += spacing) {
            positions.push(x, -range, x, range);
        }

        for (let y = -range; y <= range; y += spacing) {
            positions.push(-range, y, range, y);
        }

        const grid = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),
            vertexData: new Float32Array(positions),

            vertexBufferLayout: [{
                attribute: "position",
                size: 2,
                type: "FLOAT",
                normalized: false,
                stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                offset: 0
            }],

            uniforms: {
                color: [0.5, 0.8, 0.8, 1.0]
            },

            drawMode: "LINES",
            drawCount: positions.length / 2,
            renderOrder: 0
        });

        this.renderSystem.addMeshObject("grid", grid);
    }

    createAxis() {
        const range = 10000;

        const xAxis = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),

            vertexData: new Float32Array([
                -range, 0,
                range, 0
            ]),

            vertexBufferLayout: [{
                attribute: "position",
                size: 2,
                type: "FLOAT",
                normalized: false,
                stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                offset: 0
            }],

            uniforms: {
                color: [1, 0, 0, 1]
            },

            drawMode: "LINES",
            drawCount: 2,
            renderOrder: 1
        });

        const yAxis = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),

            vertexData: new Float32Array([
                0, -range,
                0, range
            ]),

            vertexBufferLayout: [{
                attribute: "position",
                size: 2,
                type: "FLOAT",
                normalized: false,
                stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                offset: 0
            }],

            uniforms: {
                color: [0, 1, 0, 1]
            },

            drawMode: "LINES",
            drawCount: 2,
            renderOrder: 1
        });

        this.renderSystem.addMeshObject("xAxis", xAxis);
        this.renderSystem.addMeshObject("yAxis", yAxis);
    }

    createBaseScene() {
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);

        this.createGrid();
        this.createAxis();
    }

    createScene() {
        const letterF = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),

            vertexData: new Float32Array([
                -100, -100,
                -60, -100,
                -100, 100,
                -60, 100,

                40, 100,
                40, 60,
                -60, 60,

                -60, 20,
                0, 20,
                0, -20,
                -60, -20
            ]),

            indexData: new Uint16Array([
                0, 1, 2,
                2, 1, 3,

                3, 6, 5,
                3, 5, 4,

                7, 10, 9,
                7, 9, 8
            ]),

            dataUsage: "STATIC_DRAW",

            vertexBufferLayout: [{
                attribute: "position",
                size: 2,
                type: "FLOAT",
                normalized: false,
                stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                offset: 0
            }],

            transform: {
                translation: [200, 100],
                rotation: 0,
                pivot: [0, 0]
            },

            uniforms: {
                color: [0.39, 0.33, 0.58, 1.0]
            },

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT",
            renderOrder: 2
        });

        const size = 10;

        const pivot = new MeshObject({
            shader: this.renderSystem.getShader("basicShader"),

            vertexData: new Float32Array([
                -size, 0,
                size, 0,
                0, -size,
                0, size
            ]),

            vertexBufferLayout: [{
                attribute: "position",
                size: 2,
                type: "FLOAT",
                normalized: false,
                stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                offset: 0
            }],

            uniforms: {
                color: [0, 0, 1, 1]
            },

            drawMode: "LINES",
            drawCount: 4,
            renderOrder: 3
        });

        this.renderSystem.addMeshObject("pivot", pivot);
        this.renderSystem.addMeshObject("letterF", letterF);
    }

    init() {
        return this.renderSystem.init();
    }

    updateScene() {
        const letterF = this.renderSystem.getMeshObject("letterF");
        const pivot = this.renderSystem.getMeshObject("pivot");

        // Visual pivot position = object translation + local pivot
        pivot.transform.translation[0] =
            letterF.transform.translation[0] + letterF.transform.pivot[0];

        pivot.transform.translation[1] =
            letterF.transform.translation[1] + letterF.transform.pivot[1];

        // The pivot marker itself should not rotate around its own pivot
        pivot.transform.rotation = 0;
        pivot.transform.pivot[0] = 0;
        pivot.transform.pivot[1] = 0;
    }

    play() {
        this.renderSystem.update();
        this.updateScene();
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

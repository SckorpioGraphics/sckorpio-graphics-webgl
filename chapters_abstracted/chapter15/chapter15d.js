/* #############################################################
   CHAPTER 15d: Model Matrix — Multiple Object Composition

   Topics:
   - Multiple objects each having their own model matrix
   - Building a Model Matrix(passing as Uniform)
   - Translation, Rotation and Scaling
   - Passing the Model Matrix as a uniform
   - Model → View → Projection
   #############################################################
*/

// =============================================================
// SHADER OBJECTS
// =============================================================
// Shader Object1
class BasicShader {
    constructor() {
        this.vertexShaderSource = `#version 300 es
    in vec2 a_position;
    uniform mat3 u_modelMatrix;
    uniform mat3 u_viewMatrix;
    uniform mat3 u_projectionMatrix;

    void main() {
        vec3 localPosition = vec3(a_position, 1.0);
        vec3 clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * localPosition;
        gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
    }
        `;
        this.fragmentShaderSource = `#version 300 es
    precision mediump float;
    uniform vec3 u_color;
    out vec4 out_color;
    void main() {
        out_color = vec4(u_color, 1.0);
    }
        `;
        this.program = null;
        this.attributes = { position: null };
        this.uniforms = { modelMatrix: null, viewMatrix: null, projectionMatrix: null, color: null };
    }

    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        if(!vertexShader || !fragmentShader) return false;
        this.program = createProgram(gl, vertexShader, fragmentShader);
        if(!this.program) return false;
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
        return true;
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// CAMERA
// =============================================================
class Camera {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.positionX = -300;
        this.positionY = -200;
        this.zoom = 1.0;
        this.panSpeed = 20;
        this.zoomSpeed = 0.1;
        this.state = {
            panUp: false, panDown: false, panLeft: false, panRight: false,
            zoomIn: false, zoomOut: false
        };
        this.viewMatrix = mat3.create();
        this.projectionMatrix = mat3.create();
    }

    update(gl) {
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        if(this.state.panUp) this.positionY += this.panSpeed;
        if(this.state.panDown) this.positionY -= this.panSpeed;
        if(this.state.panLeft) this.positionX -= this.panSpeed;
        if(this.state.panRight) this.positionX += this.panSpeed;
        if(this.state.zoomIn) this.zoom += this.zoomSpeed;
        if(this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);
    }

    updateViewMatrix(gl) {
        this.update(gl);
        const matrix = mat3.create();
        mat3.fromTranslation(matrix, [-this.positionX, -this.positionY]);
        mat3.scale(matrix, matrix, [this.zoom, this.zoom]);
        this.viewMatrix = matrix;
    }

    updateProjectionMatrix(gl) {
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        this.projectionMatrix = mat3.fromValues(
            2 / this.width, 0, 0,
            0, 2 / this.height, 0,
            -1, -1, 1
        );
    }
}

// =============================================================
// MESHES
// =============================================================
class LetterF {
    constructor(shader, options = {}) {
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
        this.vertexData = new Float32Array([
            -100, -100, -60, -100, -100, 100, -60, 100,
            // Top bar
            40, 100, 40, 60, -60, 60,
            // Middle bar
            -60, 20, 0, 20, 0, -20, -60, -20
        ]);
        this.indices = new Uint16Array([
            // LEFT COLUMN
            0, 1, 2, 2, 1, 3,
            // TOP BAR
            3, 6, 5, 3, 5, 4,
            // MIDDLE BAR
            7, 10, 9, 7, 9, 8
        ]);
        this.translationX = options.translationX ?? 200;
        this.translationY = options.translationY ?? 100;
        this.rotation = options.rotation ?? 0;
        this.scaleX = options.scaleX ?? 1.0;
        this.scaleY = options.scaleY ?? 1.0;
        this.modelMatrix = mat3.create();
        this.color = options.color ?? [0.39, 0.33, 0.58]; // Sckorpio Purple
        this.shader = shader;
        this.vao = null;
        this.vbo = null;
        this.ibo = null;
    }

    init(gl) {
        const shader = this.shader;
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    }

    draw(gl) {
        setupModelMatrix(this);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix, false, this.modelMatrix);
        gl.uniform3fv(this.shader.uniforms.color, this.color); // Sckorpio Purple
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

class Rectangle {
    constructor(shader, options = {}) {
        //    v1--------v2
        //    | \        |
        //    |    \     |
        //    |       \  |
        //    v0--------v1
        // CPU DATA
        this.vertexData = new Float32Array([
            -100, -50,      // Left Bottom
            100, -50,       // Right Bottom
            -100, 50,       // Left Top
            -100, 50,       // Left Top
            100, -50,       // Right Bottom
            100, 50          // Right Top
        ]);
        this.translationX = options.translationX ?? 600;
        this.translationY = options.translationY ?? 300;
        this.rotation = options.rotation ?? 0;
        this.scaleX = options.scaleX ?? 1.0;
        this.scaleY = options.scaleY ?? 1.0;
        this.modelMatrix = mat3.create();
        this.color = options.color ?? [0.39, 0.33, 0.58]; // Sckorpio Purple
        this.shader = shader;
        this.vao = null;
        this.vbo = null;
    }

    init(gl) {
        const shader = this.shader;
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // Vertex data format
        gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    draw(gl) {
        setupModelMatrix(this);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix, false, this.modelMatrix);
        gl.uniform3fv(this.shader.uniforms.color, this.color); // Sckorpio Purple
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

class Grid {
    constructor(shader, options = {}) {
        //    v1------------v2
        //    |--|--|--|--|--|
        //    |--|--|--|--|--|
        //    |--|--|--|--|--|
        //    |--|--|--|--|--|
        //    |--|--|--|--|--|
        //    v0------------v1
        // CPU DATA (In Pixel Space)
        this.spacing = options.spacing ?? 100;
        this.range = options.range ?? 10000;
        this.color = options.color ?? [0.39, 0.33, 0.58]; // Sckorpio Purple
        this.vertexData = new Float32Array();
        this.shader = shader;
        this.vao = null;
        this.vbo = null;
    }

    init(gl) {
        const shader = this.shader;
        const positions = [];
        // Vertical lines
        for(let x = -this.range; x <= this.range; x += this.spacing) {
            positions.push(x, -this.range, x, this.range);
        }
        // Horizontal lines
        for(let y = -this.range; y <= this.range; y += this.spacing) {
            positions.push(-this.range, y, this.range, y);
        }
        this.vertexData = new Float32Array(positions);
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    draw(gl) {
        gl.uniform3fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.LINES, 0, this.vertexData.length / 2);
    }
}

class Axis {
    constructor(shader, options = {}) {
        // X-axis: -x------0------+x; Y-axis: +y above 0, -y below.
        const range = options.range ?? 10000;
        this.vertexData = new Float32Array(options.direction === "x"
            ? [-range, 0, range, 0]
            : [0, -range, 0, range]);
        this.color = options.color ?? [1, 0, 0];
        this.shader = shader;
        this.vao = null;
        this.vbo = null;
    }

    init(gl) {
        const shader = this.shader;
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // Vertex data format
        gl.vertexAttribPointer(
            shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );
    }

    draw(gl) {
        gl.uniform3fv(this.shader.uniforms.color, this.color);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }
}

function setupModelMatrix(mesh) {
    const matrix = mat3.create();
    mat3.translate(matrix, matrix, [mesh.translationX, mesh.translationY]);
    mat3.rotate(matrix, matrix, mesh.rotation * Math.PI / 180);
    mat3.scale(matrix, matrix, [mesh.scaleX, mesh.scaleY]);
    mesh.modelMatrix = matrix;
}

// =============================================================
// RENDER SYSTEM
// =============================================================
class RenderSystem {
    constructor() {
        this.shaders = { basicShader: new BasicShader() };
        this.camera = new Camera();
        this.meshes = {};
        this.textures = {};
        this.canvas = null;
        this.gl = null;
    }

    setMeshes(meshes) {
        this.meshes = meshes;
    }

    initWebgl() {
        this.canvas = document.querySelector("#c");
        if(!this.canvas) {
            console.error("Canvas element not found");
            return false;
        }
        this.gl = this.canvas.getContext("webgl2");
        if(!this.gl) {
            console.error("WebGL2 is not supported by this browser");
            return false;
        }
        return true;
    }

    resizeCanvasToDisplaySize(multiplier = 1) {
        const width = (this.canvas.clientWidth * multiplier) | 0;
        const height = (this.canvas.clientHeight * multiplier) | 0;
        if(this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    init() {
        if (!this.initWebgl()) return false;
        const gl = this.gl;

        // Resources Initialise
        for (const shader of Object.values(this.shaders)) {
            if (!shader.init(gl)) return false;
        }
        for (const texture of Object.values(this.textures)) {
            if (texture.init(gl) === false) return false;
        }
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.textureName) mesh.texture = this.textures[mesh.textureName];
            mesh.init(gl);
        });
        return true;
    }

    // UPDATE
    update() {
        this.camera.updateProjectionMatrix(this.gl);
        this.camera.updateViewMatrix(this.gl);
    }

    // RENDER
    render() {
        const gl = this.gl;
        const shader = this.shaders.basicShader;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
        gl.clear(gl.COLOR_BUFFER_BIT);
        // COMMON UNIFORMS
        gl.useProgram(shader.program);
        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix, false, this.camera.projectionMatrix);
        gl.uniformMatrix3fv(shader.uniforms.viewMatrix, false, this.camera.viewMatrix);
        gl.uniformMatrix3fv(shader.uniforms.modelMatrix, false, mat3.create());
        // RENDER MESHES: grid, X-axis, Y-axis, Letter-F, then Rectangle.
        Object.values(this.meshes).forEach(mesh => mesh.draw(gl));
    }
}

// =============================================================
// APP
// =============================================================

class App {
    constructor() {
        this.renderSystem = new RenderSystem();
        this.createScene();
    }

    createScene() {
        const basicShader = this.renderSystem.shaders.basicShader;
        const meshes = {};
        meshes.grid = new Grid(basicShader);
        meshes.xAxis = new Axis(basicShader, { direction: "x" });
        meshes.yAxis = new Axis(basicShader, { direction: "y", color: [0, 1, 0] });
        meshes.letterF = new LetterF(basicShader);
        meshes.rectangle = new Rectangle(basicShader);

        this.renderSystem.setMeshes(meshes);

    }

    // GUI
    initGUI() {
        const gui = new lil.GUI();
        const letterFFolder = gui.addFolder("Translation");
        const letterF = this.renderSystem.meshes.letterF;
        letterFFolder.add(letterF, "translationX", -1000, 1000).name("translationX");
        letterFFolder.add(letterF, "translationY", -1000, 1000).name("translationY");
        letterFFolder.add(letterF, "rotation", 0, 360).name("rotation");
        letterFFolder.add(letterF, "scaleX", 0.1, 3.0).name("scaleX");
        letterFFolder.add(letterF, "scaleY", 0.1, 3.0).name("scaleY");
        const rectangleFolder = gui.addFolder("Rectangle");
        const rectangle = this.renderSystem.meshes.rectangle;
        rectangleFolder.add(rectangle, "translationX", -1000, 1000).name("translationX");
        rectangleFolder.add(rectangle, "translationY", -1000, 1000).name("translationY");
        rectangleFolder.add(rectangle, "rotation", 0, 360).name("rotation");
        rectangleFolder.add(rectangle, "scaleX", 0.1, 3.0).name("scaleX");
        rectangleFolder.add(rectangle, "scaleY", 0.1, 3.0).name("scaleY");
    }

    // KEY EVENTS
    initKeyEvents() {
        const state = this.renderSystem.camera.state;
        window.addEventListener("keydown", event => {
            switch(event.key) {
                case "ArrowUp": state.panUp = true; break;
                case "ArrowDown": state.panDown = true; break;
                case "ArrowLeft": state.panLeft = true; break;
                case "ArrowRight": state.panRight = true; break;
                case "+": case "=": state.zoomIn = true; break;
                case "-": case "_": state.zoomOut = true; break;
            }
        });
        window.addEventListener("keyup", event => {
            switch(event.key) {
                case "ArrowUp": state.panUp = false; break;
                case "ArrowDown": state.panDown = false; break;
                case "ArrowLeft": state.panLeft = false; break;
                case "ArrowRight": state.panRight = false; break;
                case "+": case "=": state.zoomIn = false; break;
                case "-": case "_": state.zoomOut = false; break;
            }
        });
    }

    init() {
        if(!this.renderSystem.init()) return false;
        this.initGUI();
        this.initKeyEvents();
        this.loop();
        return true;
    }

    loop() {
        this.renderSystem.resizeCanvasToDisplaySize();
        this.renderSystem.update();
        this.renderSystem.render();
        requestAnimationFrame(() => this.loop());
    }
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
function main() {
    const app = new App();
    app.init();
    return app;
}

window.addEventListener("DOMContentLoaded", main);

export { main };

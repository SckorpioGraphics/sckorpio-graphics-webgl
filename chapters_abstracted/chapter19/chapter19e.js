/* #############################################################
   CHAPTER 19e: Using MipMaps
   Topics:
   - Creating texture of size 512*512
   - Also create Mipmaps
   - Aplying on multiple squares of size 64,128,256,512
   - Observe the Blurring is better
   - All UVs 0-1
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
// TEXTURE
// =============================================================
class Texture {
    constructor(options) {
        // file path
        this.filePath = options.filePath;
        // Texture wrapping state
        this.wrapS = options.wrapS ?? "REPEAT";
        this.wrapT = options.wrapT ?? "REPEAT";
        // Texture filtering state
        this.minFilter = options.minFilter ?? "LINEAR";
        this.magFilter = options.magFilter ?? "LINEAR";
        // gpu resources
        this.handle = null;
        this.image = null;
        this.loaded = false;
    }

    bind(gl, textureUnit = 0) {
        // bind texture
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.handle);
        // Set wrapping
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[this.wrapS]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[this.wrapT]);
        // Set Filtering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[this.minFilter]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[this.magFilter]);
    }

    init(gl) {
        this.handle = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, this.handle);

        // Temporary cyan pixel while the image loads.
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([82, 161, 171, 255])
        );

        this.image = new Image();

        this.image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.handle);

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.image
            );

            // Generate mipmap levels from the loaded texture
            gl.generateMipmap(gl.TEXTURE_2D);

            this.loaded = true;
            console.log("Texture loaded:", this.filePath);
        };

        this.image.onerror = () => {
            console.error(
                "Could not load texture image:",
                this.imagePath
            );
        };

        this.image.src = this.filePath;
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
        this.modelMatrix = mat3.create();
        this.updateModelMatrix();
    }

    updateModelMatrix() {
        const matrix = mat3.create();
        mat3.translate(matrix, matrix, [this.translation[0], this.translation[1]]);
        mat3.rotate(matrix, matrix, this.rotation * Math.PI / 180);
        mat3.scale(matrix, matrix, [this.scale[0], this.scale[1]]);
        this.modelMatrix = matrix;
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
        this.texture = options.texture;
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

        // Model Matrix Uniform
        this.shader.setUniform(gl, "modelMatrix", this.transform.modelMatrix);

        // Other uniforms
        for (const [key, value] of Object.entries(this.uniforms)) {
            this.shader.setUniform(gl, key, value);
        }
    }

    setupTexture(gl) {
        if (!this.texture) return;

        this.texture.bind(gl, 0);
        this.shader.setUniform(gl, "texture", 0);
    }

    draw(gl) {
        // Update Model Matrix
        this.transform.updateModelMatrix();
        // Setup shader and uniforms
        this.setupShader(gl);
        // Bind Texture
        this.setupTexture(gl);
        // Vertex Array
        gl.bindVertexArray(this.vao);
        // Draw Call
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
        this.textures = {};
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

    addTexture(name, texture) {
        this.textures[name] = texture;
    }

    getTexture(name) {
        return this.textures[name];
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
        // textures
        for(const texture of Object.values(this.textures)) {
            texture.init(gl);
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
            UVs: {
                uMin: 0.0,
                vMin: 0.0,
                uMax: 1.0,
                vMax: 1.0
            }
        };

        this.flteringModes = {
            minFilterModes: {
                "Linear": "LINEAR",
                "Nearest": "NEAREST",
                "Nearest Mipmap Nearest": "NEAREST_MIPMAP_NEAREST",
                "Linear Mipmap Nearest": "LINEAR_MIPMAP_NEAREST",
                "Nearest Mipmap Linear": "NEAREST_MIPMAP_LINEAR",
                "Linear Mipmap Linear": "LINEAR_MIPMAP_LINEAR"
            },
            magFilterModes: {
                "Linear": "LINEAR",
                "Nearest": "NEAREST"
            }
        };

        this.createGUIFolder();
        this.onUpdateGUI();
    }

    createGUIFolder() {
        // Texture
        const sckorpioTexture = this.renderSystem.getTexture("sckorpioTexture");
        const sckorpioTextureFolder = this.gui.addFolder("SckorpioTexture"); 
        const filteringFolder = sckorpioTextureFolder.addFolder("Filtering");
        filteringFolder.add(sckorpioTexture, "minFilter", this.flteringModes.minFilterModes).name("min Filter"); // Horizontal Wrapping
        filteringFolder.add(sckorpioTexture, "magFilter", this.flteringModes.magFilterModes).name("mag Filter"); // Vertical Wrapping
    }

    onUpdateGUI() {
    
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
        this.createTextures();
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

                uniform mat3 u_modelMatrix;
                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;

                void main() {
                    vec3 modelPosition = u_modelMatrix * vec3(a_position, 1.0);
                    vec3 viewPosition = u_viewMatrix * modelPosition;
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
                modelMatrix: {
                    variable: "u_modelMatrix",
                    type: "mat3",
                    location: null
                },
                color: {
                    variable: "u_color",
                    type: "vec4",
                    location: null
                }
            },

        });

        const textureShader = new Shader({
            vertexShaderSource: `#version 300 es
                in vec2 a_position;
                in vec2 a_texCoord;

                uniform mat3 u_modelMatrix;
                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;

                out vec2 v_texCoord;

                void main() {
                    v_texCoord = a_texCoord;
                    vec3 modelPosition = u_modelMatrix * vec3(a_position, 1.0);
                    vec3 viewPosition = u_viewMatrix * modelPosition;
                    vec3 clipPosition = u_projectionMatrix * viewPosition;
                    gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
                }
            `,
            fragmentShaderSource: `#version 300 es
                precision mediump float;

                uniform sampler2D u_texture;
                in vec2 v_texCoord;
                out vec4 out_color;

                void main() {
                    out_color = texture(u_texture, v_texCoord);
                }
            `,
            attributes: { 
                position: {
                    variable: "a_position",
                    type: "vec2",
                    location: null
                },
                texCoord: {
                    variable: "a_texCoord",
                    type: "vec2",
                    location: null
                },
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
                modelMatrix: {
                    variable: "u_modelMatrix",
                    type: "mat3",
                    location: null
                },
                texture: {
                    variable: "u_texture",
                    type: "sampler2D",
                    location: null
                }
            },

        });

        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
        this.renderSystem.addShader("textureShader",textureShader);
    }

    createTextures() {
        // Textures
        const sckorpioTexture = new Texture({
            filePath: "chapters_abstracted/chapter19/assets/sckorpio_Texture_512.png"
        });

        // Add to RenderSystem
        this.renderSystem.addTexture("sckorpioTexture",sckorpioTexture);
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
        const baseSquareSize = 64;
        let squareSize = 64;
        let squarePosX = 0;

        for(let i = 1; i<=5; i++){
            // create multiple squares
            squareSize = baseSquareSize * i;
            squarePosX += squareSize;

            // square Mesh
            const square = new Mesh({
                shader: this.renderSystem.getShader("textureShader"),
                texture: this.renderSystem.getTexture("sckorpioTexture"),

                // CPU DATA
                vertexData: new Float32Array([
                    /*
                        v3--------v2
                        |       / |
                        |     /   |
                        |   /     |
                        | /       |
                        v0________v1
                    */
                    
                    // Position                           // UV
                    -squareSize/2.0 , -squareSize/2.0,    0, 0,
                    squareSize/2.0,  -squareSize/2.0,     1, 0,
                    squareSize/2.0,   squareSize/2.0,     1, 1,
                    -squareSize/2.0,  squareSize/2.0,     0, 1,
                ]),

                indexData: new Uint16Array([
                    0, 1, 2,
                    0, 2, 3
                ]),

                vertexBufferLayout: [
                    {
                        attribute: "position",
                        size: 2,
                        type: "FLOAT",
                        normalized: false,
                        stride: 4 * Float32Array.BYTES_PER_ELEMENT,
                        offset: 0 * Float32Array.BYTES_PER_ELEMENT
                    },
                    {
                        attribute: "texCoord",
                        size: 2,
                        type: "FLOAT",
                        normalized: false,
                        stride: 4 * Float32Array.BYTES_PER_ELEMENT,
                        offset: 2 * Float32Array.BYTES_PER_ELEMENT
                    }
                ],

                transform: {
                    translation: [squarePosX, 0],
                    rotation: 0,
                    scale: [1.0, 1.0]
                },

                uniforms: {
                    color: [0.39, 0.33, 0.58, 1.0] // Sckorpio Purple
                },

                drawMode: "TRIANGLES",
                drawType: "UNSIGNED_SHORT"
            });
            // Add to RenderSystem
            this.renderSystem.addMesh("square"+i,square);
        }
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
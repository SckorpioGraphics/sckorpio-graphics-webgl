/* #############################################################
Chapter 10c: 2D World with Multiple Rectangles

Topics:
- Creating multiple random rectangles
- Vertex data in pixel space
- Inverted Y coordinates
- Pixel space -> clip space using a matrix
- Reusing the same buffer for multiple rectangles
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
    //camera pixel bounds
    width = 0.0;
    height = 0.0;

    // Projection matrix
    projectionMatrix = mat3.create();

    // FUNCTIONs
    update(gl) {
        // Camera bounds
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        this.updateProjectionMatrix(gl);
    }

    updateProjectionMatrix(gl) {
        // Create projection matrix
        this.projectionMatrix = mat3.fromValues(
            2 / this.width,  0,                  0,
            0,               2 / this.height,    0,
            -1,              -1,                 1,
        );
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
        this.meshObjects = {};
        this.camera = new Camera();
        this.commonUniforms = {
            projectionMatrix: null
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

        // apply common uniforms to shaders
        for(const shader of Object.values(this.shaders)){
            gl.useProgram(shader.program);

            for (const [key, value] of Object.entries(this.commonUniforms)) {
                shader.setUniform(gl, key, value);
            }
        }
        
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
        this.state = {};
        this.createGUIFolder();
        this.onUpdateGUI();
    }

    createGUIFolder() {
        
    }

    onUpdateGUI() {
        
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
                uniform mat3 u_projectionMatrix;

                void main() {
                    vec3 clipPosition = u_projectionMatrix * vec3(a_position, 1.0);
                    gl_Position = vec4(clipPosition.xy,0.0,1.0);
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

    createBaseScene() {
        // Set clear Color (Sckorpio Cyan)
        this.renderSystem.setClearColor(0.32, 0.63, 0.67, 1.0);
    }

    createScene() {
        // Meshes

        const rectSizeLimit = 200;
        const rectPosLimit = 1000;
        // Draw 50 random rectangles
        for(let i = 0; i < 50; i++) {

            const x = Math.floor(Math.random() * rectPosLimit);
            const y = Math.floor(Math.random() * rectPosLimit);
            const w = Math.floor(Math.random() * rectSizeLimit);
            const h = Math.floor(Math.random() * rectSizeLimit);

            const r = Math.random();
            const g = Math.random();
            const b = Math.random();
            
            const rectangle = new MeshObject({
                shader: this.renderSystem.getShader("basicShader"),

                // CPU DATA
                vertexData: new Float32Array([
                    /*
                        v3--------v2
                        | \        |
                        |   \      |
                        |     \    |
                        |       \  |
                        v0________v1
                    */
                    
                    x,      y,
                    x + w,  y,
                    x + w,  y + h,
                    x,      y + h
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
                        stride: 2 * Float32Array.BYTES_PER_ELEMENT,
                        offset: 0 * Float32Array.BYTES_PER_ELEMENT
                    }
                ],

                uniforms: {
                    color: [r, g, b, 1.0]
                },

                drawMode: "TRIANGLES",
                drawType: "UNSIGNED_SHORT"
            });

            this.renderSystem.addMeshObject("rectangle"+i,rectangle);
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
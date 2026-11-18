/* #############################################################
CHAPTER 8d: Multiple Objects with Different shaders

Topics:
- Rendering multiple objects
- A Triangle and a Rectangle
- Separate VAO/VBO for each object
- Different shaders
- Different colors
- Multiple draw calls
- Using vertex colors and uniform colors
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
        //this.gui = new lil.GUI();
        this.state = {};
        this.createGUIFolder();
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
                color: {
                    variable: "u_color",
                    type: "vec4",
                    location: null
                }
            },

        });

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
                position: {
                    variable: "a_position",
                    type: "vec2",
                    location: null
                },
                color: {
                    variable: "a_color",
                    type: "vec3",
                    location: null
                }
            }
        });

        // Add to RenderSystem
        this.renderSystem.addShader("basicShader",basicShader);
        this.renderSystem.addShader("colorVertexShader",colorVertexShader);

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
                -0.3, 0.4,
                -0.1, 0.0
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
                color: [1.0, 0.0, 0.0, 1.0]
            },

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });

        const rectangle = new Mesh({
            shader: this.renderSystem.getShader("colorVertexShader"),

            // CPU DATA
            vertexData: new Float32Array([
                /*
                    v3--------v2
                    |       /  |
                    |    /     |
                    |  /       |
                    v0--------v1
                */
                
                0.2, -0.2,          //X, Y
                1.0, 0.0, 0.0,      //R, G, B

                0.6, -0.2,          //X, Y
                0.0, 1.0, 0.0,      //R, G, B

                0.6, 0.2,           //X, Y
                0.0, 0.0, 1.0,      //R, G, B   

                0.2, 0.2,           //X, Y
                1.0, 1.0, 0.0       //R, G, B   
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
                    stride: 5 * Float32Array.BYTES_PER_ELEMENT,
                    offset: 0 * Float32Array.BYTES_PER_ELEMENT
                },
                {
                    attribute: "color",
                    size: 3,
                    type: "FLOAT",
                    normalized: false,
                    stride: 5 * Float32Array.BYTES_PER_ELEMENT,
                    offset: 2 * Float32Array.BYTES_PER_ELEMENT
                }
            ],

            drawMode: "TRIANGLES",
            drawType: "UNSIGNED_SHORT"
        });

        // Add to RenderSystem
        this.renderSystem.addMesh("triangle",triangle);
        this.renderSystem.addMesh("rectangle",rectangle);
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
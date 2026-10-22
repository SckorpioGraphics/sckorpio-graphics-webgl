/* #############################################################
   CHAPTER 15a: 2D Transformations — Scale

   Topics:
   - Uniform scaling of a letterF
   - GUI camera controls
   - Using scale directly
   - Object scaling
   #############################################################
*/


// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const shader = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform mat3 u_viewMatrix;
    uniform mat3 u_projectionMatrix;
    uniform float u_translationX;
    uniform float u_translationY;
    uniform float u_rotation;
    uniform float u_scale;

    void main() {
        float scaledX = a_position.x * u_scale;
        float scaledY = a_position.y * u_scale;

        vec3 localPosition = vec3(scaledX, scaledY, 1.0);

        mat3 rotationMatrix = mat3(
            cos(radians(u_rotation)),  sin(radians(u_rotation)),    0.0,
           -sin(radians(u_rotation)),  cos(radians(u_rotation)),    0.0,
            0.0,                       0.0,                         1.0
        );

        mat3 translationMatrix = mat3(
            1.0,            0.0,            0.0,
            0.0,            1.0,            0.0,
            u_translationX, u_translationY, 1.0
        );

        vec3 worldPosition = translationMatrix * rotationMatrix * localPosition;
        vec3 viewPosition = u_viewMatrix * worldPosition;
        vec3 clipPosition = u_projectionMatrix * viewPosition;

        gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
    }
`,
    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec3 u_color;

    out vec4 out_color;

    void main() {
        out_color = vec4(u_color, 1.0);
    }
`,
    program: null,
    attributes: {
        position: null
    },
    uniforms: {
        translationX: null,
        translationY: null,
        rotation: null,
        viewMatrix: null,
        projectionMatrix: null,
        color: null
    },

    //FUNCTIONS
    init(gl) {
        // Compile shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        // Create shader program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // Attributes
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        // uniforms
        this.uniforms.translationX = gl.getUniformLocation(this.program, "u_translationX");
        this.uniforms.translationY = gl.getUniformLocation(this.program, "u_translationY");
        this.uniforms.rotation = gl.getUniformLocation(this.program, "u_rotation");
        this.uniforms.scale = gl.getUniformLocation(this.program, "u_scale");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

// Compile Shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if(compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

// Link Program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);

    if(linkStatus) return program;

    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

// =============================================================
// CAMERA
// =============================================================
const camera = {
    // Camera Data
    width: 0,
    height: 0,
    positionX: -300,
    positionY: -200,
    zoom: 1.0,
    panSpeed: 20,
    zoomSpeed: 0.1,

    // Control state
    state: {
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,
        zoomIn: false,
        zoomOut: false
    },

    // View Matrix
    viewMatrix: mat3.create(),
    // Projection matrix
    projectionMatrix: mat3.create(),

    // FUNCTIONs
    update(gl) {
        // Match the camera's viewing region
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;
        // Update the pos and zooms
        if(this.state.panUp) this.positionY += this.panSpeed;
        if(this.state.panDown) this.positionY -= this.panSpeed;
        if(this.state.panLeft) this.positionX -= this.panSpeed;
        if(this.state.panRight) this.positionX += this.panSpeed;
        if(this.state.zoomIn) this.zoom += this.zoomSpeed;
        if(this.state.zoomOut) this.zoom = Math.max(0.1, this.zoom - this.zoomSpeed);
    },
    updateViewMatrix(gl) {
        // Update Camera values first
        this.update(gl);
        // Create View matrix
        const matrix = mat3.create();
        mat3.fromTranslation(matrix, [-camera.positionX, -camera.positionY]);
        mat3.scale(matrix, matrix, [camera.zoom, camera.zoom]);
        camera.viewMatrix = matrix;
    },
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
};

// =============================================================
// MESHES
// =============================================================
const letterF = {
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
        -60,   60,

        // Middle bar
        -60,  20,
        0   ,  20,
        0   , -20,
        -60, -20
    ]),
    indices: new Uint16Array([
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
    translationX: 200,
    translationY: 100,
    rotation: 0,
    scale: 1.0,
    color: [0.39, 0.33, 0.58], // Sckorpio Purple

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        // Shader
        this.shader = shader;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);

        // Index Buffer
        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Attrib
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(this.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

        // Draw Data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = this.indices.length;
        this.drawType = gl.UNSIGNED_SHORT;
    },
    draw(gl) {
        // Shader
        gl.useProgram(this.shader.program);
        // Pass translateX & translateY
        gl.uniform1f(this.shader.uniforms.translationX, this.translationX);
        gl.uniform1f(this.shader.uniforms.translationY, this.translationY);
        // Pass Rotation
        gl.uniform1f(this.shader.uniforms.rotation, this.rotation);
        // Pass Scale
        gl.uniform1f(this.shader.uniforms.scale, this.scale);
        // Pass Color
        gl.uniform3fv(this.shader.uniforms.color,this.color);
        // VAO
        gl.bindVertexArray(this.vao);
        // draw call
        gl.drawElements(this.drawMode,this.drawCount,this.drawType,this.drawOffset);
    }
};

const grid = {
    //    v1------------v2
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    |--|--|--|--|--|
    //    v0------------v1

    // CPU DATA
    vertexData: new Float32Array(),
    spacing: 100,
    range: 10000,
    color: [0.39, 0.33, 0.58], // Sckorpio Purple

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        const positions = [];
    
        // Vertical lines
        for(let x = -this.range; x <= this.range; x += this.spacing) {
            positions.push(
                x, -this.range,
                x, this.range
            );
        }

        // Horizontal lines
        for(let y = -this.range; y <= this.range; y += this.spacing) {
            positions.push(
                -this.range, y,
                this.range, y
            );
        }

        this.vertexData = new Float32Array(positions);
        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Attrib
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        //Draw Data
        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = positions.length / 2;
    },
    draw(gl) {
        gl.uniform3fv(this.shader.uniforms.color,this.color);   
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

const xAxis = {
    //    -x------0------+x
    // CPU DATA
    vertexData: new Float32Array([
        -grid.range, 0,
        grid.range, 0
    ]),
    color: [1.0, 0.0, 0.0], // Red

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.uniform3fv(this.shader.uniforms.color,this.color);   
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

const yAxis = {
    //      +y
    //      |
    //      |
    //      0
    //      |
    //      |
    //      -y

    // CPU DATA
    vertexData: new Float32Array([
        0, -grid.range,
        0, grid.range
    ]),
    color: [0.0, 1.0, 0.0], // Green

    //GPU DATA
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader) {
        this.shader = shader;

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER,this.vertexData,gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        gl.enableVertexAttribArray(this.shader.attributes.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

       // Vertex data format
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                      // size: 2 components (X, Y)
            gl.FLOAT,                               // type: 32-bit float
            false,                                  // normalize
            2 * Float32Array.BYTES_PER_ELEMENT,     // stride: 2
            0                                       // offset: start of buffer
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.uniform3fv(this.shader.uniforms.color,this.color);   
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

// =============================================================
// GUI 
// =============================================================
const gui = {
    init(gl) {
        const gui = new lil.GUI();
        
        const letterFFolder = gui.addFolder("Translation");
        letterFFolder.add(letterF, "translationX", -1000, 1000).name("translationX");
        letterFFolder.add(letterF, "translationY", -1000, 1000).name("translationY");
        letterFFolder.add(letterF, "rotation", 0, 360).name("rotation");
        letterFFolder.add(letterF, "scale", 0.1, 3.0).name("scale");
    }
};

// =============================================================
// KEY EVENTS 
// =============================================================
const keyEvent = {
    init(render) {
        window.addEventListener("keydown", event => {
            switch(event.key) {
                case "ArrowUp":
                    camera.state.panUp = true;
                    break;
                case "ArrowLeft":
                    camera.state.panLeft = true;
                    break;
                case "ArrowDown":
                    camera.state.panDown = true;
                    break;
                case "ArrowRight":
                    camera.state.panRight = true;
                    break;
                case "+":
                case "=":
                    camera.state.zoomIn = true;
                    break;
                case "-":
                case "_":
                    camera.state.zoomOut = true;
                    break;
                default:
            }
        });

        window.addEventListener("keyup", event => {
            switch(event.key) {
                case "ArrowUp":
                    camera.state.panUp = false;
                    break;
                case "ArrowLeft":
                    camera.state.panLeft = false;
                    break;
                case "ArrowDown":
                    camera.state.panDown = false;
                    break;
                case "ArrowRight":
                    camera.state.panRight = false;
                    break;
                case "+":
                case "=":
                    camera.state.zoomIn = false;
                    break;
                case "-":
                case "_":
                    camera.state.zoomOut = false;
                    break;
                default:
            }
        });
    }
};

// =============================================================
// RENDER
// =============================================================
function render(gl) {
    // Canvas
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0,0,gl.canvas.width,gl.canvas.height);

    // Background
    gl.clearColor(0.32, 0.63, 0.67, 1.0); // Sckorpio Cyan
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Camera 
    camera.updateProjectionMatrix(gl);
    camera.updateViewMatrix(gl);

    // COMMON UNIFORMS
    //---------------------------------------------------
    // Shader
    gl.useProgram(shader.program);
    // Pass projection matrix to shader
    gl.uniformMatrix3fv(shader.uniforms.projectionMatrix,false,camera.projectionMatrix);
    // Pass View matrix to shader
    gl.uniformMatrix3fv(shader.uniforms.viewMatrix,false,camera.viewMatrix);
    // Use default translateX/Y & Rotations
    gl.uniform1f(shader.uniforms.translationX, 0);
    gl.uniform1f(shader.uniforms.translationY, 0);
    gl.uniform1f(shader.uniforms.rotation, 0);
    gl.uniform1f(shader.uniforms.scale, 1.0);
    
    // RENDER MESHES
    //---------------------------------------------------
    // Grid
    grid.draw(gl);
    // X-Axis
    xAxis.draw(gl);
    // Y-Axis
    yAxis.draw(gl);
    // Letter-F
    letterF.draw(gl);

    //---------------------------------------------------
    // LOOP
    requestAnimationFrame(() => render(gl));
}

// =============================================================
// MAIN
// =============================================================
function main() {
    //Canvas
    const canvas = document.querySelector("#c");
    if(!canvas) {console.error("Canvas element not found");return;}

    //Context
    const gl = canvas.getContext("webgl2");
    if(!gl) {console.error("WebGL2 is not supported by this browser");return;}

    //GUI
    gui.init(gl);

    //KeyEvents
    keyEvent.init(() => render(gl));

    //Shaders
    shader.init(gl);

    //Objects
    letterF.init(gl, shader);
    grid.init(gl, shader);
    xAxis.init(gl, shader);
    yAxis.init(gl, shader);

    //Render
    render(gl);

    //Resize
    window.addEventListener("resize", () => render(gl));
}

// =============================================================
// HELPER FUNCS
// =============================================================
// Resize Canvas
function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;

    if(canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }

    return false;
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
window.addEventListener("DOMContentLoaded", main);

export {
    main
};
/* #############################################################
   CHAPTER 23e: Multiple Animation Instances

   Topics:
   - Multiple animation instances
   - Multiple objects
   - Independent animation behavior
   - Base object position
   #############################################################
*/

// =============================================================
// GLOBAL DATA
// =============================================================

// Canvas / WebGL Context

// Shader Objects
const shaderInfo = {
    vertexShaderSource: `#version 300 es
    in vec2 a_position;

    uniform mat3 u_modelMatrix;
    uniform mat3 u_viewMatrix;
    uniform mat3 u_projectionMatrix;

    void main() {
        vec3 localPosition = vec3(a_position, 1.0);
        vec3 clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * localPosition;
        gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
    }
`,

    fragmentShaderSource: `#version 300 es
    precision mediump float;

    uniform vec4 u_color;

    out vec4 out_color;

    void main() {
        out_color = u_color;
    }
`,

    program: null,

    attributes: {
        position: null
    },

    uniforms: {
        viewMatrix: null,
        projectionMatrix: null,
        modelMatrix: null,
        color: null
    }
};

// =============================================================
// CAMERA
// =============================================================
const camera = {
    x: -300,
    y: -200,
    zoom: 1.0,
    panSpeed: 10,
    zoomSpeed: 0.1,
    viewMatrix: null,
    projectionMatrix: null
};

const controls = {
    panUp: false,
    panLeft: false,
    panDown: false,
    panRight: false,
    panZoomIn: false,
    panZoomOut: false
};

// =============================================================
// SCENE OBJECTS
// =============================================================
const grid = {
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0
};

const xAxis = {
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0
};

const yAxis = {
    shader: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0
};

const square = {
    baseX: 200,
    baseY: 0,
    positionX: 200,
    positionY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: [1.0, 0.0, 0.0],
    vao: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 6,
    modelMatrix: null
};

const rectangle = {
    baseX: 0,
    baseY: 200,
    positionX: 0,
    positionY: 200,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: [0.0, 1.0, 0.0],
    vao: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 6,
    modelMatrix: null
};

const triangle = {
    baseX: -200,
    baseY: 0,
    positionX: -200,
    positionY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: [0.0, 0.0, 1.0],
    vao: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 3,
    modelMatrix: null
};

// =============================================================
// ANIMATION 1 — SQUARE
// =============================================================
const animation1Info = {
    startTime: 0,
    elapsedTime: 0,

    positionX: 0,
    positionY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,

    update(time) {
        if(this.startTime === 0) {
            this.startTime = time;
        }

        this.elapsedTime = (time - this.startTime) * 0.001;

        // Oscillating X
        this.positionX = Math.sin(this.elapsedTime) * 150;
    }
};

// =============================================================
// ANIMATION 2 — RECTANGLE
// =============================================================
const animation2Info = {
    startTime: 0,
    elapsedTime: 0,

    positionX: 0,
    positionY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,

    update(time) {
        if(this.startTime === 0) {
            this.startTime = time;
        }

        this.elapsedTime = (time - this.startTime) * 0.001;

        // Continuous rotation
        this.rotation = this.elapsedTime;
    }
};

// =============================================================
// ANIMATION 3 — TRIANGLE
// =============================================================
const animation3Info = {
    startTime: 0,
    elapsedTime: 0,

    positionX: 0,
    positionY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,

    update(time) {
        if(this.startTime === 0) {
            this.startTime = time;
        }

        this.elapsedTime = (time - this.startTime) * 0.001;

        // Pulsing scale
        const scale = 1 + Math.sin(this.elapsedTime * 2) * 0.5;

        this.scaleX = scale;
        this.scaleY = scale;
    }
};

// =============================================================
// ANIMATIONS
// =============================================================
function applyAnimation(animation, object) {
    object.positionX = object.baseX + animation.positionX;
    object.positionY = object.baseY + animation.positionY;
    object.rotation = animation.rotation;
    object.scaleX = animation.scaleX;
    object.scaleY = animation.scaleY;
}

function updateAnimations(time) {
    animation1Info.update(time);
    animation2Info.update(time);
    animation3Info.update(time);

    applyAnimation(animation1Info, square);
    applyAnimation(animation2Info, rectangle);
    applyAnimation(animation3Info, triangle);
}

// =============================================================
// FUNCTIONS
// =============================================================

// =============================================================
// Shader Creating Functions
// =============================================================
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(compileStatus) return shader;

    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

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

function setupShader(gl, shader) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, shader.vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShaderSource);

    shader.program = createProgram(gl, vertexShader, fragmentShader);

    shader.attributes.position = gl.getAttribLocation(shader.program, "a_position");

    shader.uniforms.viewMatrix = gl.getUniformLocation(shader.program, "u_viewMatrix");
    shader.uniforms.projectionMatrix = gl.getUniformLocation(shader.program, "u_projectionMatrix");
    shader.uniforms.modelMatrix = gl.getUniformLocation(shader.program, "u_modelMatrix");
    shader.uniforms.color = gl.getUniformLocation(shader.program, "u_color");
}

// =============================================================
// Helper Functions
// =============================================================
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
// Camera / Matrix Functions
// =============================================================
function updateCamera() {
    if(controls.panUp) camera.y += camera.panSpeed;
    if(controls.panLeft) camera.x -= camera.panSpeed;
    if(controls.panDown) camera.y -= camera.panSpeed;
    if(controls.panRight) camera.x += camera.panSpeed;
    if(controls.panZoomIn) camera.zoom += camera.zoomSpeed;
    if(controls.panZoomOut) camera.zoom = Math.max(0.1, camera.zoom - camera.zoomSpeed);
}

function setupProjectionMatrix(gl) {
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    camera.projectionMatrix = mat3.fromValues(
        2 / width, 0, 0,
        0, 2 / height, 0,
        -1, -1, 1
    );
}

function setupViewMatrix() {
    const matrix = mat3.create();

    mat3.fromTranslation(matrix, [-camera.x, -camera.y]);
    mat3.scale(matrix, matrix, [camera.zoom, camera.zoom]);

    camera.viewMatrix = matrix;
}

function setupModelMatrix(object) {
    const matrix = mat3.create();

    mat3.translate(matrix, matrix, [object.positionX, object.positionY]);
    mat3.rotate(matrix, matrix, object.rotation);
    mat3.scale(matrix, matrix, [object.scaleX, object.scaleY]);

    object.modelMatrix = matrix;
}

// =============================================================
// Scene Object Creation Functions
// =============================================================
function setupGrid(gl, shader) {
    grid.shader = shader;

    const positions = [];
    const spacing = 100;
    const range = 10000;

    for(let x = -range; x <= range; x += spacing) {
        positions.push(x, -range, x, range);
    }

    for(let y = -range; y <= range; y += spacing) {
        positions.push(-range, y, range, y);
    }

    grid.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    grid.vao = gl.createVertexArray();
    gl.bindVertexArray(grid.vao);
    gl.enableVertexAttribArray(grid.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.vbo);
    gl.vertexAttribPointer(grid.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    grid.drawMode = gl.LINES;
    grid.drawOffset = 0;
    grid.drawCount = positions.length / 2;
}

function setupXAxis(gl, shader) {
    xAxis.shader = shader;

    const positions = new Float32Array([
        -10000, 0,
         10000, 0
    ]);

    xAxis.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, xAxis.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    xAxis.vao = gl.createVertexArray();
    gl.bindVertexArray(xAxis.vao);
    gl.enableVertexAttribArray(xAxis.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, xAxis.vbo);
    gl.vertexAttribPointer(xAxis.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    xAxis.drawMode = gl.LINES;
    xAxis.drawOffset = 0;
    xAxis.drawCount = 2;
}

function setupYAxis(gl, shader) {
    yAxis.shader = shader;

    const positions = new Float32Array([
        0, -10000,
        0,  10000
    ]);

    yAxis.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, yAxis.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    yAxis.vao = gl.createVertexArray();
    gl.bindVertexArray(yAxis.vao);
    gl.enableVertexAttribArray(yAxis.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, yAxis.vbo);
    gl.vertexAttribPointer(yAxis.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    yAxis.drawMode = gl.LINES;
    yAxis.drawOffset = 0;
    yAxis.drawCount = 2;
}

function setupSquare(gl, shader) {
    square.shader = shader;

    const positions = new Float32Array([
        -50, -50,
         50, -50,
        -50,  50,

        -50,  50,
         50, -50,
         50,  50
    ]);

    square.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, square.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    square.vao = gl.createVertexArray();
    gl.bindVertexArray(square.vao);
    gl.enableVertexAttribArray(square.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, square.vbo);
    gl.vertexAttribPointer(square.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    square.drawMode = gl.TRIANGLES;
    square.drawOffset = 0;
    square.drawCount = 6;
}

function setupRectangle(gl, shader) {
    rectangle.shader = shader;

    const positions = new Float32Array([
        -75, -40,
         75, -40,
        -75,  40,

        -75,  40,
         75, -40,
         75,  40
    ]);

    rectangle.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    rectangle.vao = gl.createVertexArray();
    gl.bindVertexArray(rectangle.vao);
    gl.enableVertexAttribArray(rectangle.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.vbo);
    gl.vertexAttribPointer(rectangle.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    rectangle.drawMode = gl.TRIANGLES;
    rectangle.drawOffset = 0;
    rectangle.drawCount = 6;
}

function setupTriangle(gl, shader) {
    triangle.shader = shader;

    const positions = new Float32Array([
         0,  60,
        -60, -40,
         60, -40
    ]);

    triangle.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    triangle.vao = gl.createVertexArray();
    gl.bindVertexArray(triangle.vao);
    gl.enableVertexAttribArray(triangle.shader.attributes.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle.vbo);
    gl.vertexAttribPointer(triangle.shader.attributes.position, 2, gl.FLOAT, false, 0, 0);

    triangle.drawMode = gl.TRIANGLES;
    triangle.drawOffset = 0;
    triangle.drawCount = 3;
}

// =============================================================
// GUI Setup Functions
// =============================================================
function setupGUI() {
    const gui = new lil.GUI();

    const cameraFolder = gui.addFolder("Camera");
    cameraFolder.add(controls, "panUp").name("↑ Up");
    cameraFolder.add(controls, "panLeft").name("← Left");
    cameraFolder.add(controls, "panDown").name("↓ Down");
    cameraFolder.add(controls, "panRight").name("→ Right");
    cameraFolder.add(controls, "panZoomIn").name("Zoom In");
    cameraFolder.add(controls, "panZoomOut").name("Zoom Out");
}

// =============================================================
// Input / Event Functions
// =============================================================
window.addEventListener("keydown", event => {
    switch(event.key) {
        case "ArrowUp":
            controls.panUp = true;
            break;
        case "ArrowLeft":
            controls.panLeft = true;
            break;
        case "ArrowDown":
            controls.panDown = true;
            break;
        case "ArrowRight":
            controls.panRight = true;
            break;
        case "+":
        case "=":
            controls.panZoomIn = true;
            break;
        case "-":
        case "_":
            controls.panZoomOut = true;
            break;
    }
});

window.addEventListener("keyup", event => {
    switch(event.key) {
        case "ArrowUp":
            controls.panUp = false;
            break;
        case "ArrowLeft":
            controls.panLeft = false;
            break;
        case "ArrowDown":
            controls.panDown = false;
            break;
        case "ArrowRight":
            controls.panRight = false;
            break;
        case "+":
        case "=":
            controls.panZoomIn = false;
            break;
        case "-":
        case "_":
            controls.panZoomOut = false;
            break;
    }
});

// =============================================================
// RENDER
// =============================================================
function render(gl, time) {
    // Animations First
    updateAnimations(time);

    updateCamera();

    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.32, 0.63, 0.67, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderInfo.program);

    // PROJECTION MATRIX
    setupProjectionMatrix(gl);
    gl.uniformMatrix3fv(shaderInfo.uniforms.projectionMatrix, false, camera.projectionMatrix);

    // VIEW MATRIX
    setupViewMatrix();
    gl.uniformMatrix3fv(shaderInfo.uniforms.viewMatrix, false, camera.viewMatrix);

    // GRID
    gl.bindVertexArray(grid.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, mat3.create());
    gl.uniform4f(shaderInfo.uniforms.color, 0.39, 0.33, 0.58, 1.0);
    gl.drawArrays(grid.drawMode, grid.drawOffset, grid.drawCount);

    // X AXIS
    gl.bindVertexArray(xAxis.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, mat3.create());
    gl.uniform4f(shaderInfo.uniforms.color, 1.0, 0.0, 0.0, 1.0);
    gl.drawArrays(xAxis.drawMode, xAxis.drawOffset, xAxis.drawCount);

    // Y AXIS
    gl.bindVertexArray(yAxis.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, mat3.create());
    gl.uniform4f(shaderInfo.uniforms.color, 0.0, 1.0, 0.0, 1.0);
    gl.drawArrays(yAxis.drawMode, yAxis.drawOffset, yAxis.drawCount);

    // SQUARE
    setupModelMatrix(square);
    gl.bindVertexArray(square.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, square.modelMatrix);
    gl.uniform4f(shaderInfo.uniforms.color, square.color[0], square.color[1], square.color[2], 1.0);
    gl.drawArrays(square.drawMode, square.drawOffset, square.drawCount);

    // RECTANGLE
    setupModelMatrix(rectangle);
    gl.bindVertexArray(rectangle.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, rectangle.modelMatrix);
    gl.uniform4f(shaderInfo.uniforms.color, rectangle.color[0], rectangle.color[1], rectangle.color[2], 1.0);
    gl.drawArrays(rectangle.drawMode, rectangle.drawOffset, rectangle.drawCount);

    // TRIANGLE
    setupModelMatrix(triangle);
    gl.bindVertexArray(triangle.vao);
    gl.uniformMatrix3fv(shaderInfo.uniforms.modelMatrix, false, triangle.modelMatrix);
    gl.uniform4f(shaderInfo.uniforms.color, triangle.color[0], triangle.color[1], triangle.color[2], 1.0);
    gl.drawArrays(triangle.drawMode, triangle.drawOffset, triangle.drawCount);

    requestAnimationFrame((time) => render(gl, time));
}

// =============================================================
// MAIN
// =============================================================
function main() {
    const canvas = document.querySelector("#c");

    if(!canvas) {
        console.error("Canvas element not found");
        return;
    }

    const gl = canvas.getContext("webgl2");

    if(!gl) {
        console.error("WebGL2 is not supported by this browser");
        return;
    }

    setupShader(gl, shaderInfo);
    setupGrid(gl, shaderInfo);
    setupXAxis(gl, shaderInfo);
    setupYAxis(gl, shaderInfo);
    setupSquare(gl, shaderInfo);
    setupRectangle(gl, shaderInfo);
    setupTriangle(gl, shaderInfo);
    setupGUI();

    render(gl, 0);
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
window.addEventListener("DOMContentLoaded", main);

export {
    main
};
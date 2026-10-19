/* #############################################################
   CHAPTER 19e: Using MipMaps
   Topics:
   - Creating texture of size 512*512
   - Aplying on multiple squares of size 64,128,256,512
   - Observe the Blurring is better
   - All UVs 0-1
   #############################################################
*/


// =============================================================
// SHADER OBJECTS
// =============================================================
//Shader Object1
const basicShader = {
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
        modelMatrix: null,
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
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.color = gl.getUniformLocation(this.program, "u_color");
    }
};

const textureShader = {
    vertexShaderSource: `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;

        uniform mat3 u_modelMatrix;
        uniform mat3 u_viewMatrix;
        uniform mat3 u_projectionMatrix;

        out vec2 v_texCoord;

        void main() {
            vec3 localPosition = vec3(a_position, 1.0);
            vec3 clipPosition = u_projectionMatrix * u_viewMatrix * u_modelMatrix * localPosition;
            gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
            v_texCoord = a_texCoord;
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

    program: null,

    attributes: {
        position: null,
        texCoord: null
    },

    uniforms: {
        modelMatrix: null,
        viewMatrix: null,
        projectionMatrix: null,
        texture: null
    },

    init(gl) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        // program
        this.program = createProgram(gl, vertexShader, fragmentShader);
        // attribute
        this.attributes.position = gl.getAttribLocation(this.program, "a_position");
        this.attributes.texCoord = gl.getAttribLocation(this.program, "a_texCoord");
        // uniform
        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, "u_modelMatrix");
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, "u_viewMatrix");
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.uniforms.texture = gl.getUniformLocation(this.program, "u_texture");
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
// TEXTURE RESOURCE
// =============================================================
const texture = {
    imagePath: "chapters/chapter19/assets/sckorpio_Texture_64.png",
    image: null,
    handle: null,
    loaded: false,

    // Texture wrapping state
    wrapS: "REPEAT",
    wrapT: "REPEAT",

    // Texture filtering state
    minFilter: "LINEAR",
    magFilter: "LINEAR",

    init(gl) {
        createTexture(gl, this);
    },

    setWrapping(gl) {
        this.bind(gl);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl[this.wrapS]);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl[this.wrapT]);
    },

    setFiltering(gl) {
        this.bind(gl);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl[this.minFilter]);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl[this.magFilter]);
    },

    bind(gl, textureUnit = 0) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.handle);
    }
};

function createTexture(gl, texture) {
    texture.handle = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture.handle);

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
        new Uint8Array([0, 255, 255, 255])
    );

    // Create Image
    texture.image = new Image();

    // On load
    texture.image.onload = () => {
        // Bind
        gl.bindTexture(gl.TEXTURE_2D, texture.handle);
        // Y-Flip
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // Load Image data
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            texture.image
        );
        // Generate mipmap levels from the loaded texture
        gl.generateMipmap(gl.TEXTURE_2D);
        // Min Filtering
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        // Mag Filtering
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        // set flag
        texture.loaded = true;
        console.log("Texture loaded:", texture.imagePath);
    };

    texture.image.onerror = () => {
        console.error(
            "Could not load texture image:",
            texture.imagePath
        );
    };

    texture.image.src = texture.imagePath;
}

// =============================================================
// CAMERA
// =============================================================
const camera = {
    // Camera Data
    width: 0,
    height: 0,
    positionX: -300,
    positionY: -300,
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
// SCENE OBJECTS
// =============================================================
const square = {
    //    v1--------v2
    //    | \        |
    //    |    \     |
    //    |       \  |
    //    v0--------v1

    // CPU DATA
    vertexData: new Float32Array([
        // Position     // UV
        -32, -32,     0, 0,
        32, -32,      1, 0,
        -32,  32,     0, 1,

        -32,  32,     0, 1,
        32, -32,      1, 0,
        32,  32,      1, 1
    ]),

    translationX: 0,
    translationY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,

    uMin: 0,
    vMin: 0,
    uMax: 1,
    vMax: 1,
    modelMatrix: mat3.create(),

    //GPU DATA
    shader: null,
    texture: null,
    vao: null,
    vbo: null,
    drawMode: null,
    drawOffset: 0,
    drawCount: 0,

    //FUNCTIONS
    init(gl, shader, texture) {
        // Connect shader to object
        this.shader = shader;
        this.texture = texture;

        // Vertex Buffer
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);

        // Vertex Array
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Bind Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Position corrds: x, y
        gl.enableVertexAttribArray(this.shader.attributes.position);
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,                                  // size: 2 components (X, Y)
            gl.FLOAT,                           // type: 32-bit float
            false,                              // normalize
            4 * Float32Array.BYTES_PER_ELEMENT, // stride: 4(tightly packed)
            0                                   // offset: start of buffer
        );

        // Texture coordinates: u, v
        gl.enableVertexAttribArray(this.shader.attributes.texCoord);
        gl.vertexAttribPointer(
            this.shader.attributes.texCoord,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT
        );

        // Draw data
        this.drawMode = gl.TRIANGLES;
        this.drawOffset = 0;
        this.drawCount = 6;

        // Update once
        this.update(gl);
    },
    update(gl){
        this.vertexData = new Float32Array([
            // Position     // UV
            -32, -32,     this.uMin, this.vMin,
            32, -32,      this.uMax, this.vMin,
            -32,  32,     this.uMin, this.vMax,

            -32,  32,     this.uMin, this.vMax,
            32, -32,      this.uMax, this.vMin,
            32,  32,      this.uMax, this.vMax
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    },
    draw(gl) {
        // Shader
        gl.useProgram(this.shader.program);
        // Modle Matrix
        setupModelMatrix(this);
        gl.uniformMatrix3fv(this.shader.uniforms.modelMatrix,false,this.modelMatrix);
        // Texture
        this.texture.bind(gl, 0);
        gl.uniform1i(this.shader.uniforms.texture, 0);
        // vao
        gl.bindVertexArray(this.vao);
        // draw call
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
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
        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        //Draw Data
        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = positions.length / 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
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

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
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

        gl.vertexAttribPointer(
            this.shader.attributes.position,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        this.drawMode = gl.LINES;
        this.drawOffset = 0;
        this.drawCount = 2;
    },
    draw(gl) {
        gl.useProgram(this.shader.program);
        gl.uniform3fv(this.shader.uniforms.color,this.color);   
        gl.bindVertexArray(this.vao);
        gl.drawArrays(this.drawMode,this.drawOffset,this.drawCount);
    }
};

function setupModelMatrix(object) {
    const matrix = mat3.create();

    mat3.translate(matrix, matrix, [object.translationX, object.translationY]);
    mat3.rotate(matrix, matrix, object.rotation * Math.PI / 180);
    mat3.scale(matrix, matrix, [object.scaleX, object.scaleY]);

    object.modelMatrix = matrix;
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
// GUI 
// =============================================================
const gui = {
    wrapModes : {
        "Repeat": "REPEAT",
        "Clamp To Edge": "CLAMP_TO_EDGE",
        "Mirrored Repeat": "MIRRORED_REPEAT"
    },
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
    },
    init(gl) {
        const gui = new lil.GUI();
    
        const squareFolder = gui.addFolder("Square");
        squareFolder.add(square, "translationX", -1000, 1000).name("translationX");
        squareFolder.add(square, "translationY", -1000, 1000).name("translationY");
        squareFolder.add(square, "rotation", 0, 360).name("rotation");
        squareFolder.add(square, "scaleX", 0.1, 3.0).name("scaleX");
        squareFolder.add(square, "scaleY", 0.1, 3.0).name("scaleY");
        squareFolder.add(square, "uMin", -3.0, 3.0).name("uMin");
        squareFolder.add(square, "vMin", -3.0, 3.0).name("vMin");
        squareFolder.add(square, "uMax", -3.0, 3.0).name("uMax");
        squareFolder.add(square, "vMax", -3.0, 3.0).name("vMax");

        // Texture Wrap
        const wrappingFolder = gui.addFolder("Texture Wrapping");
        wrappingFolder.add(texture, "wrapS", this.wrapModes).name("Wrap S (U)").onChange(() => {texture.setWrapping(gl);});
        wrappingFolder.add(texture, "wrapT", this.wrapModes).name("Wrap T (V)").onChange(() => {texture.setWrapping(gl);});

        // Filtering
        const filteringFolder = gui.addFolder("Texture Filtering");
        filteringFolder.add(texture, "minFilter", this.minFilterModes).name("Min Filter").onChange(() => {texture.setFiltering(gl);});
        filteringFolder.add(texture, "magFilter", this.magFilterModes).name("Mag Filter").onChange(() => {texture.setFiltering(gl);});
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
    // Shader 1
    gl.useProgram(basicShader.program);
    // Pass MVP Matrices
    gl.uniformMatrix3fv(basicShader.uniforms.projectionMatrix,false,camera.projectionMatrix);
    gl.uniformMatrix3fv(basicShader.uniforms.viewMatrix,false,camera.viewMatrix);
    gl.uniformMatrix3fv(basicShader.uniforms.modelMatrix,false,mat3.create());

    // Shader 2
    gl.useProgram(textureShader.program);
    // Pass MVP Matrices
    gl.uniformMatrix3fv(textureShader.uniforms.viewMatrix,false,camera.viewMatrix);
    gl.uniformMatrix3fv(textureShader.uniforms.projectionMatrix,false,camera.projectionMatrix);
    gl.uniformMatrix3fv(textureShader.uniforms.modelMatrix,false,mat3.create());
        
    // UPDATE UVs
    //---------------------------------------------------
    square.update(gl);

    
    // DRAW THINGS
    //---------------------------------------------------
    // Grid
    grid.draw(gl);
    // X-Axis
    xAxis.draw(gl);
    // Y-Axis
    yAxis.draw(gl);
   
    // All Squares
    square.draw(gl);
    
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
    basicShader.init(gl);
    textureShader.init(gl);

    //Textures
    texture.init(gl);

    //Objects
    square.init(gl, textureShader, texture);
    grid.init(gl, basicShader);
    xAxis.init(gl, basicShader);
    yAxis.init(gl, basicShader);

    //Render
    render(gl);

    //Resize
    window.addEventListener("resize", () => render(gl));
}

// =============================================================
// STARTUP AND EXPORTS
// =============================================================
window.addEventListener("DOMContentLoaded", main);

export {
    main
};
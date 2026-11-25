/* #############################################################
CHAPTER 1a: Creating a Basic Triangle

Topics:
- Webgl Canvas
- Webgl context
- Vertex Shader
- Fragment shader
- Shader program
- Vertex Buffer
- Vertex Array
- Render function
- drawArrays()
###############################################################
*/


// =============================================================
// 1. GLSL Shader Sources 
// =============================================================

// OLD WebGL 1.0 Way...
// -------------------------------------------------------------
// basic vertex shader
// passing postion data in clip space[-1,+1] directly
const vertexShaderSourceOld =  `
    attribute vec2 a_position;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// basic fragment shader
// using cyan/purple color for the pixel (sckorpio branding)
const fragmentShaderSourceOld = `
    precision mediump float;

    void main() {
        //gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0); //CYAN
        gl_FragColor = vec4(0.39, 0.33, 0.58, 1.0); //Sckorpio-Purple
    }
`;

// NEW WebGL 2.0 Way...
// -------------------------------------------------------------
// basic vertex shader
// passing postion data in clip space[-1,+1] directly
const vertexShaderSource =  `#version 300 es
    in vec2 a_position;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// basic fragment shader
// using cyan/purple color for the pixel (sckorpio branding)
const fragmentShaderSource = `#version 300 es
    precision mediump float;
    out vec4 out_Color;

    void main() {
        //out_Color = vec4(0.0, 1.0, 1.0, 1.0); //CYAN
        out_Color = vec4(0.39, 0.33, 0.58, 1.0); //Sckorpio-Purple
    }
`;

/**
 * Compiles a GLSL shader.
 */
function createShader(gl, type, source) {
    // create a shader of 'type'
    const shader = gl.createShader(type);
    // pass the shader source string
    gl.shaderSource(shader, source);
    // compile the shader
    gl.compileShader(shader);

    // get compile status of shader
    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    // if status = success : return shader
    if(compileStatus) return shader;
    // else log it
    console.error("Shader Compilation Error:", gl.getShaderInfoLog(shader));
    // and delete the shader
    gl.deleteShader(shader);
}

/**
 * Links vertex and fragment shaders into a GPU program.
 */
function createProgram(gl, vertexShader, fragmentShader) {
    // create a program
    const program = gl.createProgram();
    // attach the vertex shader to program
    gl.attachShader(program, vertexShader);
    // attach the fragment shader to program
    gl.attachShader(program, fragmentShader);
    // finally link them together
    gl.linkProgram(program);

    // get link status of program
    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    // if link status success
    if(linkStatus) return program;

    // else: log it
    console.error("Program Linking Error:", gl.getProgramInfoLog(program));
    // and delete the program
    gl.deleteProgram(program);
}

// =============================================================
// 3. Main Application Entry Point
// =============================================================

function main() {
    // -------------------------------------------------------------
    // 1. WEBGL CANVAS 
    // -------------------------------------------------------------
    // Get the Canvas
    const canvas = document.querySelector("#c");
    if(!canvas) {
        console.error("Canvas element not found");
        return;
    }

    // Get the WebGL context
    const gl = canvas.getContext("webgl2");
    if(!gl) {
        console.error("WebGL2 is not supported by this browser");
        return;
    }

    // -------------------------------------------------------------
    // 2. SHADERS
    // -------------------------------------------------------------
    // Compile Shader & Create Program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    // Save Attribute locations
    const locationAttributePosition = gl.getAttribLocation(program, "a_position");
    // Future Uniform etc here..

    // -------------------------------------------------------------
    // 3. DATA & BUFFERS
    // -------------------------------------------------------------

    //         v2
    //         /\
    //        /  \
    //       /    \
    //      /      \
    //     /        \
    //    v0---------v1 
    //

    // OBJECT 1
    // VERTEX BUFFER
    // create Buffer (vbo: vertex buffer object)
    var vbo = gl.createBuffer(); 
    // bind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Vertex data CPU side
    const positions = new Float32Array([
        -0.5, 0.0, // point 1
        0.0, 0.5, // point 2
        0.5, 0.0  // point 3
    ]);
    //Feed the vertex data to buffer GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // bind point
        positions,       // cpu data
        gl.STATIC_DRAW   // how frequent we gonna use it (STATIC/DYNAMIC)
    );

    // -------------------------------------------------------------
    // 4. VERTEX ARRAY
    // -------------------------------------------------------------
    // vao: vertex array object
    var vao = gl.createVertexArray();
    // bind the vertex array
    gl.bindVertexArray(vao);
    // enable that attrib
    gl.enableVertexAttribArray(locationAttributePosition);
    // bind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Buffer data format
    const size = 2;                                     // 2 components (X, Y) per vertex
    const type = gl.FLOAT;                              // 32-bit float values
    const normalize = false;                            // Do not normalize
    const stride = 2 * Float32Array.BYTES_PER_ELEMENT;  // stride:2 (or if only positions then Auto stride = 0 also)
    const offset = 0;                                   // Start reading from index 0
    gl.vertexAttribPointer(
        locationAttributePosition,
        size,
        type,
        normalize,
        stride,
        offset
    );


    // -------------------------------------------------------------
    // 5. RENDER (this will happen every frame)
    // -------------------------------------------------------------
    function render() {
        // CANVAS------------------------
        // update canvas resolution when window resize
        resizeCanvasToDisplaySize(gl.canvas);
        // set view port
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // BACKGROUND------------------------
        // Clear Background Pick clear color
        gl.clearColor(0.32, 0.63, 0.67, 1.0);  //Sckorpio-Cyan
        
        // Clear BG (here we can also clear depth etc)
        gl.clear(gl.COLOR_BUFFER_BIT);

        // SHADER------------------------
        gl.useProgram(program);

        // BUFFER/DATA--------------------
        // bY simply using Vertex Array
        gl.bindVertexArray(vao);

        //DRAW CALL------------------------
        const draw_primitiveType = gl.TRIANGLES;
        const draw_offset = 0;
        const draw_count = 3;
        gl.drawArrays(draw_primitiveType, draw_offset, draw_count);
    }

    // Execute first render call
    render();

    // Listen for Window resize
    // when window get resized ... we render again
    window.addEventListener("resize", render);
}

// =============================================================
// 2. Helper Functions
// =============================================================
/**
 * Resizes the internal drawing buffer to match screen CSS display pixels.
 */
function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
  const width = (canvas.clientWidth * multiplier) | 0;
  const height = (canvas.clientHeight * multiplier) | 0;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

// Start app once DOM content is ready
window.addEventListener("DOMContentLoaded", main);

export {
    main
};
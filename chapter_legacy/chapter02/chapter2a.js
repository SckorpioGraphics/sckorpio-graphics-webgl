/*
=============================================================
WEBGL FUNDAMENTALS — LESSON TEMPLATE
=============================================================

PURPOSE
-------------------------------------------------------------
This file describes the code organization used by the lessons.
Each lesson remains a self-contained JavaScript file and uses
only the systems needed for its graphics concepts.

The architecture should make ownership clear:

  SHADER       owns shader sources and shader locations
  MESH         owns geometry, GPU resources, and drawing
  RENDER SYSTEM owns the canvas, WebGL context, and rendering
  GUI          owns GUI creation and controls
  KEY EVENTS   owns keyboard event registration
  APP          initializes systems and coordinates a frame

Keep related data and behavior together. Add a new object or
helper only when the lesson needs it.

=============================================================
SHADER OBJECTS
=============================================================

A shader object owns shader-specific data and initialization:

  const shader = {
      vertexShaderSource: `...`,
      fragmentShaderSource: `...`,
      program: null,
      attributes: {
          position: null
      },
      uniforms: {
          color: null
      },
      init(gl) {
          const vertexShader = createShader(
              gl,
              gl.VERTEX_SHADER,
              this.vertexShaderSource
          );
          const fragmentShader = createShader(
              gl,
              gl.FRAGMENT_SHADER,
              this.fragmentShaderSource
          );
          this.program = createProgram(gl, vertexShader, fragmentShader);
          this.attributes.position =
              gl.getAttribLocation(this.program, "a_position");
          this.uniforms.color =
              gl.getUniformLocation(this.program, "u_color");
      }
  };

Different shaders can have different attributes and uniforms.
Keep their locations and initialization in the shader object.
Generic functions such as createShader() and createProgram()
remain outside the object because they are reusable helpers.

=============================================================
MESHES
=============================================================

Mesh objects own their vertex data, GPU resources,
initialization, and draw method:

  const triangle = {
      vertexData: new Float32Array([
          -0.8, -0.6,
           0.0,  0.8,
           0.8, -0.6
      ]),
      shader: null,
      vao: null,
      vbo: null,
      drawMode: null,
      drawOffset: 0,
      drawCount: 0,
      init(gl, shader) {
          this.shader = shader;
          this.vbo = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
          gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
          this.vao = gl.createVertexArray();
          gl.bindVertexArray(this.vao);
          gl.enableVertexAttribArray(this.shader.attributes.position);
          gl.vertexAttribPointer(
              this.shader.attributes.position,
              2,
              gl.FLOAT,
              false,
              2 * Float32Array.BYTES_PER_ELEMENT,
              0
          );
          this.drawMode = gl.TRIANGLES;
          this.drawOffset = 0;
          this.drawCount = 3;
      },
      draw(gl) {
          gl.useProgram(this.shader.program);
          gl.bindVertexArray(this.vao);
          gl.drawArrays(this.drawMode, this.drawOffset, this.drawCount);
          gl.bindVertexArray(null);
      }
  };

Use one mesh object per drawable when that matches the lesson.
Meshes may also own transforms, colors, textures, index buffers,
or update methods when the lesson needs them. Do not add empty
or artificial update methods.

=============================================================
RENDER SYSTEM
=============================================================

Place renderSystem immediately after the mesh objects. It owns
the canvas, WebGL context, resource initialization, resizing,
scene updates when needed, and drawing.

Keep its methods in this order:

  1. initWebgl()
  2. resizeCanvasToDisplaySize()
  3. init()
  4. update(), only when scene updates are needed
  5. render()

  const renderSystem = {
      canvas: null,
      gl: null,
      initWebgl() {
          this.canvas = document.querySelector("#c");
          if (!this.canvas) {
              console.error("Canvas element #c not found.");
              return;
          }
          this.gl = this.canvas.getContext("webgl2");
          if (!this.gl) {
              console.error("WebGL2 is not supported or unavailable.");
              return;
          }
      },
      resizeCanvasToDisplaySize(multiplier = 1) {
          const width = (this.canvas.clientWidth * multiplier) | 0;
          const height = (this.canvas.clientHeight * multiplier) | 0;
          if (this.canvas.width !== width ||
              this.canvas.height !== height) {
              this.canvas.width = width;
              this.canvas.height = height;
          }
      },
      init() {
          this.initWebgl();
          const gl = this.gl;
          shader.init(gl);
          triangle.init(gl, shader);
      },
      render() {
          const gl = this.gl;
          gl.viewport(0, 0, this.canvas.width, this.canvas.height);
          gl.clearColor(0.32, 0.63, 0.67, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          triangle.draw(gl);
      }
  };

When a lesson has scene state to update, add update() and put
those operations there. Keep rendering in render(): set the
viewport, clear the canvas, upload uniforms, and draw meshes.
Do not duplicate canvas resizing in render().

=============================================================
GUI
=============================================================

Create and initialize the GUI from appInit(). Pass a callback
named func only when a control needs to call it:

  const gui = {
      init(func) {
          const controls = new lil.GUI();
          controls.add(triangle, "size", 0.1, 1.0)
              .onChange(func);
      }
  };

If the GUI does not use a callback or WebGL context, omit that
parameter. Pass gl only to GUI initialization when its controls
actually need the WebGL context.

=============================================================
KEY EVENTS
=============================================================

Keep keyboard event registration in keyEvent and initialize it
from appInit(). Use func only when a handler needs to invoke the
provided callback. Otherwise, omit the parameter:

  const keyEvent = {
      init(func) {
          window.addEventListener("keydown", event => {
              if (event.key === "ArrowRight") {
                  triangle.translationX += 10;
                  func();
              }
          });
      }
  };

Register keyboard and resize listeners once. Do not restart a
continuous animation loop from an event handler. For lessons with
a continuous loop, handlers should update state and let that
existing loop render it.

=============================================================
MAIN
=============================================================

appInit() initializes WebGL resources and the lesson's GUI,
keyboard events, and other systems exactly once.

For a static or user-triggered lesson, app() coordinates a frame:

  1. Resize the canvas
  2. Update scene state, when needed
  3. Render the scene

  function app() {
      renderSystem.resizeCanvasToDisplaySize();
      // Call renderSystem.update() here only when needed.
      renderSystem.render();
  }

  function appInit() {
      renderSystem.init();
      gui.init(app);
      keyEvent.init();
      window.addEventListener("resize", app);
  }

  function main() {
      appInit();
      app();
  }

For an animated lesson, appLoop() performs the same frame work and
schedules the next frame. Start it once from main(). Event handlers
update state; they do not restart the loop:

  function appLoop() {
      renderSystem.resizeCanvasToDisplaySize();
      renderSystem.update();
      renderSystem.render();
      requestAnimationFrame(appLoop);
  }

  function main() {
      appInit();
      appLoop();
  }

Omit update() or callback arguments when the lesson does not need
them. Do not add return-value plumbing or duplicate initialization.
Keep renderSystem.update() and renderSystem.render() separate.

=============================================================
STARTUP AND EXPORTS
=============================================================

Start the lesson after the document is ready and export main
when the existing module setup requires it:

  window.addEventListener("DOMContentLoaded", main);

  export {
      main
  };

=============================================================
ARCHITECTURE GUIDELINES
=============================================================

Keep the lesson's graphics concepts, rendering behavior, and
educational progression intact. Adapt the template to the actual
lesson rather than adding systems that it does not use.

Organize related data and behavior together:

  SHADER       shader code and locations
  MESH         geometry, GPU resources, and drawing
  RENDER SYSTEM canvas, context, updates, and rendering
  GUI          controls
  KEY EVENTS   keyboard listeners
  APP          initialization and frame orchestration

Use generic helpers only for reusable operations that do not
belong to one particular object. Keep each lesson independently
runnable within its existing HTML and library setup.

=============================================================
*/

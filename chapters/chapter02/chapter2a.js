/*
=============================================================
WEBGL FUNDAMENTALS — ABSTRACTED LESSON TEMPLATE
=============================================================

Each lesson remains a self-contained module. Reusable classes
reduce repeated setup while the shaders, vertex data, layouts,
draw modes, and math that teach each graphics concept stay visible.

SHADER
-------------------------------------------------------------
Shader receives GLSL sources plus readable attribute and uniform
names. It compiles and links the program and keeps those names
separate from the GPU locations it resolves:

  const shader = new Shader({
      vertexShaderSource: `...`,
      fragmentShaderSource: `...`,
      attributes: { position: "a_position" },
      uniforms: { color: "u_color" }
  });

Shader owns createShader(), createProgram(), and init(). Multiple
meshes may use the same Shader instance.

MESH
-------------------------------------------------------------
MeshObject owns geometry, its VAO/VBO/optional IBO, vertex attribute
configuration, and draw call. Configure every attribute in the
layout; do not assume a fixed vertex format:

  const layout = [
      { attribute: "position", size: 2, type: "FLOAT",
        normalized: false, stride: 20, offset: 0 * Float32Array.BYTES_PER_ELEMENT },
      { attribute: "color", size: 3, type: "FLOAT",
        normalized: false, stride: 20, offset: 8 }
  ];

Layouts may describe separate or interleaved buffers, texture
coordinates, normals, and other vertex data. Configure index data,
index type, topology, count, and offset when the lesson uses them.
For indexed drawing, drawOffset is a byte offset; for drawArrays it
is the first vertex.

Use independent MeshObject objects for separate drawables. Reuse the
shader and geometry options in a loop when objects are similar;
each mesh still owns its own GPU resources and transforms.

CAMERA AND CONTROLS
-------------------------------------------------------------
Add Camera only when the lesson needs view/projection state. Add
Controls for keyboard or pointer input. Keep both independent of
MeshObject and RenderSystem.

RENDER SYSTEM
-------------------------------------------------------------
RenderSystem receives shader and mesh collections from App. It owns
the canvas and WebGL context, initializes GPU resources, sets the
viewport, clears, and coordinates mesh drawing. It does not create
lesson-specific scene objects.

ANIMATION AND PHYSICS
-------------------------------------------------------------
Add AnimationSystem or PhysicsSystem only when a lesson needs it.
Each system owns its respective animationInfos or physicsInfos and
updates referenced meshes; keep those calculations out of MeshObject.

APP AND SCENE COMPOSITION
-------------------------------------------------------------
App creates objects, connects them, initializes systems, and
coordinates execution. Keep environment setup separate from lesson
geometry:

  createEnvironment() {
      // Camera, grid, axes, controls, or other needed common objects.
  }

  createLessonScene() {
      // Lesson shaders, vertex data, layouts, meshes, and info records.
  }

Only add environment elements a lesson actually uses. Static lessons
render once and on resize or input. Animated lessons start one frame
loop and keep input handlers from starting duplicate loops.

PRESERVE THE LESSON
-------------------------------------------------------------
Keep the legacy lesson's geometry, topology, shader math, coordinate
system, transform order, render order, interaction, and visual result.
Abstraction replaces repeated infrastructure, not the concept being
taught.
*/

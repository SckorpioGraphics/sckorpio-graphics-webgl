# Sckorpio Graphics: WebGL Fundamentals

This repository contains the WebGL 2 foundation curriculum, from the series
introduction through Chapter 20: geometry and primitive topologies, cameras
and transformations, UV mapping, texture wrapping and filtering, and alpha
blending.

The optional `chapterExtra` folder contains supplemental pixel-space and
render-loop experiments.

Chapters 21 and later now continue in the
[Sckorpio Real-Time WebGL repository](https://github.com/SckorpioGraphics/sckorpio-real-time-webgl).

To run a lesson, serve this folder over HTTP:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The page loads
`chapters/chapter20/chapter20h.js` by default. Change the module path in
`index.html` to select another lesson. Lil GUI and gl-matrix are loaded from
CDNs in `index.html`.

## Lesson structure

Lessons remain self-contained JavaScript modules. As the series advances, they
organize shader state and initialization in shader objects, geometry and GPU
resources in mesh objects, and canvas/context setup and rendering in
`renderSystem`. GUI and keyboard systems are initialized from `appInit()`.
Static lessons use a one-shot app function; lessons that animate schedule
frames from `appLoop()`. Each lesson uses only the systems needed for its
concepts.

Chapter 2a explains the conventions with annotated examples:
[lesson template](chapters/chapter02/chapter2a.js).

See the [series overview](Documentation/series_index.txt) and
[episode guide](Documentation/series_episodes.txt).

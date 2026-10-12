# Sckorpio Graphics: WebGL Fundamentals

A hands-on WebGL 2 curriculum progressing from the first draw through a
camera-based 2D rendering pipeline. The completed foundation covers Chapters
1–20, with Chapter 0 introducing the series. Later topics and the Sckorpio game
remain on the roadmap.

The lessons progressively organize related state and behavior into objects:

- shader objects group shader source, program creation, and attribute/uniform
  locations
- camera objects group viewport or world bounds and transformation state
- renderable objects group geometry, GPU resources, and draw behavior
- scene setup and rendering stay visible as the series introduces more concepts

The pattern is introduced in Chapter 2 and documented in the Chapter 10 lesson
template. The guiding idea is **object = state + behavior**.

See the [series overview](Documentation/series_index.txt) and
[episode guide](Documentation/series_episodes.txt).

To run a lesson, serve this folder over HTTP:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The page currently loads
`chapters/chapter20/chapter20h.js`; change the module path in `index.html` to
select another lesson. Lil GUI and gl-matrix are loaded from CDNs in
`index.html`.

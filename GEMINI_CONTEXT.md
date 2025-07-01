# GPX Visualizer Development Context

## Project Goal
Create a visually spectacular 3D application to visualize GPX files using Three.js.

## Current Status
The application is built with Vite and Three.js. It successfully renders a hard-coded sample track, but fails to render GPX files uploaded by the user. The basic scene, lighting, and rendering pipeline are functional.

## The Bug
When a user uploads a GPX file, the track does not appear. The hard-coded track remains visible. The browser console shows errors related to undefined properties when creating the `TubeGeometry`, which indicates a problem with the data being passed to the rendering functions after a file is uploaded.

## Debugging Strategy
The current strategy is to isolate the GPX data processing and rendering pipeline. I have added extensive `console.log` statements to the `handleFileUpload` function in `main.js` to trace the flow of data from file reading, to parsing, to normalization, and finally to rendering.

I am relying on the user to provide the console output from their browser's developer tools to identify the point of failure.

## Key Files
- `gpx-visualizer/main.js`: Contains all of the application logic.
- `gpx-visualizer/index.html`: The main HTML file.
- `gpx-visualizer/public/`: Contains the sample GPX files.

## How to Run
1.  Navigate to the `gpx-visualizer` directory: `cd gpx-visualizer`
2.  Start the development server: `npm run dev`
3.  Open the provided URL in a browser.

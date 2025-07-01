import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseGPX } from '@we-gold/gpxjs';

import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
} from 'postprocessing';

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
scene.fog = new THREE.Fog(0x000000, 10, 20);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#main-canvas'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 5;

// --- Post-processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new EffectPass(camera, new BloomEffect({ intensity: 1, luminanceThreshold: 0.2 }))
);

// --- Skybox ---
const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x000022) },
    bottomColor: { value: new THREE.Color(0x000000) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize( vWorldPosition + offset ).y;
      gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
    }
  `,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);

const curve = new THREE.CatmullRomCurve3( [
	new THREE.Vector3( -10, 0, 10 ),
	new THREE.Vector3( -5, 5, 5 ),
	new THREE.Vector3( 0, 0, 0 ),
	new THREE.Vector3( 5, -5, 5 ),
	new THREE.Vector3( 10, 0, 10 )
] );

const points = curve.getPoints( 50 );
renderTrack(points, 'hard-coded-track', 0xff00ff);
// renderTerrain(points);

// --- Adjust Camera ---
const boundingBox = new THREE.Box3().setFromPoints(points);
const center = new THREE.Vector3();
boundingBox.getCenter(center);
const size = new THREE.Vector3();
boundingBox.getSize(size);

const maxDim = Math.max(size.x, size.y, size.z);
const fov = camera.fov * (Math.PI / 180);
let cameraZ = Math.abs((maxDim / 2) * Math.tan(fov * 2));
cameraZ *= 1.5; // Add some padding

camera.position.set(center.x, center.y, center.z + cameraZ);
controls.target.copy(center);

// --- GPX File Loading ---
const fileInput = document.getElementById('gpx-file');
fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const gpxData = e.target.result;
    console.log('GPX data loaded from file');
    
    try {
      console.log('Parsing GPX data from file');
      const [parsedFile, error] = parseGPX(gpxData);

      if (error) {
        console.error('Error parsing GPX file:', error);
        return;
      }

      if (!parsedFile.tracks || parsedFile.tracks.length === 0) {
        console.error('No tracks found in GPX file.');
        return;
      }

      console.log('GPX data parsed successfully from file');
      const points = parsedFile.tracks[0].points.map((p) => ({
        x: p.lon,
        y: p.lat,
        z: p.ele,
      }));

      // --- Normalize Coordinates ---
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      const minZ = Math.min(...points.map((p) => p.z));
      const maxZ = Math.max(...points.map((p) => p.z));

      console.log('Normalizing coordinates from file');
      const normalizedPoints = points.map((p) => {
        if (p.lon === undefined || p.lat === undefined || p.ele === undefined) {
          return null;
        }
        const x = THREE.MathUtils.mapLinear(p.x, minX, maxX, -5, 5);
        const y = THREE.MathUtils.mapLinear(p.z, minZ, maxZ, 0, 2);
        const z = THREE.MathUtils.mapLinear(p.y, minY, maxY, -5, 5);
        return new THREE.Vector3(x, y, z);
      }).filter(p => p !== null);

      console.log('Normalized Points from file:', normalizedPoints);
      renderTrack(normalizedPoints, 'gpx-track', 0x00ffff);
      renderTerrain(normalizedPoints);

      // --- Adjust Camera ---
      const boundingBox = new THREE.Box3().setFromPoints(normalizedPoints);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      console.log('GPX Bounding Box Center from file:', center);
      console.log('GPX Bounding Box Size from file:', size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs((maxDim / 2) * Math.tan(fov * 2));
      cameraZ *= 1.5; // Add some padding

      camera.position.set(center.x, center.y, center.z + cameraZ);
      controls.target.copy(center);

      console.log('Camera Position from file:', camera.position);
      console.log('Controls Target from file:', controls.target);
    } catch (e) {
      console.error('Error processing GPX data from file:', e);
    }
  };
  reader.readAsText(file);
}


function renderTerrain(points) {
  // Clear previous terrain
  const previousTerrain = scene.getObjectByName('terrain');
  if (previousTerrain) {
    scene.remove(previousTerrain);
    previousTerrain.geometry.dispose();
    previousTerrain.material.dispose();
  }

  const geometry = new THREE.PlaneGeometry(20, 20, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0,
    roughness: 1,
  });
  const terrain = new THREE.Mesh(geometry, material);
  terrain.name = 'terrain';
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);
}

function renderTrack(points, name, color) {
  // Clear previous track
  const previousTrack = scene.getObjectByName(name);
  if (previousTrack) {
    scene.remove(previousTrack);
    previousTrack.geometry.dispose();
    previousTrack.material.dispose();
  }

  const curve = new THREE.CatmullRomCurve3(points);

  const geometry = new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 4,
  });
  const track = new THREE.Mesh(geometry, material);
  track.name = name;

  scene.add(track);
}

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render(clock.getDelta());
}

animate();

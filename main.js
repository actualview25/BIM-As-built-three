// ====================
// Imports (LOCAL)
// ====================
import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('Three.js version:', THREE.REVISION);

// ====================
// Variables
// ====================
let scene, camera, renderer, controls;
let autorotate = true;

// ====================
// Scene
// ====================
scene = new THREE.Scene();

// ====================
// Camera
// ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.01);

// ====================
// Renderer
// ====================
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('container').appendChild(renderer.domElement);

// ====================
// Controls
// ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.3;

// ====================
// Panorama Sphere
// ====================
const loader = new THREE.TextureLoader();

loader.load(
  './textures/StartPoint.jpg',
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.SphereGeometry(500, 80, 60);
    geometry.scale(-1, 1, 1); // Important for inside view

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);

    scene.add(sphere);
  },
  undefined,
  (error) => {
    console.error('Texture load error:', error);
  }
);

// ====================
// Animation Loop
// ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    camera.rotation.y += 0.0006;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====================
// UI
// ====================
const btn = document.getElementById('toggleRotate');
if (btn) {
  btn.onclick = () => {
    autorotate = !autorotate;
    btn.textContent = autorotate ? '⏸️ AutoRotate' : '▶️ Rotate';
  };
}

// ====================
// Resize
// ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

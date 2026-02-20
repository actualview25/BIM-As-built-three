import * as THREE from 'three';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

let scene, camera, renderer, controls;
let autorotate = true;
let sphereMesh = null;
let hotspots = [];
let selectedPoints = [];
let previewLine = null;
let pipes = [];
let currentPipeType = {
  radius: 0.6,
  color: 0xffcc00
};

// ==================== Scene & Camera ====================
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1);

// ==================== Renderer ====================
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('container').appendChild(renderer.domElement);

// ==================== Controls ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

// ==================== Load Panorama ====================
const loader = new THREE.TextureLoader();
loader.load('./textures/StartPoint.jpg', texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geometry = new THREE.SphereGeometry(500, 64, 64);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
});

// ==================== Raycaster for Hotspots ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  if (!sphereMesh) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(sphereMesh);
  if (intersects.length > 0) {
    const point = intersects[0].point.clone();
    selectedPoints.push(point);
    drawPreviewPath();
  }
}

function drawPreviewPath() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
  }

  if (selectedPoints.length < 2) return;

  const geometry = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });

  previewLine = new THREE.Line(geometry, material);
  scene.add(previewLine);
}
function finalizePipe() {
  if (selectedPoints.length < 2) return;

  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  const curve = new THREE.CatmullRomCurve3(selectedPoints);
  const geometry = new THREE.TubeGeometry(
    curve,
    64,
    currentPipeType.radius,
    12,
    false
  );

  const material = new THREE.MeshStandardMaterial({
    color: currentPipeType.color,
    roughness: 0.4,
    metalness: 0.1
  });

  const pipe = new THREE.Mesh(geometry, material);
  pipes.push(pipe);
  scene.add(pipe);

  selectedPoints = [];
}

function addHotspot(position) {
  const spriteMap = new THREE.TextureLoader().load('./img/hotspot.png');
  const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
  const hotspot = new THREE.Sprite(spriteMaterial);
  hotspot.position.copy(position);
  hotspot.scale.set(10, 10, 1);
  hotspots.push(hotspot);
  scene.add(hotspot);
  console.log('🟢 تم إضافة نقطة Hotspot', position);
}

window.addEventListener('click', onClick);

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    camera.position.x = 0.1 * Math.sin(Date.now() * 0.0006);
    camera.position.z = 0.1 * Math.cos(Date.now() * 0.0006);
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ==================== UI ====================
const btn = document.getElementById('toggleRotate');
btn.onclick = () => {
  autorotate = !autorotate;
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
};

// ==================== Resize ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

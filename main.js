import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ==================== Variables ====================
let scene, camera, renderer, controls;
let autorotate = true;
let sphereMesh = null;
let selectedPoints = [];
let previewLine = null;
let pipes = [];
let drawMode = false; // للتحكم في وضع الرسم

const pipeColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};
let currentPipeType = { radius: 0.6, color: pipeColors.EL };

// ==================== Scene & Lights ====================
scene = new THREE.Scene();
scene.background = null;

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// ==================== Camera ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1);

// ==================== Renderer ====================
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
loader.load(
  './textures/StartPoint.jpg',
  texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.SphereGeometry(500, 64, 64);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
    console.log('✅ Panorama loaded');
  },
  undefined,
  err => console.error('❌ Failed to load panorama', err)
);

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', onClick);

function onClick(event) {
  if (!sphereMesh || !drawMode) return;

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

// ==================== Preview Line ====================
function drawPreviewPath() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
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

// ==================== Final Pipe ====================
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
  pipe.userData.type = Object.keys(pipeColors).find(key => pipeColors[key] === currentPipeType.color);
  pipes.push(pipe);
  scene.add(pipe);

  console.log('✅ Pipe created:', pipe.userData.type);
  selectedPoints = [];
}

// ==================== Undo ====================
function undoLastPoint() {
  if (selectedPoints.length === 0) return;

  selectedPoints.pop();
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  if (selectedPoints.length >= 2) drawPreviewPath();
}

// ==================== Keyboard Shortcuts ====================
window.addEventListener('keydown', e => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLastPoint();
  }
  if (e.key === 'Enter') finalizePipe();
});

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
const btnRotate = document.getElementById('toggleRotate');
btnRotate.onclick = () => {
  autorotate = !autorotate;
  btnRotate.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
};

const btnDraw = document.getElementById('toggleDraw');
const pipeTypeSelect = document.getElementById('pipeType');

btnDraw.onclick = () => {
  drawMode = !drawMode;
  btnDraw.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  btnDraw.style.backgroundColor = drawMode ? 'rgba(200,50,50,0.8)' : 'rgba(0,120,200,0.8)';
};

// تغيير نوع الأنبوب
pipeTypeSelect.onchange = () => {
  const selectedType = pipeTypeSelect.value;
  currentPipeType.color = pipeColors[selectedType];
};

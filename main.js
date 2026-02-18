// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer;
let currentPanorama;
let hotspots = [];
let autorotate = true;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 1));

const scenes = {
  'StartPoint': {
    image: './textures/StartPoint.jpg',
    hotspots: [
      { x: 50, y: 0, z: 0, info: 'لوحة كهرباء - StartPoint' }
    ]
  },
  'Courtyard': {
    image: './textures/Courtyard.jpg',
    hotspots: [
      { x: -30, y: 0, z: 20, info: 'نافورة Courtyard' }
    ]
  }
};

function loadPanorama(path) {
  const texture = new THREE.TextureLoader().load(path);
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  return sphere;
}

function createHotspot(x, y, z, infoText) {
  const spriteMap = new THREE.TextureLoader().load('./textures/hotspot.png');
  const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
  const hotspot = new THREE.Sprite(spriteMaterial);
  hotspot.position.set(x, y, z);
  hotspot.scale.set(10, 10, 1);
  hotspot.userData = { info: infoText };
  hotspots.push(hotspot);
  scene.add(hotspot);
  return hotspot;
}

function switchScene(name) {
  if(currentPanorama) scene.remove(currentPanorama);
  hotspots.forEach(h => scene.remove(h));
  hotspots = [];

  const data = scenes[name];
  currentPanorama = loadPanorama(data.image);
  data.hotspots.forEach(h => createHotspot(h.x, h.y, h.z, h.info));
}

// ربط الأزرار بالدوال
document.getElementById('sceneStart').addEventListener('click', () => switchScene('StartPoint'));
document.getElementById('sceneCourtyard').addEventListener('click', () => switchScene('Courtyard'));
document.getElementById('closePanel').addEventListener('click', () => {
  document.getElementById('bim-info-panel').classList.remove('visible');
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspots);
  if(intersects.length > 0) {
    const info = intersects[0].object.userData.info;
    document.getElementById('bim-panel-content').innerText = info;
    document.getElementById('bim-info-panel').classList.add('visible');
  }
});

function animate() {
  requestAnimationFrame(animate);
  if(autorotate) camera.rotation.y += 0.001;
  controls.update();
  renderer.render(scene, camera);
}
animate();

document.getElementById('autorotateToggle').addEventListener('click', () => autorotate = !autorotate);

// بدء التشغيل بالمشهد الأول
switchScene('StartPoint');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

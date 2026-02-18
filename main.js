// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js';
// ==== المتغيرات الأساسية ====
let scene, camera, renderer, controls;
let currentPanorama;
let hotspots = [];
let autorotate = true;

// إعداد المشهد والكاميرا
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding; // تحسين الألوان
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('container').appendChild(renderer.domElement);

// إضافة التحكم بالكاميرا
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ==== الإضاءة ====
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 50, 50);
scene.add(directionalLight);

// ==== بيانات المشاهد ====
const scenesData = {
  'StartPoint': {
    image: 'textures/StartPoint.jpg',
    hotspots: [
      { x: 50, y: 0, z: 0, info: 'لوحة كهرباء - StartPoint' }
    ]
  },
  'Courtyard': {
    image: 'textures/Courtyard.jpg',
    hotspots: [
      { x: -30, y: 0, z: 20, info: 'نافورة Courtyard' }
    ]
  }
};

// ==== تحميل Panorama ====
function loadPanorama(path) {
  const texture = new THREE.TextureLoader().load(path);
  texture.encoding = THREE.sRGBEncoding;

  const geometry = new THREE.SphereGeometry(500, 64, 64);
  geometry.scale(-1, 1, 1); // عكس الكرة للعرض من الداخل
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  return sphere;
}

// ==== إنشاء Hotspot ====
function createHotspot(x, y, z, infoText) {
  const spriteMap = new THREE.TextureLoader().load('textures/hotspot.png');
  spriteMap.encoding = THREE.sRGBEncoding;
  const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
  const hotspot = new THREE.Sprite(spriteMaterial);
  hotspot.position.set(x, y, z);
  hotspot.scale.set(10, 10, 1);
  hotspot.userData = { info: infoText };
  hotspots.push(hotspot);
  scene.add(hotspot);
  return hotspot;
}

// ==== التبديل بين المشاهد ====
function switchScene(name) {
  if(currentPanorama) scene.remove(currentPanorama);
  hotspots.forEach(h => scene.remove(h));
  hotspots = [];

  const data = scenesData[name];
  currentPanorama = loadPanorama(data.image);
  data.hotspots.forEach(h => createHotspot(h.x, h.y, h.z, h.info));
}

// ==== Raycaster للنقر على Hotspots ====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspots);
  if(intersects.length > 0) {
    const info = intersects[0].object.userData.info;
    document.getElementById('bim-panel-content').innerText = info;
    document.getElementById('bim-info-panel').classList.add('visible');
  }
}

window.addEventListener('click', onClick);

// ==== AutoRotate + Render Loop ====
function animate() {
  requestAnimationFrame(animate);

  if(autorotate) {
    camera.rotation.y += 0.001;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ==== التحكم في AutoRotate ====
document.getElementById('autorotateToggle').addEventListener('click', () => {
  autorotate = !autorotate;
});

// ==== بدء التشغيل بالمشهد الأول ====
switchScene('StartPoint');

// ==== تعديل الحجم عند تغيير الشاشة ====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

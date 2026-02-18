// ============================================
// Three.js Virtual Tour – نسخة محسنة
// ============================================

// المشهد، الكاميرا، الـ renderer
let scene, camera, renderer, controls;
let currentPanorama;
let hotspots = [];
let autorotate = true;

// إعداد المشهد والكاميرا
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0.1);

// Renderer
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding; // تحسين الألوان
renderer.toneMapping = THREE.ACESFilmicToneMapping; // جعل الألوان طبيعية
renderer.toneMappingExposure = 1.0;
document.getElementById('container').appendChild(renderer.domElement);

// OrbitControls للسحب والZoom
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = autorotate;
controls.autoRotateSpeed = 0.3;

// إضاءة أساسية
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// ============================================
// بيانات المشاهد
// ============================================
const scenes = {
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

// ============================================
// دالة تحميل Panorama
// ============================================
function loadPanorama(path) {
  const texture = new THREE.TextureLoader().load(path);
  texture.encoding = THREE.sRGBEncoding;
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1,1,1);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1,
    metalness: 0
  });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  return sphere;
}

// ============================================
// إنشاء Hotspot
// ============================================
function createHotspot(x, y, z, infoText) {
  const spriteMap = new THREE.TextureLoader().load('img/hotspot.png');
  const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
  const hotspot = new THREE.Sprite(spriteMaterial);
  hotspot.position.set(x, y, z);
  hotspot.scale.set(15, 15, 1); // حجم Hotspot
  hotspot.userData = { info: infoText };
  scene.add(hotspot);
  hotspots.push(hotspot);
  return hotspot;
}

// ============================================
// التبديل بين المشاهد
// ============================================
function switchScene(name) {
  if(currentPanorama) scene.remove(currentPanorama);
  hotspots.forEach(h => scene.remove(h));
  hotspots = [];

  const data = scenes[name];
  currentPanorama = loadPanorama(data.image);
  data.hotspots.forEach(h => createHotspot(h.x, h.y, h.z, h.info));
}

// ============================================
// Raycaster للنقر على Hotspots
// ============================================
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

// ============================================
// زر AutoRotate
// ============================================
document.getElementById('autorotateToggle').addEventListener('click', () => {
  autorotate = !autorotate;
  controls.autoRotate = autorotate;
});

// ============================================
// Render Loop
// ============================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ============================================
// بدء التشغيل بالمشهد الأول
// ============================================
switchScene('StartPoint');

// ============================================
// تعديل حجم الشاشة
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

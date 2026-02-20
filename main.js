// اختبار بسيط أولاً
console.log('🚀 main.js is loading...');

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);
console.log('✅ OrbitControls imported');

// ======================
// المتغيرات الأساسية
// ======================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh = null;
let selectedPoints = [];
let paths = [];
let tempLine = null;
let pointMarkers = [];

const pathColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPathType = 'EL';
window.setCurrentPathType = (t) => {
  currentPathType = t;
  console.log('🎨 تغيير النوع إلى:', t);
};

// ======================
// تهيئة المشهد
// ======================
try {
  console.log('🔄 بدء التهيئة...');
  
  scene = new THREE.Scene();
  console.log('✅ Scene created');

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);
  console.log('✅ Camera created');

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);
  console.log('✅ Renderer created');

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.target.set(0, 0, 0);
  console.log('✅ Controls created');

  // إضاءة
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);
  console.log('✅ Lights added');

  // تحميل البانوراما
  loadPanorama();
  
  // إعداد الأحداث
  setupEvents();
  
  // بدء الرسوم المتحركة
  animate();
  
  console.log('✅ Initialization complete');
  
} catch (error) {
  console.error('❌ خطأ في التهيئة:', error);
}

// ======================
// تحميل البانوراما
// ======================
function loadPanorama() {
  console.log('🔄 جاري تحميل البانوراما...');
  
  const loader = new THREE.TextureLoader();
  
  // محاولة تحميل الصورة
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      console.log('✅ Texture loaded successfully');
      
      texture.colorSpace = THREE.SRGBColorSpace;
      
      const geometry = new THREE.SphereGeometry(500, 128, 128);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
      
      console.log('✅ Panorama added to scene');
      
      // إخفاء شاشة التحميل
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
      
      // إظهار زر التثبيت
      const finalizeBtn = document.getElementById('finalizeBtn');
      if (finalizeBtn) finalizeBtn.style.display = 'block';
    },
    (progress) => {
      console.log(`⏳ تحميل: ${Math.round(progress.loaded / progress.total * 100)}%`);
    },
    (error) => {
      console.error('❌ فشل تحميل الصورة:', error);
      
      // إنشاء كرة اختبارية
      createTestSphere();
    }
  );
}

// ======================
// إنشاء كرة اختبارية
// ======================
function createTestSphere() {
  console.log('🔄 إنشاء كرة اختبارية');
  
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x224466,
    wireframe: true,
    side: THREE.BackSide
  });
  
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
  
  console.log('✅ Test sphere created');
  
  // إخفاء شاشة التحميل
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

// ======================
// إعداد الأحداث
// ======================
function setupEvents() {
  console.log('🔄 إعداد الأحداث...');
  
  // أزرار التحكم
  const toggleRotate = document.getElementById('toggleRotate');
  if (toggleRotate) {
    toggleRotate.onclick = () => {
      autorotate = !autorotate;
      controls.autoRotate = autorotate;
      toggleRotate.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
    };
  }

  const toggleDraw = document.getElementById('toggleDraw');
  if (toggleDraw) {
    toggleDraw.onclick = () => {
      drawMode = !drawMode;
      document.body.style.cursor = drawMode ? 'crosshair' : 'default';
      toggleDraw.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
      toggleDraw.style.background = drawMode ? '#aa3333' : 'rgba(20, 30, 40, 0.9)';
    };
  }

  const finalizeBtn = document.getElementById('finalizeBtn');
  if (finalizeBtn) {
    finalizeBtn.onclick = saveCurrentPath;
  }

  // أحداث الماوس
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
  console.log('✅ Events setup complete');
}

// ======================
// بقية الدوال
// ======================
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onClick(e) {
  if (!drawMode || !sphereMesh) return;
  
  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    addPoint(hits[0].point);
  }
}

function onMouseMove(e) {
  // يمكن إضافة معاينة هنا لاحقاً
}

function addPoint(pos) {
  selectedPoints.push(pos.clone());
  console.log('📍 نقطة مضافة:', selectedPoints.length);
  updateTempLine();
}

function updateTempLine() {
  // سيتم تنفيذها لاحقاً
}

function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }
  console.log('💾 حفظ المسار');
  selectedPoints = [];
}

function onKeyDown(e) {
  if (!drawMode) return;
  
  switch(e.key) {
    case 'Enter':
      e.preventDefault();
      saveCurrentPath();
      break;
    case 'Backspace':
      e.preventDefault();
      if (selectedPoints.length > 0) {
        selectedPoints.pop();
        console.log('⏪ تراجع، النقاط المتبقية:', selectedPoints.length);
      }
      break;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

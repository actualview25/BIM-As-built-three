// ====================
// Imports - باستخدام Import Map
// ====================
import * as THREE from 'three';  // يتم تحويلها تلقائياً إلى ./libs/three.module.js
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);
console.log('✅ تم تحميل المكتبات بنجاح');

// ====================
// Variables
// ====================
let scene, camera, renderer, controls;
let autorotate = true;
let sphereMesh = null; // للوصول للكرة لاحقاً إذا احتجنا

// ====================
// Scene
// ====================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122); // لون خلفية داكن جميل

// ====================
// Camera
// ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1); // زيادة طفيفة لتجنب أي مشاكل في الرندر

// ====================
// Renderer
// ====================
renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: false 
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // تحديد أقصى Pixel Ratio
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
controls.rotateSpeed = 0.5;
controls.target.set(0, 0, 0);

// ====================
// Panorama Sphere
// ====================
const loader = new THREE.TextureLoader();

// إضافة مؤشر تحميل بسيط
console.log('🔄 جاري تحميل الصورة البانورامية...');

loader.load(
  './textures/StartPoint.jpg',
  (texture) => {
    console.log('✅ تم تحميل الصورة بنجاح');
    
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.SphereGeometry(500, 64, 64); // تقليل الدقة قليلاً للأداء
    geometry.scale(-1, 1, 1); // Important for inside view

    const material = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.BackSide // يمكن استخدام هذه بديلاً عن scale(-1,1,1)
    });
    
    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
    
    console.log('✅ الجولة البانورامية جاهزة!');
  },
  (progress) => {
    // progress بار إذا أردت
    console.log(`🔄 التحميل: ${Math.round((progress.loaded / progress.total) * 100)}%`);
  },
  (error) => {
    console.error('❌ خطأ في تحميل الصورة:', error);
    // إضافة كرة ملونة كبديل في حال فشل التحميل
    addFallbackSphere();
  }
);

// ====================
// دالة احتياطية في حال فشل تحميل الصورة
// ====================
function addFallbackSphere() {
  const geometry = new THREE.SphereGeometry(500, 32, 16);
  geometry.scale(-1, 1, 1);
  
  // إنشاء نسيج ملون بسيط
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#4a6a8a';
  ctx.font = 'bold 40px Arial';
  ctx.fillText('لم يتم تحميل الصورة', 100, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  
  console.log('⚠️ تم استخدام الكرة الاحتياطية');
}

// ====================
// Animation Loop
// ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    // تدوير الكاميرا حول المحور Y
    camera.position.x = 0.1 * Math.sin(Date.now() * 0.0006);
    camera.position.z = 0.1 * Math.cos(Date.now() * 0.0006);
    camera.lookAt(0, 0, 0);
    
    // أو يمكنك استخدام rotateOnWorldCircle بدلاً من ذلك:
    // camera.rotation.y += 0.0006;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====================
// UI - تحسينات
// ====================
const btn = document.getElementById('toggleRotate');
if (btn) {
  btn.onclick = () => {
    autorotate = !autorotate;
    btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
    btn.style.backgroundColor = autorotate ? 'rgba(0,0,0,0.6)' : 'rgba(0,100,200,0.8)';
  };
}

// ====================
// Resize Handler
// ====================
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ====================
// رسالة ترحيب
// ====================
console.log('🌍 جولة افتراضية ثلاثية الأبعاد - تم التحميل بنجاح');

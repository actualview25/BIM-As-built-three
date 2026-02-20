import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ==================== Variables ====================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh = null;
let selectedPoints = [];
let previewLine = null;
let pipes = [];

const pipeColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPipeType = 'EL';

// ==================== Initialize Scene ====================
function init() {
  scene = new THREE.Scene();
  scene.background = null;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  // Camera - مهم جداً: نضبط المسافة
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 0.1);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  document.getElementById('container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;  // فعّل التكبير
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;

  // Load Panorama
  const loader = new THREE.TextureLoader();
  loader.load('./textures/StartPoint.jpg', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.SphereGeometry(500, 64, 64);
    geo.scale(-1, 1, 1);

    const mat = new THREE.MeshBasicMaterial({ map: texture });
    sphereMesh = new THREE.Mesh(geo, mat);
    scene.add(sphereMesh);

    console.log('✅ Panorama loaded');
    
    // إضافة نقاط اختبار للتأكد من أن الرسم يعمل
    addTestPoints();
  }, undefined, error => {
    console.error('❌ فشل تحميل الصورة:', error);
  });

  // Event Listeners
  setupEventListeners();
}

// ==================== Test Points ====================
function addTestPoints() {
  // نضيف نقطتين تجريبيتين للتأكد من أن الرسم يعمل
  setTimeout(() => {
    if (sphereMesh) {
      // نقاط وهمية على سطح الكرة
      const p1 = new THREE.Vector3(100, 50, 200).normalize().multiplyScalar(500);
      const p2 = new THREE.Vector3(-100, -50, 200).normalize().multiplyScalar(500);
      
      selectedPoints.push(p1);
      selectedPoints.push(p2);
      drawPreview();
      console.log('✅ نقاط تجريبية مضافة');
    }
  }, 2000);
}

// ==================== Event Listeners ====================
function setupEventListeners() {
  window.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
  document.getElementById('toggleRotate').onclick = toggleRotate;
  document.getElementById('toggleDraw').onclick = toggleDraw;
}

function onClick(e) {
  if (!sphereMesh || !drawMode) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    const point = hits[0].point.clone();
    selectedPoints.push(point);
    drawPreview();
    console.log('📍 نقطة مضافة:', point);
  }
}

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ==================== Preview ====================
function drawPreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  if (selectedPoints.length < 2) return;

  const geo = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const mat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 });
  previewLine = new THREE.Line(geo, mat);
  scene.add(previewLine);
}

// ==================== Final Pipe ====================
function finalizePipe() {
  if (selectedPoints.length < 2) {
    alert('⚠️ يجب إضافة نقطتين على الأقل');
    return;
  }

  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  try {
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    const geo = new THREE.TubeGeometry(curve, 64, 2, 12, false); // زودنا السمك لـ 2

    const mat = new THREE.MeshStandardMaterial({
      color: pipeColors[currentPipeType],
      roughness: 0.3,
      metalness: 0.2,
      emissive: new THREE.Color(pipeColors[currentPipeType]).multiplyScalar(0.2)
    });

    const pipe = new THREE.Mesh(geo, mat);
    pipe.userData.type = currentPipeType;
    pipes.push(pipe);
    scene.add(pipe);

    console.log('✅ تم إضافة ماسورة جديدة');
    selectedPoints = [];
  } catch (error) {
    console.error('❌ خطأ في إنشاء الماسورة:', error);
  }
}

// ==================== Undo ====================
function undoLast() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    drawPreview();
    console.log('⏪ تم التراجع');
  }
}

function onKeyDown(e) {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    finalizePipe();
  }
}

// ==================== UI Controls ====================
function toggleRotate() {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
}

function toggleDraw() {
  drawMode = !drawMode;
  const btn = document.getElementById('toggleDraw');
  btn.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  console.log('🎨 وضع الرسم:', drawMode ? 'مفعل' : 'معطل');
}

// ==================== Resize ====================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate && sphereMesh) {
    // تدوير الكاميرا حول الكرة
    const time = Date.now() * 0.0005;
    camera.position.x = 500 * Math.sin(time);
    camera.position.z = 500 * Math.cos(time);
    camera.position.y = 100; // ارتفاع متوسط
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==================== Start ====================
init();
animate();

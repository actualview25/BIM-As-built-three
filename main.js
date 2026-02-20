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
let previewPoints = []; // نقاط المعاينة
let pipes = [];

// ألوان الأنظمة - أكثر إشراقاً
const pipeColors = {
  EL: 0xffdd44, // أصفر فاقع
  AC: 0x44aaff, // أزرق فاتح
  WP: 0x3388ff, // أزرق
  WA: 0xff5533, // برتقالي-أحمر
  GS: 0x44dd44  // أخضر فاقع
};

let currentPipeType = 'EL';

// ==================== Initialize Scene ====================
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122); // خلفية داكنة قليلاً

  // ========== الإضاءة المحسنة ==========
  // إضاءة محيطة قوية
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // إضاءة اتجاهية رئيسية
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // إضاءة خلفية
  const backLight = new THREE.DirectionalLight(0x446688, 0.8);
  backLight.position.set(-10, 0, -10);
  scene.add(backLight);

  // إضاءة من الأسفل
  const bottomLight = new THREE.PointLight(0x336699, 0.5);
  bottomLight.position.set(0, -10, 0);
  scene.add(bottomLight);

  // نقاط إضاءة متعددة
  const light1 = new THREE.PointLight(0xffaa88, 0.6);
  light1.position.set(15, 5, 15);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x88aaff, 0.6);
  light2.position.set(-15, 5, -15);
  scene.add(light2);

  // ========== الكاميرا ==========
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(300, 100, 300); // بداية أفضل

  // ========== Renderer ==========
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false; // لا نحتاج ظلال

  document.getElementById('container').appendChild(renderer.domElement);

  // ========== Controls ==========
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.maxDistance = 1000;
  controls.minDistance = 100;

  // ========== Panorama ==========
  const loader = new THREE.TextureLoader();
  loader.load('./textures/StartPoint.jpg', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // تحسين جودة الصورة
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const geo = new THREE.SphereGeometry(500, 128, 128); // زيادة الدقة
    geo.scale(-1, 1, 1);

    const mat = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.BackSide // مهم للعرض من الداخل
    });
    
    sphereMesh = new THREE.Mesh(geo, mat);
    scene.add(sphereMesh);

    console.log('✅ Panorama loaded');
    
    // إضافة نقاط تجريبية
    addTestPoints();
  }, undefined, error => {
    console.error('❌ فشل تحميل الصورة:', error);
    // إضافة كرة افتراضية للاختبار
    addFallbackSphere();
  });

  // Event Listeners
  setupEventListeners();
  
  // إضافة شبكة مساعدة (اختياري)
  addHelperGrid();
}

// ========== كرة افتراضية للاختبار ==========
function addFallbackSphere() {
  const geo = new THREE.SphereGeometry(500, 64, 64);
  geo.scale(-1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x224466,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  sphereMesh = new THREE.Mesh(geo, mat);
  scene.add(sphereMesh);
  console.log('✅ Sphere fallback added');
}

// ========== شبكة مساعدة ==========
function addHelperGrid() {
  // شبكة أرضية للمساعدة
  const gridHelper = new THREE.GridHelper(1000, 20, 0x44aaff, 0x336699);
  gridHelper.position.y = -250;
  scene.add(gridHelper);
  
  // محاور للمساعدة
  const axesHelper = new THREE.AxesHelper(300);
  scene.add(axesHelper);
}

// ========== نقاط تجريبية ==========
function addTestPoints() {
  setTimeout(() => {
    if (sphereMesh) {
      // إنشاء مسار حلزوني جميل
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 5) * Math.PI;
        const radius = 300;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(angle * 2) * 100;
        
        // تحويل النقطة إلى سطح الكرة
        const point = new THREE.Vector3(x, y, z).normalize().multiplyScalar(500);
        points.push(point);
      }
      
      selectedPoints = points;
      drawPreview();
      
      // إنشاء ماسورة تجريبية
      setTimeout(() => {
        finalizePipe();
        console.log('✅ مسار تجريبي تم إنشاؤه');
      }, 500);
    }
  }, 2000);
}

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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
    
    // إضافة كرة صغيرة في موقع النقطة
    addPointMarker(point);
    
    drawPreview();
    console.log('📍 نقطة مضافة:', point);
  }
}

// ========== إضافة علامة نقطة ==========
function addPointMarker(position) {
  const geometry = new THREE.SphereGeometry(5, 16, 16);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffaa00,
    emissive: 0x442200,
    roughness: 0.3,
    metalness: 0.1
  });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  
  // حفظ المرجع للحذف لاحقاً
  if (!previewPoints) previewPoints = [];
  previewPoints.push(marker);
}

// ==================== Preview ====================
function drawPreview() {
  // حذف المعاينة السابقة
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  if (selectedPoints.length < 2) return;

  // إنشاء خط معاينة أكثر وضوحاً
  const geo = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const mat = new THREE.LineBasicMaterial({ 
    color: 0xffaa00, 
    linewidth: 3 // لسوء الحظ لا يدعمه WebGL دائماً
  });
  previewLine = new THREE.Line(geo, mat);
  scene.add(previewLine);
  
  // إضافة نقاط على طول الخط للمعاينة
  addPreviewDots(selectedPoints);
}

// ========== نقاط إضافية للمعاينة ==========
function addPreviewDots(points) {
  if (points.length < 2) return;
  
  const dotGeo = new THREE.SphereGeometry(3, 8, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  
  for (let i = 0; i < points.length; i++) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(points[i]);
    scene.add(dot);
    
    if (!previewPoints) previewPoints = [];
    previewPoints.push(dot);
  }
}

// ==================== Final Pipe ====================
function finalizePipe() {
  if (selectedPoints.length < 2) {
    alert('⚠️ يجب إضافة نقطتين على الأقل');
    return;
  }

  // حذف خط المعاينة والعلامات
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }
  
  if (previewPoints) {
    previewPoints.forEach(point => scene.remove(point));
    previewPoints = [];
  }

  try {
    // إنشاء مسار ناعم
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    
    // إنشاء الماسورة بسمك مناسب
    const tubeGeo = new THREE.TubeGeometry(curve, 200, 8, 16, false);
    
    // لون الماسورة مع تأثيرات
    const color = pipeColors[currentPipeType];
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: new THREE.Color(color).multiplyScalar(0.3),
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.95
    });

    const pipe = new THREE.Mesh(tubeGeo, material);
    pipe.castShadow = false;
    pipe.receiveShadow = false;
    
    // إضافة حدود للماسورة (wireframe)
    const wireframeGeo = new THREE.TubeGeometry(curve, 200, 8.2, 16, false);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const wireframe = new THREE.Mesh(wireframeGeo, wireframeMat);
    pipe.add(wireframe);
    
    pipe.userData.type = currentPipeType;
    pipes.push(pipe);
    scene.add(pipe);

    console.log('✅ تم إضافة ماسورة جديدة');
    
    // إضافة نقاط مضيئة في بداية ونهاية الماسورة
    addEndpoints(selectedPoints[0], selectedPoints[selectedPoints.length-1], color);
    
    selectedPoints = [];
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الماسورة:', error);
  }
}

// ========== إضافة نقاط بداية ونهاية ==========
function addEndpoints(start, end, color) {
  const geo = new THREE.SphereGeometry(15, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: new THREE.Color(color).multiplyScalar(0.5),
    roughness: 0.2,
    metalness: 0.3
  });
  
  const startPoint = new THREE.Mesh(geo, mat);
  startPoint.position.copy(start);
  scene.add(startPoint);
  
  const endPoint = new THREE.Mesh(geo, mat);
  endPoint.position.copy(end);
  scene.add(endPoint);
}

// ==================== Undo ====================
function undoLast() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    
    // حذف آخر علامة
    if (previewPoints && previewPoints.length > 0) {
      const lastMarker = previewPoints.pop();
      scene.remove(lastMarker);
    }
    
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
  // إضافة مفتاح لتغيير نوع الماسورة
  if (e.key === '1') currentPipeType = 'EL';
  if (e.key === '2') currentPipeType = 'AC';
  if (e.key === '3') currentPipeType = 'WP';
  if (e.key === '4') currentPipeType = 'WA';
  if (e.key === '5') currentPipeType = 'GS';
}

// ==================== UI Controls ====================
function toggleRotate() {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  
  if (!autorotate) {
    controls.autoRotate = false;
  }
}

function toggleDraw() {
  drawMode = !drawMode;
  const btn = document.getElementById('toggleDraw');
  btn.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  document.body.style.cursor = drawMode ? 'crosshair' : 'default';
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
    // تدوير بطيء وجميل
    const time = Date.now() * 0.0003;
    const radius = 600;
    camera.position.x = Math.sin(time) * radius;
    camera.position.z = Math.cos(time) * radius;
    camera.position.y = 200 + Math.sin(time * 0.5) * 100;
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==================== Start ====================
init();
animate();

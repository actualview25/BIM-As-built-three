import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ==================== Variables ====================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh = null;
let selectedPoints = []; // النقاط المحددة للمسار الحالي
let paths = []; // المسارات النهائية
let tempLine = null; // خط مؤقت للمعاينة
let pointMarkers = []; // علامات النقاط

// ألوان المسارات
const pathColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPathType = 'EL';

// ==================== تهيئة المشهد ====================
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // إضاءة قوية
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  // كاميرا
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  // تحكم
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.rotateSpeed = 0.8;

  // تحميل الصورة
  loadPanorama();

  // أحداث
  setupEvents();
  
  animate();
}

// ==================== تحميل الصورة البانورامية ====================
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  
  loader.load('./textures/StartPoint.jpg', 
    (texture) => {
      console.log('✅ تم تحميل الصورة');
      
      // تصحيح انعكاس الصورة
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.x = -1; // هذا يعكس الصورة أفقياً ليصحح مشكلة المرآة
      
      const geometry = new THREE.SphereGeometry(500, 64, 64);
      
      // مهم جداً: نستخدم FrontSide للرؤية الصحيحة
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide, // تغيير من BackSide إلى FrontSide
        toneMapped: false
      });
      
      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
    },
    undefined,
    (error) => {
      console.error('❌ خطأ في تحميل الصورة:', error);
    }
  );
}

// ==================== نظام الرسم المنظم ====================

// حالة الرسم الحالية
let drawingState = {
  isActive: false,
  currentPoints: [],
  currentType: 'EL'
};

// بدء مسار جديد
function startNewPath() {
  if (!drawMode) return;
  
  // إنهاء المسار الحالي إذا كان موجوداً
  if (selectedPoints.length > 0) {
    saveCurrentPath();
  }
  
  // بدء مسار جديد
  selectedPoints = [];
  clearTempLine();
  clearMarkers();
  
  console.log('🆕 بدء مسار جديد');
}

// حفظ المسار الحالي
function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    console.log('⚠️ المسار يحتاج نقطتين على الأقل');
    return;
  }

  try {
    // إنشاء المسار
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 3, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: pathColors[currentPathType],
      emissive: pathColors[currentPathType],
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.2
    });

    const path = new THREE.Mesh(tubeGeometry, material);
    path.userData = {
      type: currentPathType,
      points: [...selectedPoints],
      createdAt: Date.now()
    };
    
    paths.push(path);
    scene.add(path);
    
    console.log(`✅ تم حفظ مسار ${currentPathType} بنجاح`);
    
    // تنظيف
    selectedPoints = [];
    clearTempLine();
    clearMarkers();
    
  } catch (error) {
    console.error('❌ خطأ في حفظ المسار:', error);
  }
}

// إضافة نقطة
function addPoint(position) {
  if (!drawMode) return;
  
  // إذا كانت هذه أول نقطة في المسار الجديد
  if (selectedPoints.length === 0) {
    console.log('📍 بدء مسار جديد');
  }
  
  // إضافة النقطة
  selectedPoints.push(position.clone());
  
  // إضافة علامة مرئية
  addPointMarker(position);
  
  // تحديث خط المعاينة
  updateTempLine();
  
  console.log(`📍 نقطة ${selectedPoints.length}:`, position);
}

// إضافة علامة نقطة
function addPointMarker(position) {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.5
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  pointMarkers.push(marker);
}

// تحديث خط المعاينة
function updateTempLine() {
  // حذف الخط القديم
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
  
  // إنشاء خط جديد إذا كان لدينا نقطتان على الأقل
  if (selectedPoints.length >= 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints(selectedPoints);
    const material = new THREE.LineBasicMaterial({ 
      color: pathColors[currentPathType],
      linewidth: 2
    });
    tempLine = new THREE.Line(geometry, material);
    scene.add(tempLine);
  }
}

// حذف آخر نقطة
function removeLastPoint() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    
    // حذف آخر علامة
    if (pointMarkers.length > 0) {
      const lastMarker = pointMarkers.pop();
      scene.remove(lastMarker);
    }
    
    updateTempLine();
    console.log('⏪ تم حذف آخر نقطة');
  }
}

// حذف جميع نقاط المسار الحالي
function cancelCurrentPath() {
  selectedPoints = [];
  clearTempLine();
  clearMarkers();
  console.log('🗑️ تم إلغاء المسار الحالي');
}

// تنظيف الخط المؤقت
function clearTempLine() {
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
}

// تنظيف العلامات
function clearMarkers() {
  pointMarkers.forEach(marker => scene.remove(marker));
  pointMarkers = [];
}

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  if (!sphereMesh || !drawMode) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length > 0) {
    addPoint(hits[0].point);
  }
}

// ==================== أحداث لوحة المفاتيح ====================
function onKeyDown(event) {
  // فقط إذا كان وضع الرسم مفعلاً
  if (!drawMode) return;
  
  switch(event.key) {
    case 'Enter':
      event.preventDefault();
      saveCurrentPath();
      break;
      
    case 'Backspace':
      event.preventDefault();
      removeLastPoint();
      break;
      
    case 'Escape':
      event.preventDefault();
      cancelCurrentPath();
      break;
      
    case 'n':
    case 'N':
      event.preventDefault();
      startNewPath();
      break;
      
    // تغيير نوع المسار
    case '1': currentPathType = 'EL'; console.log('🎨 نوع المسار: EL'); break;
    case '2': currentPathType = 'AC'; console.log('🎨 نوع المسار: AC'); break;
    case '3': currentPathType = 'WP'; console.log('🎨 نوع المسار: WP'); break;
    case '4': currentPathType = 'WA'; console.log('🎨 نوع المسار: WA'); break;
    case '5': currentPathType = 'GS'; console.log('🎨 نوع المسار: GS'); break;
  }
}

// ==================== إعداد الأحداث ====================
function setupEvents() {
  window.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
  document.getElementById('toggleRotate').onclick = toggleRotate;
  document.getElementById('toggleDraw').onclick = toggleDraw;
}

// ==================== واجهة المستخدم ====================
function toggleRotate() {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
}

function toggleDraw() {
  drawMode = !drawMode;
  const btn = document.getElementById('toggleDraw');
  
  if (drawMode) {
    btn.textContent = '⛔ إيقاف الرسم';
    btn.style.background = '#aa3333';
    document.body.style.cursor = 'crosshair';
    console.log('🎨 وضع الرسم: مفعل');
    console.log('📝 التعليمات:');
    console.log('  - انقر لإضافة نقاط');
    console.log('  - Enter: حفظ المسار');
    console.log('  - Backspace: حذف آخر نقطة');
    console.log('  - ESC: إلغاء المسار الحالي');
    console.log('  - N: بدء مسار جديد');
    console.log('  - 1-5: تغيير نوع المسار');
  } else {
    btn.textContent = '✏️ تفعيل الرسم';
    btn.style.background = 'rgba(20, 30, 40, 0.8)';
    document.body.style.cursor = 'default';
    
    // إلغاء أي رسم قيد التنفيذ
    cancelCurrentPath();
    console.log('🎨 وضع الرسم: معطل');
  }
}

// ==================== resize ====================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    const time = Date.now() * 0.0003;
    camera.position.x = 0.1 * Math.sin(time);
    camera.position.z = 0.1 * Math.cos(time);
    camera.position.y = 0.05 * Math.sin(time * 0.5);
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==================== بدء التطبيق ====================
init();

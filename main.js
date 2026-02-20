import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

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
let markerPreview = null;

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
init();

function init() {
  console.log('🚀 بدء التهيئة...');
  
  // المشهد
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // الكاميرا - داخل الكرة
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  // الإضاءة
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-1, -1, -0.5);
  scene.add(dirLight2);

  // التحكم
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.5;
  controls.target.set(0, 0, 0);
  controls.update();

  // تحميل البانوراما
  loadPanorama();
  
  // إعداد الأحداث
  setupEvents();
  
  // بدء الرسوم المتحركة
  animate();
  
  console.log('✅ التهيئة اكتملت');
}

// ======================
// تحميل البانوراما
// ======================
function loadPanorama() {
  console.log('🔄 جاري تحميل البانوراما...');
  
  const loader = new THREE.TextureLoader();
  
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      console.log('✅ تم تحميل الصورة');
      
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.x = -1; // تصحيح الانعكاس

      const geometry = new THREE.SphereGeometry(500, 128, 128);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide // الرؤية من الداخل
      });

      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
      
      // إخفاء شاشة التحميل
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
      
      // إعداد معاينة المؤشر
      setupMarkerPreview();
      
      // إضافة مسار تجريبي
      addDemoPath();
    },
    (progress) => {
      console.log(`⏳ التحميل: ${Math.round(progress.loaded / progress.total * 100)}%`);
    },
    (error) => {
      console.error('❌ فشل تحميل الصورة:', error);
      createTestSphere();
    }
  );
}

// ======================
// إنشاء كرة اختبارية
// ======================
function createTestSphere() {
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x224466,
    wireframe: true,
    side: THREE.BackSide
  });
  
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
  
  document.getElementById('loader').style.display = 'none';
  setupMarkerPreview();
  addDemoPath();
}

// ======================
// إعداد معاينة المؤشر
// ======================
function setupMarkerPreview() {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8
  });
  
  markerPreview = new THREE.Mesh(geometry, material);
  scene.add(markerPreview);
  markerPreview.visible = false;
}

// ======================
// مسار تجريبي
// ======================
function addDemoPath() {
  setTimeout(() => {
    // نقاط تجريبية - مسار مربع مع انكسارات واضحة
    const points = [];
    
    // إنشاء مسار بشكل مربع على سطح الكرة
    const radius = 400;
    points.push(new THREE.Vector3(radius, 0, 0).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(0, radius * 0.7, radius * 0.7).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(-radius, 0, 0).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(0, -radius * 0.7, -radius * 0.7).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(radius, 0, 0).normalize().multiplyScalar(480));
    
    selectedPoints = points;
    
    // إضافة علامات للنقاط
    points.forEach(point => addPointMarker(point));
    
    // رسم خط المعاينة
    updateTempLine();
    
    // حفظ المسار بعد ثانية
    setTimeout(() => {
      saveCurrentPath();
    }, 2000);
  }, 2000);
}

// ======================
// أحداث الماوس
// ======================
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onClick(e) {
  if (!drawMode || !sphereMesh) return;
  if (e.target !== renderer.domElement) return;

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    addPoint(hits[0].point.clone());
  }
}

function onMouseMove(e) {
  if (!drawMode || !sphereMesh || !markerPreview) {
    if (markerPreview) markerPreview.visible = false;
    return;
  }
  
  if (e.target !== renderer.domElement) {
    markerPreview.visible = false;
    return;
  }

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    markerPreview.position.copy(hits[0].point);
    markerPreview.material.color.setHex(pathColors[currentPathType]);
    markerPreview.material.emissive.setHex(pathColors[currentPathType]);
    markerPreview.visible = true;
  } else {
    markerPreview.visible = false;
  }
}

// ======================
// إدارة النقاط
// ======================
function addPoint(pos) {
  selectedPoints.push(pos.clone());
  console.log(`📍 نقطة ${selectedPoints.length} مضافة`);
  
  addPointMarker(pos);
  updateTempLine();
}

function addPointMarker(position) {
  const geometry = new THREE.SphereGeometry(6, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.6
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  pointMarkers.push(marker);
}

function updateTempLine() {
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
  
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

function clearCurrentDrawing() {
  selectedPoints = [];
  
  pointMarkers.forEach(marker => scene.remove(marker));
  pointMarkers = [];
  
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
}

// ======================
// دوال إنشاء المسارات المستقيمة (الجزء الأهم)
// ======================

// حفظ المسار الحالي - الخطوط المستقيمة مع انكسارات حادة
function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }

  try {
    // حذف خط المعاينة
    if (tempLine) {
      scene.remove(tempLine);
      tempLine.geometry.dispose();
      tempLine = null;
    }
    
    // إنشاء مسار مستقيم مع انكسارات حادة
    createStraightPath(selectedPoints);
    
    // تنظيف النقاط المؤقتة
    clearCurrentDrawing();
    
    console.log('✅ تم حفظ المسار المستقيم');
    
  } catch (error) {
    console.error('❌ خطأ في حفظ المسار:', error);
  }
}

// إنشاء مسار مستقيم مع انكسارات حادة (باستخدام أسطوانات)
function createStraightPath(points) {
  if (points.length < 2) return;
  
  const color = pathColors[currentPathType];
  
  // إنشاء أجزاء مستقيمة بين كل نقطتين
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    // حساب الاتجاه والمسافة
    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();
    
    // تجنب الأجزاء القصيرة جداً
    if (distance < 5) continue;
    
    // إنشاء أسطوانة (أنبوب مستقيم) - سمك مناسب
    const cylinderRadius = 3.5;
    const cylinderHeight = distance;
    const cylinderGeo = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 12);
    
    // تدوير الأسطوانة لتتجه من start إلى end
    const quaternion = new THREE.Quaternion();
    const defaultDir = new THREE.Vector3(0, 1, 0); // الاتجاه الافتراضي للأسطوانة
    const targetDir = direction.clone().normalize();
    
    quaternion.setFromUnitVectors(defaultDir, targetDir);
    
    // مادة لامعة مع إضاءة
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.3
    });
    
    const cylinder = new THREE.Mesh(cylinderGeo, material);
    cylinder.applyQuaternion(quaternion);
    
    // وضع الأسطوانة في المنتصف بين النقطتين
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    cylinder.position.copy(center);
    
    // إضافة بيانات
    cylinder.userData = {
      type: currentPathType,
      isPathSegment: true,
      start: start.clone(),
      end: end.clone()
    };
    
    scene.add(cylinder);
    paths.push(cylinder);
  }
  
  // إضافة كرات عند نقاط الانكسار (لإخفاء الفراغات وإبراز الانكسارات)
  for (let i = 0; i < points.length; i++) {
    // نقاط البداية والنهاية أكبر قليلاً
    const sphereRadius = (i === 0 || i === points.length - 1) ? 6 : 5;
    
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.2
    });
    
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(points[i]);
    
    sphere.userData = {
      type: currentPathType,
      isJoint: true,
      pointIndex: i
    };
    
    scene.add(sphere);
    paths.push(sphere);
  }
  
  console.log(`✅ تم إنشاء مسار مستقيم بـ ${points.length-1} أجزاء و ${points.length} نقاط`);
}

// طريقة بديلة: خطوط رفيعة مع كرات (إذا أردت نمط آخر)
function createLineWithJoints(points) {
  if (points.length < 2) return;
  
  const color = pathColors[currentPathType];
  
  // إنشاء خط رفيع بين النقاط
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
  const line = new THREE.Line(lineGeo, lineMat);
  scene.add(line);
  paths.push(line);
  
  // إضافة كرات كبيرة عند النقاط
  points.forEach((point, index) => {
    const sphereGeo = new THREE.SphereGeometry(index === 0 || index === points.length-1 ? 7 : 5, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(point);
    scene.add(sphere);
    paths.push(sphere);
  });
}

// ======================
// أحداث لوحة المفاتيح
// ======================
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
        
        if (pointMarkers.length > 0) {
          const lastMarker = pointMarkers.pop();
          scene.remove(lastMarker);
        }
        
        updateTempLine();
        console.log('⏪ تم حذف آخر نقطة');
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      clearCurrentDrawing();
      console.log('🗑️ تم إلغاء الرسم');
      break;
      
    case 'n':
    case 'N':
      e.preventDefault();
      clearCurrentDrawing();
      console.log('🆕 بدء مسار جديد');
      break;
      
    case '1': currentPathType = 'EL'; console.log('🎨 نوع: EL'); break;
    case '2': currentPathType = 'AC'; console.log('🎨 نوع: AC'); break;
    case '3': currentPathType = 'WP'; console.log('🎨 نوع: WP'); break;
    case '4': currentPathType = 'WA'; console.log('🎨 نوع: WA'); break;
    case '5': currentPathType = 'GS'; console.log('🎨 نوع: GS'); break;
  }
}

// ======================
// إعداد الأحداث
// ======================
function setupEvents() {
  // أحداث الماوس على renderer
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  
  // أحداث لوحة المفاتيح
  window.addEventListener('keydown', onKeyDown);
  
  // تغيير الحجم
  window.addEventListener('resize', onResize);
  
  // أزرار التحكم
  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
    document.getElementById('toggleRotate').textContent = 
      autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  };

  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    const btn = document.getElementById('toggleDraw');
    
    if (drawMode) {
      btn.textContent = '⛔ إيقاف الرسم';
      btn.style.background = '#aa3333';
      document.body.style.cursor = 'crosshair';
      if (markerPreview) markerPreview.visible = true;
      controls.autoRotate = false;
    } else {
      btn.textContent = '✏️ تفعيل الرسم';
      btn.style.background = 'rgba(20, 30, 40, 0.9)';
      document.body.style.cursor = 'default';
      if (markerPreview) markerPreview.visible = false;
      controls.autoRotate = autorotate;
      clearCurrentDrawing();
    }
  };

  // زر تثبيت المسار
  const finalizeBtn = document.createElement('button');
  finalizeBtn.textContent = '💾 تثبيت المسار';
  finalizeBtn.style.position = 'absolute';
  finalizeBtn.style.bottom = '25px';
  finalizeBtn.style.left = '400px';
  finalizeBtn.style.padding = '12px 24px';
  finalizeBtn.style.zIndex = '100';
  finalizeBtn.style.borderRadius = '40px';
  finalizeBtn.style.background = '#228822';
  finalizeBtn.style.color = 'white';
  finalizeBtn.style.fontWeight = 'bold';
  finalizeBtn.style.border = 'none';
  finalizeBtn.style.cursor = 'pointer';
  finalizeBtn.style.fontSize = '16px';
  document.body.appendChild(finalizeBtn);

  finalizeBtn.onclick = () => saveCurrentPath();
  
  // زر مسح الكل
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️ مسح الكل';
  clearBtn.style.position = 'absolute';
  clearBtn.style.bottom = '25px';
  clearBtn.style.left = '600px';
  clearBtn.style.padding = '12px 24px';
  clearBtn.style.zIndex = '100';
  clearBtn.style.borderRadius = '40px';
  clearBtn.style.background = '#882222';
  clearBtn.style.color = 'white';
  clearBtn.style.fontWeight = 'bold';
  clearBtn.style.border = 'none';
  clearBtn.style.cursor = 'pointer';
  clearBtn.style.fontSize = '16px';
  document.body.appendChild(clearBtn);

  clearBtn.onclick = () => {
    paths.forEach(path => scene.remove(path));
    paths = [];
    clearCurrentDrawing();
    console.log('🗑️ تم مسح جميع المسارات');
  };
}

// ======================
// تغيير الحجم
// ======================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ======================
// الرسوم المتحركة
// ======================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ======================
// دوال تصدير الصور
// ======================

// إنشاء أزرار التصدير
function addExportButtons() {
  // زر تصدير مع المسارات
  const exportWithPathsBtn = document.createElement('button');
  exportWithPathsBtn.textContent = '📸 تصدير مع المسارات';
  exportWithPathsBtn.style.position = 'absolute';
  exportWithPathsBtn.style.bottom = '25px';
  exportWithPathsBtn.style.left = '820px';
  exportWithPathsBtn.style.padding = '12px 24px';
  exportWithPathsBtn.style.zIndex = '100';
  exportWithPathsBtn.style.borderRadius = '40px';
  exportWithPathsBtn.style.background = '#8844aa';
  exportWithPathsBtn.style.color = 'white';
  exportWithPathsBtn.style.fontWeight = 'bold';
  exportWithPathsBtn.style.border = '2px solid #aa88ff';
  exportWithPathsBtn.style.cursor = 'pointer';
  exportWithPathsBtn.style.fontSize = '16px';
  document.body.appendChild(exportWithPathsBtn);

  // زر تصدير بدون مسارات
  const exportWithoutPathsBtn = document.createElement('button');
  exportWithoutPathsBtn.textContent = '🖼️ تصدير بدون مسارات';
  exportWithoutPathsBtn.style.position = 'absolute';
  exportWithoutPathsBtn.style.bottom = '25px';
  exportWithoutPathsBtn.style.left = '1040px';
  exportWithoutPathsBtn.style.padding = '12px 24px';
  exportWithoutPathsBtn.style.zIndex = '100';
  exportWithoutPathsBtn.style.borderRadius = '40px';
  exportWithoutPathsBtn.style.background = '#448844';
  exportWithoutPathsBtn.style.color = 'white';
  exportWithoutPathsBtn.style.fontWeight = 'bold';
  exportWithoutPathsBtn.style.border = '2px solid #88ff88';
  exportWithoutPathsBtn.style.cursor = 'pointer';
  exportWithoutPathsBtn.style.fontSize = '16px';
  document.body.appendChild(exportWithoutPathsBtn);

  // أحداث الأزرار
  exportWithPathsBtn.onclick = () => exportImage(true);
  exportWithoutPathsBtn.onclick = () => exportImage(false);
}

// دالة التصدير الرئيسية
function exportImage(includePaths) {
  console.log(`📸 جاري تصدير الصورة ${includePaths ? 'مع' : 'بدون'} المسارات...`);
  
  // إيقاف التدوير مؤقتاً
  const wasRotating = autorotate;
  if (wasRotating) {
    autorotate = false;
    controls.autoRotate = false;
  }
  
  // إخفاء عناصر الواجهة مؤقتاً
  const elementsToHide = [
    document.getElementById('toggleRotate'),
    document.getElementById('toggleDraw'),
    document.getElementById('finalizeBtn'),
    document.getElementById('clearBtn'),
    document.querySelector('.hint'),
    document.querySelector('.status-bar'),
    document.querySelector('.color-panel')
  ];
  
  // إضافة المراجع للأزرار الجديدة
  const exportBtns = document.querySelectorAll('button[style*="8844aa"], button[style*="448844"]');
  
  // حفظ حالة الرؤية وإخفاء العناصر
  const hiddenElements = [];
  
  elementsToHide.forEach(el => {
    if (el && el.style) {
      hiddenElements.push({ el, display: el.style.display });
      el.style.display = 'none';
    }
  });
  
  exportBtns.forEach(btn => {
    if (btn && btn.style) {
      hiddenElements.push({ el: btn, display: btn.style.display });
      btn.style.display = 'none';
    }
  });
  
  // إخفاء المعاينة المؤقتة
  if (markerPreview) markerPreview.visible = false;
  
  // إذا كنا نريد تصدير بدون مسارات، نخفي المسارات مؤقتاً
  const pathsVisibility = [];
  if (!includePaths) {
    paths.forEach(path => {
      pathsVisibility.push({ path, visible: path.visible });
      path.visible = false;
    });
    
    // أيضاً نخفي العلامات والنقاط
    pointMarkers.forEach(marker => {
      pathsVisibility.push({ path: marker, visible: marker.visible });
      marker.visible = false;
    });
    
    if (tempLine) {
      pathsVisibility.push({ path: tempLine, visible: tempLine.visible });
      tempLine.visible = false;
    }
  }
  
  // انتظار تحديث المشهد
  setTimeout(() => {
    try {
      // التقاط الصورة
      renderer.render(scene, camera);
      
      // الحصول على بيانات الصورة
      const canvas = renderer.domElement;
      const dataURL = canvas.toDataURL('image/png');
      
      // إنشاء رابط التحميل
      const link = document.createElement('a');
      link.download = `bim-tour-${includePaths ? 'with-paths' : 'without-paths'}-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
      
      console.log('✅ تم تصدير الصورة بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تصدير الصورة:', error);
      alert('حدث خطأ في تصدير الصورة');
      
    } finally {
      // إعادة العناصر المخفية
      hiddenElements.forEach(item => {
        if (item.el) item.el.style.display = item.display || '';
      });
      
      // إعادة المسارات المخفية
      if (!includePaths) {
        pathsVisibility.forEach(item => {
          if (item.path) item.path.visible = item.visible;
        });
      }
      
      // إعادة المعاينة
      if (markerPreview && drawMode) markerPreview.visible = true;
      
      // إعادة التدوير
      if (wasRotating) {
        autorotate = true;
        controls.autoRotate = true;
      }
      
      // إعادة الرسم
      renderer.render(scene, camera);
    }
  }, 100);
}

// ======================
// دالة تصدير متقدمة مع خيارات
// ======================
function showExportDialog() {
  // إنشاء نافذة حوار مخصصة
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.background = 'rgba(20, 30, 40, 0.95)';
  dialog.style.color = 'white';
  dialog.style.padding = '30px';
  dialog.style.borderRadius = '20px';
  dialog.style.zIndex = '1000';
  dialog.style.border = '3px solid #4a6c8f';
  dialog.style.backdropFilter = 'blur(10px)';
  dialog.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)';
  dialog.style.minWidth = '400px';
  
  dialog.innerHTML = `
    <h2 style="margin-top:0; color:#88aaff; text-align:center;">📸 تصدير الصورة</h2>
    
    <div style="margin:20px 0;">
      <label style="display:block; margin-bottom:10px;">
        <input type="radio" name="exportType" value="withPaths" checked> 
        <span style="font-size:18px;">تصدير مع المسارات</span>
      </label>
      
      <label style="display:block; margin:10px 0;">
        <input type="radio" name="exportType" value="withoutPaths"> 
        <span style="font-size:18px;">تصدير بدون مسارات</span>
      </label>
      
      <label style="display:block; margin:10px 0;">
        <input type="radio" name="exportType" value="both"> 
        <span style="font-size:18px;">تصدير الاثنين معاً</span>
      </label>
    </div>
    
    <div style="margin:20px 0;">
      <label style="display:block; margin-bottom:5px;">جودة الصورة:</label>
      <select id="imageQuality" style="width:100%; padding:8px; border-radius:5px;">
        <option value="1">عالية (PNG)</option>
        <option value="0.8">متوسطة (JPEG)</option>
        <option value="0.5">منخفضة (JPEG)</option>
      </select>
    </div>
    
    <div style="display:flex; gap:10px; justify-content:center; margin-top:30px;">
      <button id="exportConfirm" style="padding:12px 30px; background:#228822; color:white; border:none; border-radius:30px; cursor:pointer; font-weight:bold;">تصدير</button>
      <button id="exportCancel" style="padding:12px 30px; background:#882222; color:white; border:none; border-radius:30px; cursor:pointer; font-weight:bold;">إلغاء</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // أحداث الأزرار
  document.getElementById('exportConfirm').onclick = () => {
    const type = document.querySelector('input[name="exportType"]:checked').value;
    const quality = document.getElementById('imageQuality').value;
    
    if (type === 'both') {
      exportImage(true);
      setTimeout(() => exportImage(false), 500);
    } else {
      exportImage(type === 'withPaths');
    }
    
    document.body.removeChild(dialog);
  };
  
  document.getElementById('exportCancel').onclick = () => {
    document.body.removeChild(dialog);
  };
}

// ======================
// دالة تصدير متوافقة مع Marzipano
// ======================
function exportForMarzipano() {
  console.log('🎯 تصدير متوافق مع Marzipano');
  
  // الحصول على إحداثيات الكاميرا الحالية
  const cameraPos = camera.position.clone();
  const cameraTarget = controls.target.clone();
  
  // حفظ الإعدادات
  const exportData = {
    timestamp: Date.now(),
    camera: {
      position: [cameraPos.x, cameraPos.y, cameraPos.z],
      target: [cameraTarget.x, cameraTarget.y, cameraTarget.z]
    },
    paths: paths.map(path => {
      if (path.userData && path.userData.points) {
        return {
          type: path.userData.type,
          points: path.userData.points.map(p => [p.x, p.y, p.z])
        };
      }
      return null;
    }).filter(p => p),
    settings: {
      imageWidth: renderer.domElement.width,
      imageHeight: renderer.domElement.height
    }
  };
  
  // تصدير كملف JSON مع الصورة
  const jsonStr = JSON.stringify(exportData, null, 2);
  const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  
  const jsonLink = document.createElement('a');
  jsonLink.download = `marzipano-data-${Date.now()}.json`;
  jsonLink.href = jsonUrl;
  jsonLink.click();
  
  // تصدير الصورة
  exportImage(true);
  
  console.log('✅ تم تصدير بيانات Marzipano');
}

// أضف هذا السطر في دالة setupEvents بعد إنشاء الأزرار الأخرى
addExportButtons();

// أضف زر تصدير متقدم
const advancedExportBtn = document.createElement('button');
advancedExportBtn.textContent = '🎯 تصدير متقدم';
advancedExportBtn.style.position = 'absolute';
advancedExportBtn.style.bottom = '25px';
advancedExportBtn.style.left = '1260px';
advancedExportBtn.style.padding = '12px 24px';
advancedExportBtn.style.zIndex = '100';
advancedExportBtn.style.borderRadius = '40px';
advancedExportBtn.style.background = '#aa44aa';
advancedExportBtn.style.color = 'white';
advancedExportBtn.style.fontWeight = 'bold';
advancedExportBtn.style.border = '2px solid #ff88ff';
advancedExportBtn.style.cursor = 'pointer';
advancedExportBtn.style.fontSize = '16px';
document.body.appendChild(advancedExportBtn);

advancedExportBtn.onclick = showExportDialog;

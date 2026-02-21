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

// متغيرات التصدير
let exportCanvas, exportContext;
let isExporting = false;

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
  if (markerPreview) {
    markerPreview.material.color.setHex(pathColors[currentPathType]);
    markerPreview.material.emissive.setHex(pathColors[currentPathType]);
  }
  
  const statusSpan = document.querySelector('#status span');
  if (statusSpan) {
    statusSpan.style.color = '#' + pathColors[t].toString(16).padStart(6, '0');
    statusSpan.textContent = t;
  }
};

// ======================
// تهيئة المشهد
// ======================
init();

function init() {
  console.log('🚀 بدء التهيئة...');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-1, -1, -0.5);
  scene.add(dirLight2);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.5;
  controls.target.set(0, 0, 0);
  controls.update();

  loadPanorama();
  setupEvents();
  setupExportCanvas();
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
      texture.repeat.x = -1;

      const geometry = new THREE.SphereGeometry(500, 128, 128);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
      
      const loaderEl = document.getElementById('loader');
      if (loaderEl) loaderEl.style.display = 'none';
      
      setupMarkerPreview();
      
      // ❌ تم إزالة استدعاء addDemoPath() نهائياً
      // لن يظهر أي مسار تجريبي
    },
    (progress) => {
      console.log(`⏳ التحميل: ${Math.round((progress.loaded / progress.total) * 100)}%`);
    },
    (error) => {
      console.error('❌ فشل تحميل الصورة:', error);
      createTestSphere();
    }
  );
}

// ======================
// إنشاء كرة اختبارية (بدون مسار تجريبي)
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
  // ❌ بدون addDemoPath()
}

// ======================
// إعداد معاينة المؤشر
// ======================
function setupMarkerPreview() {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.8
  });
  
  markerPreview = new THREE.Mesh(geometry, material);
  scene.add(markerPreview);
  markerPreview.visible = false;
}

// ======================
// ⚠️ تم تعطيل دالة المسار التجريبي نهائياً
// ======================
function addDemoPath() {
  // هذه الدالة معطلة تماماً - لن يتم استدعاؤها أبداً
  console.log('⚠️ المسار التجريبي معطل');
  return;
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
      color: pathColors[currentPathType]
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
// دوال إنشاء المسارات المستقيمة
// ======================
function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }

  try {
    if (tempLine) {
      scene.remove(tempLine);
      tempLine.geometry.dispose();
      tempLine = null;
    }
    
    createStraightPath(selectedPoints);
    clearCurrentDrawing();
    
    console.log('✅ تم حفظ المسار المستقيم');
    
  } catch (error) {
    console.error('❌ خطأ في حفظ المسار:', error);
  }
}

function createStraightPath(points) {
  if (points.length < 2) return;
  
  const color = pathColors[currentPathType];
  
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();
    
    if (distance < 5) continue;
    
    const cylinderRadius = 3.5;
    const cylinderHeight = distance;
    const cylinderGeo = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 12);
    
    const quaternion = new THREE.Quaternion();
    const defaultDir = new THREE.Vector3(0, 1, 0);
    const targetDir = direction.clone().normalize();
    
    quaternion.setFromUnitVectors(defaultDir, targetDir);
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.3
    });
    
    const cylinder = new THREE.Mesh(cylinderGeo, material);
    cylinder.applyQuaternion(quaternion);
    
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    cylinder.position.copy(center);
    
    cylinder.userData = {
      type: currentPathType,
      points: [start.clone(), end.clone()],
      isPathSegment: true
    };
    
    scene.add(cylinder);
    paths.push(cylinder);
  }
  
  for (let i = 0; i < points.length; i++) {
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
      points: [points[i].clone()],
      isJoint: true,
      pointIndex: i
    };
    
    scene.add(sphere);
    paths.push(sphere);
  }
  
  console.log(`✅ تم إنشاء مسار مستقيم بـ ${points.length-1} أجزاء و ${points.length} نقاط`);
}

// =======================================
// نظام تصدير الصور البانورامية 360 درجة
// =======================================
function setupExportCanvas() {
  exportCanvas = document.createElement('canvas');
  exportCanvas.width = 4096;
  exportCanvas.height = 2048;
  exportContext = exportCanvas.getContext('2d');
  console.log('✅ Canvas التصدير جاهز');
}

// =======================================
// دالة تحويل محسنة - تضبط مكان المسارات بشكل صحيح
// =======================================
// =======================================
// دالة تحويل محسنة 100% - تعطي نفس مكان النقاط في المشهد
// =======================================
function projectToUV(point) {
  // تطبيع النقطة (تصبح على سطح كرة نصف قطرها 1)
  const normalized = point.clone().normalize();
  
  // حساب الزوايا
  // theta: الزاوية من المحور Y (0 في القطب الشمالي، PI في القطب الجنوبي)
  const theta = Math.acos(normalized.y);
  
  // phi: الزاوية حول المحور Y (-PI إلى PI)
  let phi = Math.atan2(normalized.z, normalized.x);
  
  // في Three.js، الصورة تلتف حول الكرة بطريقة معينة
  // نحتاج لضبط phi ليتناسب مع طريقة لف الصورة
  
  // تحويل phi من [-PI, PI] إلى [0, 2PI]
  phi = (phi + 2 * Math.PI) % (2 * Math.PI);
  
  // في الكرة المعكوسة (side: THREE.BackSide)، الصورة تكون معكوسة أفقياً
  // لذلك نعكس phi
  phi = (2 * Math.PI - phi) % (2 * Math.PI);
  
  // تحويل إلى إحداثيات الصورة (0 إلى 1)
  const u = phi / (2 * Math.PI);
  const v = theta / Math.PI;
  
  return { u, v };
}

// =======================================
// دالة اختبار بسيطة - ترسم نقطة حمراء في مكان النقاط
// =======================================
function testPointLocation(ctx, points) {
  if (!points || points.length === 0) return;
  
  // خذ أول نقطة
  const point = points[0];
  const uv = projectToUV(point);
  
  const x = uv.u * ctx.canvas.width;
  const y = uv.v * ctx.canvas.height;
  
  // ارسم دائرة حمراء كبيرة
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = '#ff0000';
  ctx.arc(x, y, 20, 0, 2 * Math.PI);
  ctx.fill();
  
  // ارسم دائرة بيضاء صغيرة في المنتصف
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(x, y, 8, 0, 2 * Math.PI);
  ctx.fill();
  
  // اكتب الإحداثيات
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`Point (${Math.round(x)}, ${Math.round(y)})`, x + 30, y);
  
  ctx.restore();
  
  console.log('📍 نقطة الاختبار:', {
    x: x,
    y: y,
    u: uv.u,
    v: uv.v
  });
}

// =======================================
// دالة التصدير المعدلة
// =======================================
function exportPanorama(includePaths = true) {
  if (isExporting) {
    console.log('⏳ جاري التصدير بالفعل...');
    return;
  }

  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  isExporting = true;
  console.log(`🔄 جاري تصدير البانوراما 360 ${includePaths ? 'مع' : 'بدون'} المسارات...`);

  const texture = sphereMesh.material.map;
  const image = texture.image;

  // مسح الرسم السابق
  exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  
  // رسم الصورة الأصلية
  exportContext.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);

  // رسم المسارات إذا طلب ذلك
  if (includePaths) {
    console.log(`📊 عدد المسارات: ${paths.length}`);
    
    // رسم جميع المسارات المحفوظة
    paths.forEach(path => {
      if (path.userData && path.userData.points && path.userData.points.length > 0) {
        const points = path.userData.points;
        const color = pathColors[path.userData.type] || 0xffcc00;
        const colorStr = '#' + color.toString(16).padStart(6, '0');
        
        // ارسم المسار
        drawPathOnCanvas(exportContext, points, colorStr, 4);
        
        // اختبر موقع أول نقطة في هذا المسار
        testPointLocation(exportContext, points);
      }
    });

    // رسم المسار الحالي (إذا كان قيد الإنشاء)
    if (selectedPoints.length > 0) {
      const colorStr = '#' + pathColors[currentPathType].toString(16).padStart(6, '0');
      drawPathOnCanvas(exportContext, selectedPoints, colorStr, 3);
      testPointLocation(exportContext, selectedPoints);
    }
  }

  try {
    // تصدير الصورة
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `panorama-360-${includePaths ? 'with-paths' : 'without-paths'}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    
    console.log('✅ تم تصدير البانوراما بنجاح');
    
    // فتح الصورة في نافذة جديدة للمعاينة
    const previewWindow = window.open('');
    previewWindow.document.write(`
      <html>
        <head>
          <title>معاينة البانوراما</title>
          <style>
            body { margin:0; background:#000; text-align:center; }
            img { max-width:100%; max-height:100vh; }
            .info { position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.8); color:#fff; padding:10px; border-radius:5px; }
          </style>
        </head>
        <body>
          <div class="info">
            <strong>النقاط الحمراء:</strong> موقع النقاط في الصورة<br>
            <strong>المسارات:</strong> ملونة حسب النوع
          </div>
          <img src="${dataURL}">
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ خطأ في التصدير:', error);
    alert('حدث خطأ في تصدير الصورة');
  }

  isExporting = false;
}

// =======================================
// دالة رسم المسار (بدون تغيير)
// =======================================
function drawPathOnCanvas(ctx, points, color, width = 4) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // تحويل جميع النقاط إلى إحداثيات UV
  const uvPoints = points.map(p => projectToUV(p));

  ctx.beginPath();
  
  for (let i = 0; i < uvPoints.length - 1; i++) {
    const p1 = uvPoints[i];
    const p2 = uvPoints[i + 1];

    const x1 = p1.u * ctx.canvas.width;
    const y1 = p1.v * ctx.canvas.height;
    const x2 = p2.u * ctx.canvas.width;
    const y2 = p2.v * ctx.canvas.height;

    // التعامل مع عبور الحافة
    if (Math.abs(x2 - x1) > ctx.canvas.width / 2) {
      ctx.stroke();
      ctx.beginPath();
      
      if (x1 < ctx.canvas.width / 2) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(ctx.canvas.width, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y2);
        ctx.lineTo(x2, y2);
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(0, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ctx.canvas.width, y2);
        ctx.lineTo(x2, y2);
      }
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  
  ctx.stroke();

  // رسم النقاط
  uvPoints.forEach((uv, index) => {
    const x = uv.u * ctx.canvas.width;
    const y = uv.v * ctx.canvas.height;
    
    // حجم مختلف للنقاط
    const radius = (index === 0 || index === uvPoints.length - 1) ? width * 2.5 : width * 2;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.restore();
}
// =======================================
// دالة رسم المسار على الصورة (محدثة)
// =======================================
function drawPathOnCanvas(ctx, points, color, width = 4) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // تحويل جميع النقاط إلى إحداثيات UV
  const uvPoints = points.map(p => projectToUV(p));
  
  // للتأكد من الإحداثيات، اطبع أول نقطة في الكونسول
  if (points === selectedPoints && points.length > 0) {
    console.log('🔍 أول نقطة:', {
      original: points[0],
      uv: uvPoints[0],
      x: uvPoints[0].u * ctx.canvas.width,
      y: uvPoints[0].v * ctx.canvas.height
    });
  }

  ctx.beginPath();
  
  for (let i = 0; i < uvPoints.length - 1; i++) {
    const p1 = uvPoints[i];
    const p2 = uvPoints[i + 1];

    const x1 = p1.u * ctx.canvas.width;
    const y1 = p1.v * ctx.canvas.height;
    const x2 = p2.u * ctx.canvas.width;
    const y2 = p2.v * ctx.canvas.height;

    // التعامل مع عبور الحافة
    if (Math.abs(x2 - x1) > ctx.canvas.width / 2) {
      ctx.stroke();
      ctx.beginPath();
      
      if (x1 < ctx.canvas.width / 2) {
        // من x1 إلى الحافة اليمنى
        ctx.moveTo(x1, y1);
        ctx.lineTo(ctx.canvas.width, y1);
        ctx.stroke();
        
        // من الحافة اليسرى إلى x2
        ctx.beginPath();
        ctx.moveTo(0, y2);
        ctx.lineTo(x2, y2);
      } else {
        // من x1 إلى الحافة اليسرى
        ctx.moveTo(x1, y1);
        ctx.lineTo(0, y1);
        ctx.stroke();
        
        // من الحافة اليمنى إلى x2
        ctx.beginPath();
        ctx.moveTo(ctx.canvas.width, y2);
        ctx.lineTo(x2, y2);
      }
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  
  ctx.stroke();

  // رسم النقاط
  uvPoints.forEach((uv, index) => {
    const x = uv.u * ctx.canvas.width;
    const y = uv.v * ctx.canvas.height;
    
    // حجم مختلف للنقاط (البداية والنهاية أكبر)
    const radius = (index === 0 || index === uvPoints.length - 1) ? width * 2.5 : width * 2;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // حدود بيضاء حول النقاط
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.restore();
}

// =======================================
// دالة التصدير مع إمكانية اختبار الإحداثيات
// =======================================
function exportPanorama(includePaths = true, debug = false) {
  if (isExporting) {
    console.log('⏳ جاري التصدير بالفعل...');
    return;
  }

  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  isExporting = true;
  console.log(`🔄 جاري تصدير البانوراما 360 ${includePaths ? 'مع' : 'بدون'} المسارات...`);

  const texture = sphereMesh.material.map;
  const image = texture.image;

  // مسح الرسم السابق
  exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  
  // رسم الصورة الأصلية
  exportContext.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);

  // إذا أردنا اختبار الإحداثيات
  if (debug) {
    drawTestPoints(exportContext);
  }

  // رسم المسارات إذا طلب ذلك
  if (includePaths) {
    console.log(`📊 عدد المسارات: ${paths.length}`);
    
    // رسم جميع المسارات المحفوظة
    paths.forEach(path => {
      if (path.userData && path.userData.points && path.userData.points.length > 0) {
        const points = path.userData.points;
        const color = pathColors[path.userData.type] || 0xffcc00;
        const colorStr = '#' + color.toString(16).padStart(6, '0');
        
        drawPathOnCanvas(exportContext, points, colorStr, 4);
        console.log(`🎨 رسم مسار ${path.userData.type} بعدد نقاط: ${points.length}`);
      }
    });

    // رسم المسار الحالي (إذا كان قيد الإنشاء)
    if (selectedPoints.length > 0) {
      const colorStr = '#' + pathColors[currentPathType].toString(16).padStart(6, '0');
      drawPathOnCanvas(exportContext, selectedPoints, colorStr, 3);
      console.log(`✏️ رسم مسار مؤقت بعدد نقاط: ${selectedPoints.length}`);
    }
  }

  try {
    // تصدير الصورة
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `panorama-360-${includePaths ? 'with-paths' : 'without-paths'}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    
    console.log('✅ تم تصدير البانوراما بنجاح');
    
    // فتح الصورة في نافذة جديدة للمعاينة
    if (debug) {
      const previewWindow = window.open('');
      previewWindow.document.write(`
        <html>
          <head><title>معاينة البانوراما</title></head>
          <body style="margin:0; background:#000;">
            <img src="${dataURL}" style="width:100%; height:auto;">
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('❌ خطأ في التصدير:', error);
    alert('حدث خطأ في تصدير الصورة');
  }

  isExporting = false;
}

function exportMarzipanoData() {
  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  console.log('🎯 تحضير بيانات Marzipano...');

  const pathsData = [];

  // جمع المسارات الحقيقية فقط
  paths.forEach(path => {
    if (path.userData && path.userData.points && path.userData.points.length > 0) {
      const points = path.userData.points;
      const uvPoints = points.map(p => {
        const uv = projectToUV(p);
        return [uv.u, uv.v];
      });

      pathsData.push({
        type: path.userData.type,
        color: '#' + pathColors[path.userData.type].toString(16).padStart(6, '0'),
        points: uvPoints
      });
    }
  });

  if (selectedPoints.length > 0) {
    const uvPoints = selectedPoints.map(p => {
      const uv = projectToUV(p);
      return [uv.u, uv.v];
    });

    pathsData.push({
      type: currentPathType,
      color: '#' + pathColors[currentPathType].toString(16).padStart(6, '0'),
      points: uvPoints,
      isTemporary: true
    });
  }

  const marzipanoData = {
    version: "1.0",
    timestamp: Date.now(),
    imageSize: [exportCanvas.width, exportCanvas.height],
    paths: pathsData
  };

  const jsonStr = JSON.stringify(marzipanoData, null, 2);
  const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);

  const jsonLink = document.createElement('a');
  jsonLink.download = `marzipano-paths-${Date.now()}.json`;
  jsonLink.href = jsonUrl;
  jsonLink.click();

  console.log('✅ تم تصدير بيانات Marzipano');
}

function exportComplete() {
  exportPanorama(true);
  setTimeout(() => {
    exportMarzipanoData();
  }, 500);
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
        const last = pointMarkers.pop();
        if (last) scene.remove(last);
        updateTempLine();
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      clearCurrentDrawing();
      break;
      
    case 'n':
    case 'N':
      e.preventDefault();
      clearCurrentDrawing();
      break;
      
    case '1':
      currentPathType = 'EL';
      window.setCurrentPathType('EL');
      break;
    case '2':
      currentPathType = 'AC';
      window.setCurrentPathType('AC');
      break;
    case '3':
      currentPathType = 'WP';
      window.setCurrentPathType('WP');
      break;
    case '4':
      currentPathType = 'WA';
      window.setCurrentPathType('WA');
      break;
    case '5':
      currentPathType = 'GS';
      window.setCurrentPathType('GS');
      break;
  }
}

// ======================
// إعداد الأحداث والأزرار
// ======================
function setupEvents() {
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
  // أزرار التحكم - استخدام الأزرار الموجودة في HTML
  const toggleRotateBtn = document.getElementById('toggleRotate');
  const toggleDrawBtn = document.getElementById('toggleDraw');
  const finalizeBtn = document.getElementById('finalizeBtn');
  
  if (toggleRotateBtn) {
    toggleRotateBtn.onclick = () => {
      autorotate = !autorotate;
      controls.autoRotate = autorotate;
      toggleRotateBtn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
    };
  }

  if (toggleDrawBtn) {
    toggleDrawBtn.onclick = () => {
      drawMode = !drawMode;
      
      if (drawMode) {
        toggleDrawBtn.textContent = '⛔ إيقاف الرسم';
        toggleDrawBtn.style.background = '#aa3333';
        document.body.style.cursor = 'crosshair';
        if (markerPreview) markerPreview.visible = true;
        controls.autoRotate = false;
      } else {
        toggleDrawBtn.textContent = '✏️ تفعيل الرسم';
        toggleDrawBtn.style.background = '#8f6c4a';
        document.body.style.cursor = 'default';
        if (markerPreview) markerPreview.visible = false;
        controls.autoRotate = autorotate;
        clearCurrentDrawing();
      }
    };
  }

  if (finalizeBtn) {
    finalizeBtn.style.display = 'block';
    finalizeBtn.style.position = 'absolute';
    finalizeBtn.style.bottom = '25px';
    finalizeBtn.style.left = '375px';
    finalizeBtn.style.padding = '12px 24px';
    finalizeBtn.style.zIndex = '100';
    finalizeBtn.style.borderRadius = '40px';
    finalizeBtn.style.background = '#228822';
    finalizeBtn.style.color = 'white';
    finalizeBtn.style.fontWeight = 'bold';
    finalizeBtn.style.border = 'none';
    finalizeBtn.style.cursor = 'pointer';
    finalizeBtn.style.fontSize = '16px';
    finalizeBtn.onclick = saveCurrentPath;
  }
  
  // زر مسح الكل
  const clearBtn = document.createElement('button');
  clearBtn.id = 'clearBtn';
  clearBtn.textContent = '🗑️ مسح الكل';
  clearBtn.style.position = 'absolute';
  clearBtn.style.bottom = '25px';
  clearBtn.style.left = '550px';
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
    if (confirm('هل أنت متأكد من مسح جميع المسارات؟')) {
      paths.forEach(path => scene.remove(path));
      paths = [];
      clearCurrentDrawing();
      console.log('🗑️ تم مسح جميع المسارات');
    }
  };
  
  // إضافة أزرار التصدير
  addExportButtons();
}

// ======================
// إضافة أزرار التصدير
// ======================
function addExportButtons() {
  const oldExport = document.querySelector('.export-controls');
  if (oldExport) oldExport.remove();

  const exportDiv = document.createElement('div');
  exportDiv.className = 'export-controls';
  exportDiv.innerHTML = `
    <button id="exportWithPaths">🌐 تصدير مع المسارات</button>
    <button id="exportWithoutPaths">🌅 تصدير بدون مسارات</button>
    <button id="exportMarzipano">📊 تصدير بيانات Marzipano</button>
    <button id="exportComplete">📦 تصدير كامل</button>
  `;
  
  document.body.appendChild(exportDiv);

  document.getElementById('exportWithPaths').onclick = () => exportPanorama(true);
  document.getElementById('exportWithoutPaths').onclick = () => exportPanorama(false);
  document.getElementById('exportMarzipano').onclick = exportMarzipanoData;
  document.getElementById('exportComplete').onclick = exportComplete;
  
  console.log('✅ أزرار التصدير تمت إضافتها');
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

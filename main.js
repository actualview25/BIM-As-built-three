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
      addDemoPath();
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
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
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
    const points = [];
    const radius = 400;
    
    points.push(new THREE.Vector3(radius, 0, 0).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(0, radius * 0.7, radius * 0.7).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(-radius, 0, 0).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(0, -radius * 0.7, -radius * 0.7).normalize().multiplyScalar(480));
    points.push(new THREE.Vector3(radius, 0, 0).normalize().multiplyScalar(480));
    
    selectedPoints = points;
    points.forEach(point => addPointMarker(point));
    updateTempLine();
    
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
// نظام التصدير الذكي لـ Marzipano
// =======================================

// إعداد Canvas للتصدير
function setupExportCanvas() {
  exportCanvas = document.createElement('canvas');
  exportCanvas.width = 4096;
  exportCanvas.height = 2048;
  exportContext = exportCanvas.getContext('2d');
  console.log('✅ Canvas التصدير جاهز');
}

// تحويل نقطة ثلاثية الأبعاد إلى yaw/pitch لـ Marzipano
function pointToYawPitch(point) {
  const normalized = point.clone().normalize();
  
  // yaw: زاوية أفقية (0 إلى 2PI)
  let yaw = Math.atan2(normalized.z, normalized.x);
  yaw = (yaw + 2 * Math.PI) % (2 * Math.PI);
  
  // pitch: زاوية رأسية (-PI/2 إلى PI/2)
  const pitch = Math.asin(normalized.y);
  
  return { yaw, pitch };
}

// دالة التصدير الرئيسية (زر واحد يفعل كل شيء)
function exportForMarzipano() {
  if (isExporting) {
    console.log('⏳ جاري التصدير بالفعل...');
    return;
  }

  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  isExporting = true;
  console.log('🎯 بدء تصدير حزمة Marzipano المتكاملة...');

  // 1. الحصول على الصورة الأصلية
  const texture = sphereMesh.material.map;
  const image = texture.image;

  // 2. إنشاء مجلد وهمي للتصدير
  const timestamp = Date.now();
  const folderName = `marzipano-export-${timestamp}`;

  // 3. تجميع بيانات المسارات
  const pathsData = [];
  
  paths.forEach(path => {
    if (path.userData && path.userData.points && path.userData.points.length > 0) {
      const points = path.userData.points;
      
      // تحويل كل نقطة إلى yaw/pitch
      const coordinates = points.map(p => {
        const { yaw, pitch } = pointToYawPitch(p);
        return {
          x: yaw,
          y: pitch,
          type: path.userData.type
        };
      });

      pathsData.push({
        type: path.userData.type,
        color: '#' + pathColors[path.userData.type].toString(16).padStart(6, '0'),
        points: points.map(p => {
          const { yaw, pitch } = pointToYawPitch(p);
          return [yaw, pitch];
        }),
        coordinates: coordinates
      });
    }
  });

  // 4. إنشاء ملف JSON الرئيسي
  const marzipanoData = {
    version: "1.0",
    timestamp: timestamp,
    name: "BIM Virtual Tour Export",
    image: {
      filename: `panorama-${timestamp}.jpg`,
      width: exportCanvas.width,
      height: exportCanvas.height
    },
    paths: pathsData,
    metadata: {
      totalPaths: pathsData.length,
      types: Object.keys(pathColors).map(key => ({
        type: key,
        color: '#' + pathColors[key].toString(16).padStart(6, '0')
      }))
    }
  };

  // 5. تصدير الصورة (JPEG للتوافق مع Marzipano)
  exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);
  
  // 6. تصدير كل شيء
  try {
    // تصدير الصورة
    const imageDataURL = exportCanvas.toDataURL('image/jpeg', 0.95);
    const imageLink = document.createElement('a');
    imageLink.download = `panorama-${timestamp}.jpg`;
    imageLink.href = imageDataURL;
    imageLink.click();

    // تصدير ملف JSON
    setTimeout(() => {
      const jsonStr = JSON.stringify(marzipanoData, null, 2);
      const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      
      const jsonLink = document.createElement('a');
      jsonLink.download = `marzipano-data-${timestamp}.json`;
      jsonLink.href = jsonUrl;
      jsonLink.click();
      
      console.log('✅ تم تصدير حزمة Marzipano بنجاح');
      alert(`✅ تم التصدير بنجاح!\n📸 الصورة: panorama-${timestamp}.jpg\n📊 البيانات: marzipano-data-${timestamp}.json`);
    }, 500);

  } catch (error) {
    console.error('❌ خطأ في التصدير:', error);
    alert('حدث خطأ في التصدير');
  }

  isExporting = false;
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
// إعداد الأحداث
// ======================
function setupEvents() {
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
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
  
  // زر التصدير الذكي - زر واحد فقط!
  const exportBtn = document.createElement('button');
  exportBtn.id = 'exportMarzipanoBtn';
  exportBtn.textContent = '📦 تصدير Marzipano';
  exportBtn.style.position = 'absolute';
  exportBtn.style.bottom = '25px';
  exportBtn.style.left = '725px';
  exportBtn.style.padding = '12px 24px';
  exportBtn.style.zIndex = '100';
  exportBtn.style.borderRadius = '40px';
  exportBtn.style.background = '#8844aa';
  exportBtn.style.color = 'white';
  exportBtn.style.fontWeight = 'bold';
  exportBtn.style.border = '2px solid #cc88ff';
  exportBtn.style.cursor = 'pointer';
  exportBtn.style.fontSize = '16px';
  document.body.appendChild(exportBtn);

  exportBtn.onclick = exportForMarzipano;
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

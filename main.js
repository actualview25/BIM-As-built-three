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
let markers = [];

const pipeColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPipeType = 'EL';

// ==================== Scene ====================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // خلفية سوداء صافية

// ==================== Lights ====================
// إضاءة محيطة قوية جداً
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

// إضاءة اتجاهية من عدة اتجاهات
const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
light1.position.set(1, 1, 1);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0x88aaff, 1.0);
light2.position.set(-1, -1, -1);
scene.add(light2);

const light3 = new THREE.PointLight(0xffffff, 1.0);
light3.position.set(0, 0, 0);
scene.add(light3);

// ==================== Camera ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1); // داخل الكرة

// ==================== Renderer ====================
renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.getElementById('container').appendChild(renderer.domElement);

// ==================== Controls ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.8;

// ==================== Panorama ====================
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  
  // استخدام CrossOrigin لتجنب مشاكل CORS
  loader.crossOrigin = "Anonymous";
  
  loader.load(
    './textures/StartPoint.jpg', 
    (texture) => {
      console.log('✅ تم تحميل الصورة بنجاح');
      
      // ضبط إعدادات النسيج بشكل صحيح
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      // إنشاء الكرة - الأهم هنا أن الكرة معكوسة للداخل
      const geometry = new THREE.SphereGeometry(500, 128, 128);
      
      // مادة الكرة - نستخدم BackSide للرؤية من الداخل
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide, // هذا هو الحل! 🔑
        toneMapped: false // للحفاظ على ألوان الصورة الأصلية
      });
      
      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
      
      console.log('✅ تم إنشاء المشهد البانورامي');
      
      // إضافة مسار تجريبي بعد 2 ثانية
      setTimeout(addDemoPath, 2000);
    },
    (progress) => {
      // أثناء التحميل
      console.log(`⏳ جاري التحميل: ${Math.round(progress.loaded / progress.total * 100)}%`);
    },
    (error) => {
      console.error('❌ فشل تحميل الصورة:', error);
      // إنشاء كرة ملونة للاختبار
      createFallbackSphere();
    }
  );
}

// ==================== كرة احتياطية ====================
function createFallbackSphere() {
  console.log('⚪ إنشاء كرة اختبارية');
  
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  
  // إنشاء نسيج ملون بسيط
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // خلفية متدرجة
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#223344');
  gradient.addColorStop(0.5, '#445566');
  gradient.addColorStop(1, '#667788');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // شبكة
  ctx.strokeStyle = '#88aaff';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (canvas.width/16), 0);
    ctx.lineTo(i * (canvas.width/16), canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (canvas.height/8));
    ctx.lineTo(canvas.width, i * (canvas.height/8));
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide // الأهم!
  });
  
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
  
  addDemoPath();
}

// ==================== مسار تجريبي ====================
function addDemoPath() {
  // إنشاء مسار مرئي بوضوح
  const points = [];
  
  // مسار حلزوني كبير
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const angle = t * Math.PI * 4;
    const radius = 300;
    
    // نقطة على سطح الكرة
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle * 2) * 200;
    const z = Math.sin(angle) * radius;
    
    // تطبيع النقطة إلى سطح الكرة
    const point = new THREE.Vector3(x, y, z).normalize().multiplyScalar(480);
    points.push(point);
  }
  
  selectedPoints = points;
  
  // إضافة علامات لكل نقطة
  points.forEach(point => {
    const markerGeo = new THREE.SphereGeometry(10, 16, 16);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x442200
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(point);
    scene.add(marker);
    markers.push(marker);
  });
  
  // رسم خط المعاينة
  drawPreview();
  
  // إنشاء المسار النهائي بعد ثانية
  setTimeout(() => {
    finalizePipe();
  }, 1000);
  
  console.log('✅ تم إنشاء مسار تجريبي');
}

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', e => {
  if (!sphereMesh || !drawMode) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    const point = hits[0].point.clone();
    selectedPoints.push(point);
    addMarker(point);
    drawPreview();
    console.log('📍 نقطة مضافة:', point);
  }
});

// ==================== إضافة علامة ====================
function addMarker(position) {
  const geometry = new THREE.SphereGeometry(12, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pipeColors[currentPipeType],
    emissive: pipeColors[currentPipeType],
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.1
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  markers.push(marker);
}

// ==================== Preview ====================
function drawPreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
  }

  if (selectedPoints.length < 2) return;

  const points = selectedPoints.map(p => p.clone());
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: pipeColors[currentPipeType],
    linewidth: 2
  });
  
  previewLine = new THREE.Line(geometry, material);
  scene.add(previewLine);
}

// ==================== Final Pipe ====================
function finalizePipe() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }

  // حذف المعاينات
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }
  
  markers.forEach(marker => scene.remove(marker));
  markers = [];

  try {
    // إنشاء منحنى ناعم
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    
    // أنبوب سميك وواضح
    const tubeGeometry = new THREE.TubeGeometry(curve, 200, 6, 16, false);
    const material = new THREE.MeshStandardMaterial({
      color: pipeColors[currentPipeType],
      emissive: pipeColors[currentPipeType],
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.95
    });

    const pipe = new THREE.Mesh(tubeGeometry, material);
    pipe.userData.type = currentPipeType;
    pipes.push(pipe);
    scene.add(pipe);
    
    // نقاط بداية ونهاية
    const endpointGeo = new THREE.SphereGeometry(18, 24, 24);
    const endpointMat = new THREE.MeshStandardMaterial({
      color: pipeColors[currentPipeType],
      emissive: pipeColors[currentPipeType],
      emissiveIntensity: 0.8
    });
    
    const startPoint = new THREE.Mesh(endpointGeo, endpointMat);
    startPoint.position.copy(selectedPoints[0]);
    scene.add(startPoint);
    
    const endPoint = new THREE.Mesh(endpointGeo, endpointMat);
    endPoint.position.copy(selectedPoints[selectedPoints.length - 1]);
    scene.add(endPoint);
    
    // إزالة نقاط البداية والنهاية بعد 3 ثوان
    setTimeout(() => {
      scene.remove(startPoint);
      scene.remove(endPoint);
    }, 3000);

    console.log('✅ تم إنشاء المسار');
    selectedPoints = [];
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

// ==================== Undo ====================
function undoLast() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    
    if (markers.length > 0) {
      const lastMarker = markers.pop();
      scene.remove(lastMarker);
    }
    
    drawPreview();
    console.log('⏪ تراجع');
  }
}

// ==================== Event Listeners ====================
window.addEventListener('keydown', e => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    finalizePipe();
  }
  if (e.key === '1') currentPipeType = 'EL';
  if (e.key === '2') currentPipeType = 'AC';
  if (e.key === '3') currentPipeType = 'WP';
  if (e.key === '4') currentPipeType = 'WA';
  if (e.key === '5') currentPipeType = 'GS';
  
  // تحديث العنوان
  document.title = `BIM - ${currentPipeType}`;
});

// ==================== UI ====================
document.getElementById('toggleRotate').onclick = () => {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
};

document.getElementById('toggleDraw').onclick = e => {
  drawMode = !drawMode;
  e.target.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  e.target.style.background = drawMode ? '#aa3333' : 'rgba(20, 30, 40, 0.8)';
};

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    // تدوير بطيء
    const time = Date.now() * 0.0003;
    camera.position.x = 0.1 * Math.sin(time);
    camera.position.z = 0.1 * Math.cos(time);
    camera.position.y = 0.05 * Math.sin(time * 0.5);
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==================== Resize ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== بدء التطبيق ====================
loadPanorama();
animate();

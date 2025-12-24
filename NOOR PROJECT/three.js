// ================= SETUP =================
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// ================= LIGHTS =================
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const pointLight = new THREE.PointLight(0xffffff, 1.5);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// ================= COLORS =================
const lightColors = ["#ffb6c1","#f8c1d4","#ffd700","#00ffff","#ff69b4"];
const darkColors = ["#4b0b3d","#8a2be2","#1e90ff","#ff4500","#ff1493"];
let colorEven = lightColors[0];
let colorOdd = darkColors[0];
let styleEvenOdd = true; // default pattern
let targetColors = [];

// ================= BRACELET =================
let bracelet = new THREE.Group();
scene.add(bracelet);
const beadCount = 28;
const radius = 1.3;

function createBracelet() {
    bracelet.clear();
    const spacing = 0.01;
    for (let i = 0; i < beadCount; i++) {
        const angle = (i / beadCount) * Math.PI * 2;
        const bead = new THREE.Mesh(
            new THREE.SphereGeometry(0.13,32,32),
            new THREE.MeshStandardMaterial({
                color: styleEvenOdd ? (i%2===0 ? colorEven:colorOdd) : (i%2===0?colorOdd:colorEven),
                metalness:0.9,
                roughness:0.25
            })
        );
        bead.position.set(Math.cos(angle)*(radius+spacing),0,Math.sin(angle)*(radius+spacing));
        bracelet.add(bead);
    }
    updateTargetColors();
}

function scaleBracelet() {
    const screenWidth = window.innerWidth;
    const scaleFactor = screenWidth * 0.7 / 800; // 70% width
    bracelet.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

createBracelet();
scaleBracelet();

// ================= SPARKLES =================
const sparkleGeometry = new THREE.BufferGeometry();
const sparkleCount = 400;
const positions = new Float32Array(sparkleCount*3);
for(let i=0;i<sparkleCount*3;i++) positions[i]=(Math.random()-0.5)*4;
sparkleGeometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
const sparkleMaterial = new THREE.PointsMaterial({color:0xffffff,size:0.03,transparent:true,opacity:0.6});
const sparkles = new THREE.Points(sparkleGeometry,sparkleMaterial);
scene.add(sparkles);

// ================= HEART BURST =================
let activeHearts = [];
function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#',''),16);
    return {r:(bigint>>16)&255,g:(bigint>>8)&255,b:bigint&255};
}

function triggerHeartBurst(colorHex) {
    const burstCount = 50;
    for(let i=0;i<burstCount;i++){
        const geometry = new THREE.SphereGeometry(0.1,8,8); // ~20px
        const material = new THREE.MeshStandardMaterial({color:colorHex,transparent:true,opacity:1});
        const heart = new THREE.Mesh(geometry,material);
        heart.position.set((Math.random()-0.5)*1.2,0,(Math.random()-0.5)*1.2);
        heart.userData.velocity = new THREE.Vector3((Math.random()-0.5)*0.2,0.05+Math.random()*0.05,(Math.random()-0.5)*0.2);
        heart.userData.life = 0;
        scene.add(heart);
        activeHearts.push(heart);
    }
}

function animateHearts(){
    for(let i=activeHearts.length-1;i>=0;i--){
        const heart = activeHearts[i];
        heart.position.add(heart.userData.velocity);
        heart.userData.life+=0.016;
        heart.material.opacity = 1 - heart.userData.life/2;
        if(heart.userData.life>2){
            scene.remove(heart);
            activeHearts.splice(i,1);
        }
    }
}

// ================= COLOR TRANSITION =================
function updateTargetColors(){
    targetColors = bracelet.children.map((bead,idx)=>{
        const targetHex = styleEvenOdd? (idx%2===0?colorEven:colorOdd):(idx%2===0?colorOdd:colorEven);
        return new THREE.Color(targetHex);
    });
}

// ================= BUTTONS =================
document.querySelectorAll("#even-colors .colors button").forEach((btn,idx)=>{
    btn.style.background = lightColors[idx%lightColors.length];
    btn.addEventListener("click",()=>{
        colorEven = lightColors[idx%lightColors.length];
        createBracelet();
        triggerHeartBurst(colorEven);
    });
});

document.querySelectorAll("#odd-colors .colors button").forEach((btn,idx)=>{
    btn.style.background = darkColors[idx%darkColors.length];
    btn.addEventListener("click",()=>{
        colorOdd = darkColors[idx%darkColors.length];
        createBracelet();
        triggerHeartBurst(colorOdd);
    });
});

document.getElementById("flip-style").addEventListener("click",()=>{
    styleEvenOdd = !styleEvenOdd;
    createBracelet();
});

// ================= ANIMATION LOOP =================
function animate(){
    requestAnimationFrame(animate);
    bracelet.rotation.y += 0.004;
    sparkles.rotation.y += 0.001;

    // smooth color transition
    bracelet.children.forEach((bead,idx)=>{
        if(targetColors[idx]) bead.material.color.lerp(targetColors[idx],0.05);
    });

    animateHearts();
    renderer.render(scene,camera);
}
animate();

// ================= DRAG =================
let isDragging = false;
let previousX = 0;
renderer.domElement.addEventListener("mousedown",e=>{isDragging=true;previousX=e.clientX;});
window.addEventListener("mouseup",()=>isDragging=false);
window.addEventListener("mousemove",e=>{
    if(!isDragging) return;
    const deltaX = e.clientX-previousX;
    bracelet.rotation.y+=deltaX*0.005;
    previousX=e.clientX;
});

// ================= TOUCH =================
renderer.domElement.addEventListener("touchstart",e=>{previousX=e.touches[0].clientX;});
renderer.domElement.addEventListener("touchmove",e=>{
    const deltaX=e.touches[0].clientX-previousX;
    bracelet.rotation.y+=deltaX*0.005;
    previousX=e.touches[0].clientX;
});

// ================= ZOOM =================
window.addEventListener("wheel",e=>{
    camera.position.z+=e.deltaY*0.002;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z,3,8);
});

// ================= SAVE DESIGN =================
function saveDesign(){
    renderer.render(scene,camera);
    const link = document.createElement("a");
    link.download="motidhaga-bracelet.png";
    link.href = renderer.domElement.toDataURL("image/png");
    link.click();
}
window.saveDesign = saveDesign;

// ================= RESIZE =================
window.addEventListener("resize",()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
    scaleBracelet();
});
const logo = document.querySelector('.logo-container');
//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
function handlePositioning() {
  if (window.matchMedia("(min-width: 768px)").matches) {
    // Desktop: Make it fixed
    logo.style.position = "fixed";
    logo.style.top = "20px";
    logo.style.left = "20px";
  } else {
    // Mobile: Make it normal/relative
    logo.style.position = "relative";
    logo.style.top = "0";
    logo.style.left = "0";
  }
}

// Run on page load
handlePositioning();

// Run whenever the screen is resized
window.addEventListener('resize', handlePositioning);
function resizeCanvas() {
  const canvas = document.getElementById('myCanvas');
  // Set the internal drawing resolution to match the display size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
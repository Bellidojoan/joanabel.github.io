// Importaciones de Three.js y componentes necesarios
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Audio, AudioListener, AudioLoader } from 'three';

// Configuración inicial de la escena, cámara y renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4.61, 2.74, 8);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

// Configuración del audio
const listener = new AudioListener();
camera.add(listener);
const audioLoader = new AudioLoader();

// Cargar y configurar el sonido de salto
const jumpSound = new Audio(listener);
audioLoader.load('../audios/jump.mp3', function(buffer) {
    jumpSound.setBuffer(buffer);
    jumpSound.setVolume(1.0); // Ajusta el volumen según necesites
});

// Carga y reproduce música de fondo
const backgroundMusic = new THREE.Audio(listener);
const musicLoader = new THREE.AudioLoader();
musicLoader.load('../audios/music.mp3', function(buffer) { // Asegúrate de tener la ruta correcta a tu archivo mp3
  backgroundMusic.setBuffer(buffer);
  backgroundMusic.setLoop(true);
  backgroundMusic.setVolume(0.3); // Establece el volumen a un nivel adecuado para música de fondo
  backgroundMusic.play();
});

// Definición de la clase Box
class Box extends THREE.Mesh {
    constructor({ width, height, depth, color = '#00ff00', velocity = { x: 0, y: 0, z: 0 }, position = { x: 0, y: 0, z: 0 }, zAcceleration = false }) {
        super(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color }));
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.position.set(position.x, position.y, position.z);
        this.velocity = velocity;
        this.gravity = -0.002;
        this.zAcceleration = zAcceleration;
        this.updateSides();
    }

    updateSides() {
        this.right = this.position.x + this.width / 2;
        this.left = this.position.x - this.width / 2;
        this.bottom = this.position.y - this.height / 2;
        this.top = this.position.y + this.height / 2;
        this.front = this.position.z + this.depth / 2;
        this.back = this.position.z - this.depth / 2;
    }

    update(ground) {
        this.updateSides();
        if (this.zAcceleration) this.velocity.z += 0.0003;
        this.position.x += this.velocity.x;
        this.position.z += this.velocity.z;
        this.applyGravity(ground);
    }

    applyGravity(ground) {
        this.velocity.y += this.gravity;
        if (boxCollision({ box1: this, box2: ground })) {
            const friction = 0.5;
            this.velocity.y *= -friction;
        } else {
            this.position.y += this.velocity.y;
        }
    }
}

// Extensión de la clase Box para crear BonusBox
class BonusBox extends Box {
    constructor(options) {
        super(options);
        this.isBonus = true; // Esta propiedad identifica el bloque como un bloque de bonificación
    }
}

// Función para detectar colisiones entre cajas
function boxCollision({ box1, box2 }) {
    const xCollision = box1.right >= box2.left && box1.left <= box2.right;
    const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
    const zCollision = box1.front >= box2.back && box1.back <= box2.front;
    return xCollision && yCollision && zCollision;
}

// Creación de objetos en la escena
const cube = new Box({ width: 1, height: 1, depth: 1, velocity: { x: 0, y: -0.01, z: 0 } });
cube.castShadow = true;
scene.add(cube);

const ground = new Box({ width: 10, height: 0.5, depth: 50, color: '#0369a1', position: { x: 0, y: -2, z: 0 } });
ground.receiveShadow = true;
scene.add(ground);

// Configuración de luces
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 3, 1);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Manejo de eventos de teclado y lógica de juego
const keys = { a: { pressed: false }, d: { pressed: false }, s: { pressed: false }, w: { pressed: false } };
window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.a.pressed = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.d.pressed = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.s.pressed = true;
            break;
        case 'KeyW':
        case 'ArrowUp':
            keys.w.pressed = true;
            break;
        case 'Space':
            cube.velocity.y = 0.08;
            if (!jumpSound.isPlaying) {
                jumpSound.play();
            }
            break;
    }
});
window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.a.pressed = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.d.pressed = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.s.pressed = false;
            break;
        case 'KeyW':
        case 'ArrowUp':
            keys.w.pressed = false;
            break;
    }
});

// Sistema de puntuación
let score = 0;
const scoreElement = document.createElement('div');
scoreElement.style.cssText = 'position: absolute; top: 10px; left: 10px; color: white; font-family: Arial; font-size: 30px; z-index: 100;';
document.body.appendChild(scoreElement);
function updateScore() {
    scoreElement.innerHTML = `Puntuación: ${score}`;
}
setInterval(() => {
    if (!isGameOver) {
        score++;
        updateScore();
    }
}, 1000);

// Bucle de animación y lógica para spawnear enemigos
let frames = 0;
let spawnRate = 200;
let isGameOver = false;
const enemies = [];
function animate() {
    const animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);

    cube.velocity.x = 0;
    cube.velocity.z = 0;
    if (keys.a.pressed) cube.velocity.x = -0.05;
    else if (keys.d.pressed) cube.velocity.x = 0.05;
    if (keys.s.pressed) cube.velocity.z = 0.05;
    else if (keys.w.pressed) cube.velocity.z = -0.05;
    cube.update(ground);

    enemies.forEach((enemy, index) => {
        enemy.update(ground);
        if (boxCollision({ box1: cube, box2: enemy })) {
            if (enemy.isBonus) {
                score += 100; // Aumenta más puntos si es un BonusBox
                updateScore();
                scene.remove(enemy); // Elimina el BonusBox de la escena
                enemies.splice(index, 1); // Elimina el BonusBox del array de enemigos
            } else {
                cancelAnimationFrame(animationId);
                isGameOver = true;
            }
        }
    });

    if (frames % spawnRate === 0) {
        if (spawnRate > 20) spawnRate -= 20;
        let box;
        if (Math.random() < 0.1) { // Probabilidad de generar un BonusBox
            box = new BonusBox({
                width: 1,
                height: 1,
                depth: 1,
                position: { x: (Math.random() - 0.5) * 10, y: 0, z: -20 },
                velocity: { x: 0, y: 0, z: 0.005 },
                color: 'green', // Color distintivo para el BonusBox
                zAcceleration: true
            });
        } else {
            box = new Box({
                width: 1,
                height: 1,
                depth: 1,
                position: { x: (Math.random() - 0.5) * 10, y: 0, z: -20 },
                velocity: { x: 0, y: 0, z: 0.005 },
                color: 'red',
                zAcceleration: true
            });
        }
        box.castShadow = true;
        scene.add(box);
        enemies.push(box);
    }

    frames++;
}
animate();
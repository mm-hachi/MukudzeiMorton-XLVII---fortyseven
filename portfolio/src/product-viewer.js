import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const color = (value, fallback) => new THREE.Color(value || fallback);

export function mountViewer(canvas, initial) {
  if (!canvas) throw new Error('The 3D viewer canvas is missing.');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0xf0efea, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0efea);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(1.7, 1.35, 2.45);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.42, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.4;
  controls.maxDistance = 4;
  controls.maxPolarAngle = Math.PI * 0.48;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x777268, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe6c4, 1.4);
  rim.position.set(-3, 3, -4);
  scene.add(rim);

  const model = new THREE.Group();
  scene.add(model);
  const cabinetMaterial = new THREE.MeshStandardMaterial({ color: color(initial.cabinet, '#e9e5dd'), roughness: 0.7 });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: color(initial.timber, '#caa878'), roughness: 0.62 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: color(initial.handle, '#b29a6d'), metalness: 0.72, roughness: 0.34 });
  const box = (geometry, material, position) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    return mesh;
  };
  box(new THREE.BoxGeometry(0.48, 0.54, 0.32), cabinetMaterial, [0, 0.39, 0]);
  box(new THREE.BoxGeometry(0.54, 0.045, 0.38), timberMaterial, [0, 0.69, 0]);
  for (const x of [-0.19, 0.19]) {
    for (const z of [-0.115, 0.115]) box(new THREE.BoxGeometry(0.035, 0.24, 0.035), timberMaterial, [x, 0.12, z]);
  }
  box(new THREE.BoxGeometry(0.13, 0.012, 0.018), handleMaterial, [0, 0.49, 0.167]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 48), new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  let disposed = false;
  const resize = () => {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const animate = () => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  return {
    update(options) {
      cabinetMaterial.color.set(options.cabinet);
      timberMaterial.color.set(options.timber);
      handleMaterial.color.set(options.handle);
    },
    exportGLB() {
      return new GLTFExporter().parseAsync(model, { binary: true }).then((data) =>
        new Blob([data], { type: 'model/gltf-binary' })
      );
    },
    destroy() {
      disposed = true;
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object.isMesh) object.geometry.dispose();
      });
      cabinetMaterial.dispose();
      timberMaterial.dispose();
      handleMaterial.dispose();
      renderer.dispose();
    }
  };
}

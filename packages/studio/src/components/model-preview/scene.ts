import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface SceneRuntimeCallbacks {
  onLoaded: () => void;
  onError: (message: string) => void;
}

export function createModelPreviewRuntime(
  mount: HTMLDivElement,
  modelUrl: string,
  callbacks: SceneRuntimeCallbacks,
): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#09111a');
  scene.fog = new THREE.Fog('#09111a', 5, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  mount.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.35, 4.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 2.2;
  controls.maxDistance = 7.5;
  controls.target.set(0, 0.35, 0);

  scene.add(new THREE.HemisphereLight('#f8f5ef', '#102030', 1.3));

  const keyLight = new THREE.DirectionalLight('#fff2d4', 1.8);
  keyLight.position.set(2.8, 3.2, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#8bc6ff', 1.1);
  rimLight.position.set(-3, 1.6, -2.6);
  scene.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 48),
    new THREE.MeshBasicMaterial({ color: '#0f2230', transparent: true, opacity: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.18;
  scene.add(floor);

  const loader = new GLTFLoader();
  let disposed = false;
  let frame = 0;
  let root: THREE.Object3D | null = null;
  const layerBases = new Map<string, { y: number; z: number }>();

  const resize = () => {
    const width = mount.clientWidth || 640;
    const height = Math.max(320, Math.round(width * 0.62));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const hydrateRoot = (gltf: GLTF) => {
    root = gltf.scene;
    root.scale.setScalar(1.18);
    root.position.y = 0.12;
    scene.add(root);

    root.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => (item.transparent = true));
        else if (material) material.transparent = true;
      }

      if (typeof object.userData?.ellipseLayer === 'string') {
        layerBases.set(object.uuid, {
          y: object.position.y,
          z: object.position.z,
        });
      }
    });

    callbacks.onLoaded();
  };

  const animateRoot = (elapsed: number) => {
    if (!root) return;

    root.rotation.y = elapsed * 0.6;
    root.position.y = 0.12 + Math.sin(elapsed * 1.4) * 0.05;

    root.traverse((object: THREE.Object3D) => {
      const layer = object.userData?.ellipseLayer as string | undefined;
      if (!layer) return;
      const base = layerBases.get(object.uuid);
      if (!base) return;
      const bobStrength = Number(object.userData?.bobStrength ?? 0.02);
      const phase = Number(object.userData?.phase ?? 0);
      object.position.y = base.y + Math.sin(elapsed * 2.3 + phase) * bobStrength;
      object.position.z = base.z + Math.cos(elapsed * 1.35 + phase) * bobStrength * 0.2;

      if (layer === 'head') object.rotation.z = Math.sin(elapsed * 2 + phase) * 0.08;
      else if (layer === 'accent') object.rotation.z = Math.sin(elapsed * 3 + phase) * 0.12;
      else object.rotation.z = Math.sin(elapsed * 1.6 + phase) * 0.025;
    });
  };

  const disposeScene = () => {
    controls.dispose();
    renderer.dispose();
    scene.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
  };

  resize();
  window.addEventListener('resize', resize);

  loader.load(
    modelUrl,
    (gltf: GLTF) => {
      if (disposed) return;
      hydrateRoot(gltf);
    },
    undefined,
    () => {
      if (disposed) return;
      callbacks.onError('Chargement du modele impossible');
    },
  );

  const clock = new THREE.Clock();
  const animate = () => {
    frame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    controls.update();
    animateRoot(elapsed);
    renderer.render(scene, camera);
  };

  animate();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    disposeScene();
  };
}

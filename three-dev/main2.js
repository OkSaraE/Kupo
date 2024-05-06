import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import Stats from "three/addons/libs/stats.module.js";
import { degrees } from "three/examples/jsm/nodes/Nodes.js";

//For Vite build
let basePath;

if (import.meta.env.MODE === "production") {
  basePath = "/~saraok/kupoli/";
} else {
  basePath = "/";
}

let container, camera, scene, renderer, controls, textureLoader, stats;

//physics variables
const gravityConstant = -6.2;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let softBodySolver;
let physicsWorld;
const rigidBodies = [];
const margin = 0.05;
let transformAux1;

let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster;
let clock, mixer, mixer2;

let marker, baseReferenceSpace;
let INTERSECTION;

const intersected = [];
const tempMatrix = new THREE.Matrix4();
//list of movable objects
const modelarray = ["Bnyu", "Henry", "Korosensei", "TeddyBlock", "Urf"];

let laatikko;

let listener, sound, audioLoader;
let listener2, sound2, audioLoader2;

//Groups
let teleportgroup = new THREE.Group();
teleportgroup.name = "Teleport-Group";
let movegroup = new THREE.Group();
movegroup.name = "Interaction-Group";

Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;

  const startButton = document.getElementById("startButton");
  startButton.addEventListener("click", init);
});

function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });

  renderer.setAnimationLoop(function () {
    cleanIntersected();

    moveMarker();
    intersectObjects(controller1);
    intersectObjects(controller2);
    renderer.render(scene, camera);

    renderer.setAnimationLoop(render);

    const delta = clock.getDelta();
    console.log("yoyooyo");

    if (mixer !== undefined) {
      mixer.update(delta);
    }
  });

  scene.add(teleportgroup);
  scene.add(movegroup);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.outputEncoding = THREE.sRGBEncoding;

  initVR();
  initPhysics();
  createObjects();
  loadmodels();
  document.body.appendChild(renderer.domElement);

  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x808080 })
  );
  scene.add(marker);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(directionalLight);

  directionalLight.position.x = 30;
  directionalLight.position.y = 30;
  directionalLight.position.z = 30;
  directionalLight.castShadow = true; // default false

  //Set up shadow properties for the light
  directionalLight.shadow.mapSize.width = 512; // default
  directionalLight.shadow.mapSize.height = 512; // default
  directionalLight.shadow.camera.near = 0.5; // default
  directionalLight.shadow.camera.far = 300; // default

  directionalLight.shadow.camera.top = 40;
  directionalLight.shadow.camera.bottom = -40;
  directionalLight.shadow.camera.left = -40;
  directionalLight.shadow.camera.right = 40;

  //Create a helper for the shadow camera
  // const shadowhelper = new THREE.CameraHelper(directionalLight.shadow.camera);
  // scene.add(shadowhelper);

  // const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  // scene.add(helper);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  const color = 0xffffff;
  const intensity = 5;
  const light = new THREE.AmbientLight(color, intensity);
  scene.add(light);

  // camera
  camera.position.set = 10;
  camera.position.y = 5;
  camera.position.x = 5;
  camera.lookAt(axesHelper.position);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  //Radio
  listener = new THREE.AudioListener();
  camera.add(listener);
  sound = new THREE.PositionalAudio(listener);

  audioLoader = new THREE.AudioLoader();
  audioLoader.load("sounds/Space.mp3", function (buffer) {
    sound.setBuffer(buffer);
    sound.setVolume(0.5);
    sound.setRefDistance(7);
    sound.play();
  });

  listener2 = new THREE.AudioListener();
  camera.add(listener2);
  sound2 = new THREE.PositionalAudio(listener);

  audioLoader2 = new THREE.AudioLoader();
  audioLoader2.load("sounds/Beach.mp3", function (buffer) {
    sound2.setBuffer(buffer);
    sound2.setVolume(1.2);
    sound2.setRefDistance(5);
    sound2.play();
  });

  updateLight();
}

function updateLight() {
  const color1 = 0xff3090;
  const color2 = 0x60ffff;
  const intensity = 3550;
  const lightBlocks = new THREE.SpotLight(color1, intensity);
  scene.add(lightBlocks);
  scene.add(lightBlocks.target);
  lightBlocks.position.set(-19, 20, -9);
  lightBlocks.target.position.set(-60, 0, -10);

  /*  
const helper1 = new THREE.SpotLightHelper(lightBlocks);
scene.add(helper1);
helper1.update(); */

  const lightChess = new THREE.SpotLight(color2, intensity);
  scene.add(lightChess);
  scene.add(lightChess.target);
  lightChess.position.set(10, 20, 20);
  lightChess.target.position.set(10, 0, 50);

  /* 
 
const helper2 = new THREE.SpotLightHelper(lightChess);
scene.add(helper2);
helper2.update(); */

  const color3 = 0x6060ff;
  const intensity2 = 5550;
  const lightBeach = new THREE.SpotLight(color3, intensity2);
  scene.add(lightBeach);
  scene.add(lightBeach.target);
  lightBeach.position.set(20, 20, -20);
  lightBeach.target.position.set(30, 0, -30);

  /* 
const helper3 = new THREE.SpotLightHelper(lightBeach);
scene.add(helper3);
helper3.update(); */
}

function initVR() {
  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.enabled = true;

  renderer.xr.addEventListener(
    "sessionstart",
    () => (baseReferenceSpace = renderer.xr.getReferenceSpace())
  );
  textureLoader = new THREE.TextureLoader();

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.domElement);

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("squeezestart", onSqueezeStart);
  controller1.addEventListener("squeezeend", onSqueezeEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("squeezestart", onSqueezeStart);
  controller2.addEventListener("squeezeend", onSqueezeEnd);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  /* controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  ); */
  scene.add(controllerGrip2);

  const loader = new GLTFLoader().setPath(basePath);
  loader.load("testWorld/scene.gltf", async function (gltf) {
    gltf.scene.scale.set(0.0003, 0.0003, 0.0003);
    let mymodel = gltf.scene;
    mymodel.rotation.y = THREE.MathUtils.degToRad(180);
    mymodel.rotation.x = THREE.MathUtils.degToRad(-36.5);
    mymodel.position.set(0, 0.01, 0);
    controllerGrip2.add(mymodel);
  });

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  /* console.log(scene); */
  const line = new THREE.Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  raycaster = new THREE.Raycaster();
}
function initPhysics() {
  // Physics configuration

  collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  softBodySolver = new Ammo.btDefaultSoftBodySolver();
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
    softBodySolver
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  physicsWorld
    .getWorldInfo()
    .set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

  transformAux1 = new Ammo.btTransform();
}
function createObjects() {
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  // Ground
  pos.set(0, -0.5, 0);
  quat.set(0, 0, 0, 1);
  const ground = createGround(
    300,
    1,
    300,
    0,
    pos,
    quat,
    new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
    })
  );
  ground.castShadow = true;
  ground.receiveShadow = true;

  const buildCube = new GLTFLoader().setPath(basePath);
  buildCube.load("Ready/BuildCube.gltf", async function (gltf) {
    const buildCubeModel = gltf.scene;
    await renderer.compileAsync(buildCubeModel, camera, scene);

    for (let i = 0; i < 3; i++) {
      const brickMass = 0.2;
      const brickLength = 2.01;
      const brickDepth = 2.01;
      const brickHeight = 2.01;

      // Calculate position for each brick
      const x = -10 + i;
      pos.set(x * 3, 5, -20);
      quat.set(0, 0, 0, 1);

      const brick = createParalellepiped(
        brickDepth,
        brickHeight,
        brickLength,
        brickMass,
        pos,
        quat,
        createMaterial()
      );
      brick.castShadow = false;
      brick.receiveShadow = false;
      brick.material.transparent = true;
      brick.material.opacity = 0;

      // Clone the pawnblack model and add it to the brick
      const buildCubeClone = buildCubeModel.clone();
      buildCubeClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = 0;
        }
      });
      brick.add(buildCubeClone);
    }
  });

  /* const buildArc = new GLTFLoader().setPath(basePath);
  buildArc.load("Ready/BuildArc.glb", async function (gltf) {
    const buildArcModel = gltf.scene;
    await renderer.compileAsync(buildArcModel, camera, scene);
  
    
    for (let i = 0; i < 3; i++) {
      const brickMass = 0.2;
      const brickLength = 2.01;
      const brickDepth = 2.01;
      const brickHeight = 2.01;
  
      // Calculate position for each brick
      const x = -1 + i; 
      pos.set(x*3, 5, 10);
      quat.set(0, 0, 0, 1);
  
      const brick = createParalellepiped(
        brickDepth,
        brickHeight,
        brickLength,
        brickMass,
        pos,
        quat,
        createMaterial()
      );
      brick.castShadow = false;
      brick.receiveShadow = false;
      brick.material.transparent = true;
      brick.material.opacity = 0;
  
      // Clone the pawnblack model and add it to the brick
      const buildArcClone = buildArcModel.clone();
      buildArcClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = 1
          ;
          
        }
      });
      brick.add(buildArcClone);
    }
  }); */

  const buildPlatform = new GLTFLoader().setPath(basePath);
  buildPlatform.load("Ready/BuildPlatform.gltf", async function (gltf) {
    const buildPlatformModel = gltf.scene;
    await renderer.compileAsync(buildPlatformModel, camera, scene);

    for (let i = 0; i < 3; i++) {
      const brickMass = 0.2;
      const brickLength = 2.01;
      const brickDepth = 4.01;
      const brickHeight = 1.01;

      // Calculate position for each brick
      const x = -10 + i;
      pos.set(x * 4, 8, -20);
      quat.set(0, 0, 0, 1);

      const brick = createParalellepiped(
        brickDepth,
        brickHeight,
        brickLength,
        brickMass,
        pos,
        quat,
        createMaterial()
      );
      brick.castShadow = false;
      brick.receiveShadow = false;
      brick.material.transparent = true;
      brick.material.opacity = 0;

      // Clone the pawnblack model and add it to the brick
      const buildPlatformClone = buildPlatformModel.clone();
      buildPlatformClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = 0;
        }
      });
      brick.add(buildPlatformClone);
    }
  });
  const buildCylinder = new GLTFLoader().setPath(basePath);
  buildCylinder.load("Ready/BuildCylinder.gltf", async function (gltf) {
    const buildCylinderModel = gltf.scene;
    await renderer.compileAsync(buildCylinderModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = -40 + i * 3;
      const z = -10 + i * 2;
      pos.set(x, 1, z);
      quat.set(0, 0, 0, 1);

      const object = createCylinderBlock(
        1.02,
        1.02,

        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const buildCylinderClone = buildCylinderModel.clone();
      buildCylinderClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = 0;
        }
      });
      object.add(buildCylinderClone);
    }
  });

  // Load the pawnwhite model
  const pawnblack = new GLTFLoader().setPath(basePath);
  pawnblack.load("chess/pawnblack.gltf", async function (gltf) {
    const pawnblackModel = gltf.scene;
    await renderer.compileAsync(pawnblackModel, camera, scene);

    // Create pawns
    for (let i = 0; i < 8; i++) {
      const brickMass = 0.2;
      const brickLength = 0.7;
      const brickDepth = 0.7;
      const brickHeight = 1.2;

      // Calculate position for each brick
      const x = -1 + i;
      pos.set(x * 2, 5, 37);
      quat.set(0, 0, 0, 1);

      const brick = createParalellepiped(
        brickDepth,
        brickHeight,
        brickLength,
        brickMass,
        pos,
        quat,
        createMaterial()
      );
      brick.castShadow = false;
      brick.receiveShadow = false;
      brick.material.transparent = true;
      brick.material.opacity = 0;

      // Clone the pawnblack model and add it to the brick
      const pawnblackClone = pawnblackModel.clone();
      pawnblackClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.5;
        }
      });
      brick.add(pawnblackClone);
    }
  });
  const rookblack = new GLTFLoader().setPath(basePath);
  rookblack.load("chess/rookblack.gltf", async function (gltf) {
    const rookblackModel = gltf.scene;
    await renderer.compileAsync(rookblackModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = -2 + i * 14;
      pos.set(x, 1, 35);
      quat.set(0, 0, 0, 1);

      const object = createCylinder(
        0.6,
        0.6,

        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const rookblackClone = rookblackModel.clone();
      rookblackClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.5;
        }
      });
      object.add(rookblackClone);
    }
  });

  const knightblack = new GLTFLoader().setPath(basePath);
  knightblack.load("chess/knightblack.gltf", async function (gltf) {
    const knightblackModel = gltf.scene;
    await renderer.compileAsync(knightblackModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = i * 10;
      pos.set(x, 1, 35);
      quat.set(0, 0, 0, 1);

      const object = createParalellepiped(
        0.7,
        1.55,
        0.75,
        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const knightblackClone = knightblackModel.clone();
      knightblackClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.65;
        }
      });
      object.add(knightblackClone);
    }
  });

  const bishopblack = new GLTFLoader().setPath(basePath);
  bishopblack.load("chess/bishopblack.gltf", async function (gltf) {
    const bishopblackModel = gltf.scene;
    await renderer.compileAsync(bishopblackModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = 2 + i * 6;
      pos.set(x, 1, 35);
      quat.set(0, 0, 0, 1);

      const object = createCylinder(
        0.6,
        1,
        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const bishopblackClone = bishopblackModel.clone();
      bishopblackClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.9;
        }
      });
      object.add(bishopblackClone);
    }
  });
  const queenblack = new GLTFLoader().setPath(basePath);
  queenblack.load("chess/queenblack.gltf", async function (gltf) {
    const queenblackModel = gltf.scene;
    await renderer.compileAsync(queenblackModel, camera, scene);

    const objectMass = 0.5;

    pos.set(4, 1, 35);
    quat.set(0, 0, 0, 1);

    const object = createParalellepiped(
      0.75,
      2,
      0.75,
      objectMass,
      pos,
      quat,
      createMaterial()
    );
    object.castShadow = false;
    object.receiveShadow = false;
    object.material.transparent = true;
    object.material.opacity = 0;

    queenblackModel.traverse(function (node) {
      if (node.material) {
        node.material.side = THREE.DoubleSide;
        node.castShadow = true;
        node.receiveShadow = true;
        node.position.y = -0.9;
      }
    });

    object.add(queenblackModel);
  });

  const kingblack = new GLTFLoader().setPath(basePath);
  kingblack.load("chess/kingblack.gltf", async function (gltf) {
    const kingblackModel = gltf.scene;
    await renderer.compileAsync(kingblackModel, camera, scene);

    const objectMass = 0.5;

    pos.set(6, 1, 35);
    quat.set(0, 0, 0, 1);

    const object1 = createCylinder(
      0.6,
      1.1,
      objectMass,
      pos,
      quat,
      createMaterial()
    );
    object1.castShadow = false;
    object1.receiveShadow = false;
    object1.material.transparent = true;
    object1.material.opacity = 0;

    kingblackModel.traverse(function (node) {
      if (node.material) {
        node.material.side = THREE.DoubleSide;
        node.castShadow = true;
        node.receiveShadow = true;
        node.position.y = -0.92;
      }
    });

    object1.add(kingblackModel);
  });

  const pawnwhite = new GLTFLoader().setPath(basePath);
  pawnwhite.load("chess/pawnwhite.gltf", async function (gltf) {
    const pawnwhiteModel = gltf.scene;
    await renderer.compileAsync(pawnwhiteModel, camera, scene);

    // Create pawns
    for (let i = 0; i < 8; i++) {
      const brickMass = 0.2;
      const brickLength = 0.7;
      const brickDepth = 0.7;
      const brickHeight = 1.2;

      // Calculate position for each brick
      const x = -2 + i * 2;
      pos.set(x, 1, 49);
      quat.set(0, 0, 0, 1);

      const brick = createParalellepiped(
        brickDepth,
        brickHeight,
        brickLength,
        brickMass,
        pos,
        quat,
        createMaterial()
      );
      brick.castShadow = false;
      brick.receiveShadow = false;
      brick.material.transparent = true;
      brick.material.opacity = 0;

      // Clone the pawnwhite model and add it to the brick
      const pawnwhiteClone = pawnwhiteModel.clone();
      pawnwhiteClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.5;
        }
      });
      brick.add(pawnwhiteClone);
    }
  });
  const rookwhite = new GLTFLoader().setPath(basePath);
  rookwhite.load("chess/rookwhite.gltf", async function (gltf) {
    const rookwhiteModel = gltf.scene;
    await renderer.compileAsync(rookwhiteModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = -2 + i * 14;
      pos.set(x, 1, 51);
      quat.set(0, 0, 0, 1);

      const object = createCylinder(
        0.6,
        0.6,

        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const rookwhiteClone = rookwhiteModel.clone();
      rookwhiteClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.5;
        }
      });
      object.add(rookwhiteClone);
    }
  });

  const knightwhite = new GLTFLoader().setPath(basePath);
  knightwhite.load("chess/knightwhite.gltf", async function (gltf) {
    const knightwhiteModel = gltf.scene;
    await renderer.compileAsync(knightwhiteModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = i * 10;
      pos.set(x, 1, 51);
      quat.set(0, 0, 0, 1);

      const object = createParalellepiped(
        0.7,
        1.55,
        0.75,
        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const knightwhiteClone = knightwhiteModel.clone();
      knightwhiteClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.65;
        }
      });
      object.add(knightwhiteClone);
    }
  });

  const bishopwhite = new GLTFLoader().setPath(basePath);
  bishopwhite.load("chess/bishopwhite.gltf", async function (gltf) {
    const bishopwhiteModel = gltf.scene;
    await renderer.compileAsync(bishopwhiteModel, camera, scene);

    for (let i = 0; i < 2; i++) {
      const objectMass = 0.5;

      const x = 2 + i * 6;
      pos.set(x, 1, 51);
      quat.set(0, 0, 0, 1);

      const object = createCylinder(
        0.6,
        1,
        objectMass,
        pos,
        quat,
        createMaterial()
      );
      object.castShadow = false;
      object.receiveShadow = false;
      object.material.transparent = true;
      object.material.opacity = 0;

      const bishopwhiteClone = bishopwhiteModel.clone();
      bishopwhiteClone.traverse(function (node) {
        if (node.material) {
          node.material.side = THREE.DoubleSide;
          node.castShadow = true;
          node.receiveShadow = true;
          node.position.y = -0.9;
        }
      });
      object.add(bishopwhiteClone);
    }
  });

  const queenwhite = new GLTFLoader().setPath(basePath);
  queenwhite.load("chess/queenwhite.gltf", async function (gltf) {
    const queenwhiteModel = gltf.scene;
    await renderer.compileAsync(queenwhiteModel, camera, scene);

    const objectMass = 0.5;

    pos.set(4, 1, 51);
    quat.set(0, 0, 0, 1);

    const object = createParalellepiped(
      0.75,
      2,
      0.75,
      objectMass,
      pos,
      quat,
      createMaterial()
    );
    object.castShadow = false;
    object.receiveShadow = false;
    object.material.transparent = true;
    object.material.opacity = 0;

    queenwhiteModel.traverse(function (node) {
      if (node.material) {
        node.material.side = THREE.DoubleSide;
        node.castShadow = true;
        node.receiveShadow = true;
        node.position.y = -0.9;
      }
    });

    object.add(queenwhiteModel);
  });

  const kingwhite = new GLTFLoader().setPath(basePath);
  kingwhite.load("chess/kingwhite.gltf", async function (gltf) {
    const kingwhiteModel = gltf.scene;
    await renderer.compileAsync(kingwhiteModel, camera, scene);

    const objectMass = 0.5;

    pos.set(6, 1, 51);
    quat.set(0, 0, 0, 1);

    const object1 = createCylinder(
      0.6,
      1.1,
      objectMass,
      pos,
      quat,
      createMaterial()
    );
    object1.castShadow = false;
    object1.receiveShadow = false;
    object1.material.transparent = true;
    object1.material.opacity = 0;

    kingwhiteModel.traverse(function (node) {
      if (node.material) {
        node.material.side = THREE.DoubleSide;
        node.castShadow = true;
        node.receiveShadow = true;
        node.position.y = -0.92;
      }
    });

    object1.add(kingwhiteModel);
  });
}

function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
  const threeObject = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
    material
  );

  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, mass, pos, quat);
  threeObject.name = "ex2";
  laatikko = threeObject;
  movegroup.add(threeObject);
  return threeObject;
}

function createGround(sx, sy, sz, mass, pos, quat, material) {
  const threeObject = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
    material
  );

  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);

  createRigidBody(threeObject, shape, mass, pos, quat);
  threeObject.name = "ground";
  laatikko = threeObject;
  teleportgroup.add(threeObject);
  return threeObject;
}

function createCylinder(radius, height, mass, pos, quat, material) {
  const threeObject = new THREE.Mesh(
    new THREE.CylinderGeometry(radius / 2, radius, 2.3, 16, 1),
    material
  );

  const shape = new Ammo.btCylinderShape(
    new Ammo.btVector3(radius, height, radius / 1.5)
  );
  shape.setMargin(margin);
  shape.scale;

  createRigidBody(threeObject, shape, mass, pos, quat);
  threeObject.name = "ex2";
  laatikko = threeObject;
  movegroup.add(threeObject);
  return threeObject;
}
function createCylinderBlock(radius, height, mass, pos, quat, material) {
  const threeObject = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 2.01, 16, 1),
    material
  );

  const shape = new Ammo.btCylinderShape(
    new Ammo.btVector3(radius, height, radius)
  );
  shape.setMargin(margin);
  shape.scale;

  createRigidBody(threeObject, shape, mass, pos, quat);
  threeObject.name = "ex2";
  laatikko = threeObject;
  movegroup.add(threeObject);
  return threeObject;
}

function createRigidBody(threeObject, physicsShape, mass, pos, quat) {
  threeObject.position.copy(pos);
  threeObject.quaternion.copy(quat);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);

  threeObject.userData.physicsBody = body;

  scene.add(threeObject);

  if (mass > 0) {
    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);
}

function createRandomColor() {
  return Math.floor(Math.random() * (1 << 24));
}

function createMaterial() {
  return new THREE.MeshPhongMaterial({ color: createRandomColor() });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//Loading models to the world
function loadmodels() {
  new RGBELoader()
    .setPath(basePath)
    .load("hdr/starsky.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;

      //Example code to add new models
      //   const loader = new GLTFLoader().setPath(basePath);
      // loader.load("EXAMPLE/EXAMPLE.GTLF", async function (gltf) {
      //   const model = gltf.scene;
      //   model.name = "EXAMPLE";
      //   await renderer.compileAsync(model, camera, scene);
      //   //Adds shadows to the model
      //   model.traverse(function (node) {
      //     if (node.material) {
      //       node.material.side = THREE.FrontSide;
      //       node.castShadow = true;
      //       node.receiveShadow = true;
      //     }
      //   });
      //   Example.add(model);
      // });

      const loaderGround = new GLTFLoader().setPath(basePath);
      loaderGround.load("kupoli/ground.gltf", async function (gltf) {
        const ground = gltf.scene;
        await renderer.compileAsync(ground, camera, scene);
        ground.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.DoubleSide;
            node.castShadow = true;
            node.receiveShadow = true;
            node.material.scale = 0.5;
          }
        });
        teleportgroup.add(ground);
      });

      const loaderBase = new GLTFLoader().setPath(basePath);
      loaderBase.load("kupoli/kupoli.gltf", async function (gltf) {
        const base = gltf.scene;
        await renderer.compileAsync(base, camera, scene);
        base.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.DoubleSide;
            node.castShadow = true;
            node.receiveShadow = true;
            node.material.scale = 0.5;
          }
        });
        scene.add(base);
      });

      const loaderObjects = new GLTFLoader().setPath(basePath);
      loaderObjects.load("objects/objects.gltf", async function (gltf) {
        const objects = gltf.scene;
        await renderer.compileAsync(objects, camera, scene);
        //Adds shadows to the model
        objects.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        movegroup.add(objects);
      });

      const loaderStatic = new GLTFLoader().setPath(basePath);
      loaderStatic.load("static/static.gltf", async function (gltf) {
        const staticModel = gltf.scene;
        await renderer.compileAsync(staticModel, camera, scene);
        //Adds shadows to the model
        staticModel.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        scene.add(staticModel);
      });

      const loaderRadio = new GLTFLoader().setPath(basePath);
      loaderRadio.load("radio/Radio.glb", async function (gltf) {
        const radio1 = gltf.scene;
        await renderer.compileAsync(radio1, camera, scene);
        radio1.scale.set(3, 3, 3);
        radio1.position.set(-35, 1, 35);
        radio1.rotation.set(0, 180, 0);

        mixer2 = new THREE.AnimationMixer(gltf.scene);
        const clips = gltf.animations;
        mixer2.clipAction(clips[0]).play();
        radio1.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        scene.add(radio1);
        radio1.add(sound);
      });

      const loaderRadio2 = new GLTFLoader().setPath(basePath);
      loaderRadio2.load("radio/radio2.gltf", async function (gltf) {
        const radio2 = gltf.scene;
        await renderer.compileAsync(radio2, camera, scene);
        radio2.position.set(40, -2, -40);
        radio2.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        scene.add(radio2);
        radio2.add(sound2);
      });

      const loader6 = new GLTFLoader().setPath(basePath);
      loader6.load("book/book.glb", async function (gltf) {
        const model6 = gltf.scene;

        // wait until the model can be added to the scene without blocking due to shader compilation

        await renderer.compileAsync(model6, camera, scene);

        console.log("model6", gltf);
        /* group.add(model); */
        scene.add(model6);

        mixer = new THREE.AnimationMixer(gltf.scene);
        const clips = gltf.animations;
        mixer.clipAction(clips[0]).play();
        model6.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
      });
    });
}

//Controller functions
function onSelectStart(event) {
  const controller = event.target;

  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    let object = intersection.object;

    console.log(object.userData.physicsBody);
    console.log(object);
    controller.attach(object);

    controller.userData.selected = object;

    object.userData.initialPosition = object.position.clone();
  }

  controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    let object = controller.userData.selected;

    // Get the position of the controller
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);

    object.position.copy(controllerPos);

    movegroup.attach(object);

    delete object.userData.initialPosition;

    controller.userData.selected = undefined;

    // Allow the object to be affected by physics again
    if (object.userData.physicsBody) {
      const physicsBody = object.userData.physicsBody;

      physicsBody.setActivationState(1);

      // Reset the linear and angular velocities
      physicsBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
      physicsBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));

      // Update the position of the physics body
      const pos = new Ammo.btVector3(
        controllerPos.x,
        controllerPos.y,
        controllerPos.z
      );
      const quat = new Ammo.btQuaternion(
        object.quaternion.x,
        object.quaternion.y,
        object.quaternion.z,
        object.quaternion.w
      );
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(pos);
      transform.setRotation(quat);
      physicsBody.setWorldTransform(transform);
    }
  }
}

function getIntersections(controller) {
  controller.updateMatrixWorld();

  raycaster.setFromXRController(controller);

  return raycaster.intersectObjects(movegroup.children, true);
}

function intersectObjects(controller) {
  // Do not highlight in mobile-ar

  if (controller.userData.targetRayMode === "screen") return;

  // Do not highlight when already selected

  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName("line");
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    let object = intersection.object;
    // 1. let us study the intersected object, now not a group
    /*  console.log("Child:", object); */

    // if object hit is NOT included in the model name array
    // Search for the parent group next to find a match until found
    while (!modelarray.includes(object.name)) {
      object = object.parent;
      if (modelarray.includes(object.name)) {
        break;
      }
    }

    object.traverse(function (node) {
      if (node.material) {
        node.material.emissive.r = 0.3;
        node.material.transparent = true;
        node.material.opacity = 0.5;
      }
    });
    /* object.material.emissive.r = 1; */
    intersected.push(object);

    line.scale.z = intersection.distance;
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();

    object.traverse(function (node) {
      if (node.material) {
        node.material.emissive.r = 0;
        node.material.transparent = false;
        node.material.opacity = 1;
      }
    });
    /* object.material.emissive.r = 0; */
  }
}

function onSqueezeStart() {
  this.userData.isSqueezing = true;
  console.log("Controller squeeze started");
}

function onSqueezeEnd() {
  this.userData.isSqueezing = false;
  console.log("squeezeend");
  if (INTERSECTION) {
    const offsetPosition = {
      x: -INTERSECTION.x,
      y: -INTERSECTION.y,
      z: -INTERSECTION.z,
      w: 1,
    };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const teleportSpaceOffset =
      baseReferenceSpace.getOffsetReferenceSpace(transform);
    renderer.xr.setReferenceSpace(teleportSpaceOffset);
  }
}

function moveMarker() {
  INTERSECTION = undefined;
  if (controller1.userData.isSqueezing === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    //const intersects = raycaster.intersectObjects([floor]);
    const intersects = raycaster.intersectObjects(teleportgroup.children, true);
    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
      console.log(intersects[0]);
      console.log(INTERSECTION);
    }
  } else if (controller2.userData.isSqueezing === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    // const intersects = raycaster.intersectObjects([floor]);
    const intersects = raycaster.intersectObjects(teleportgroup.children, true);
    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }
  if (INTERSECTION) marker.position.copy(INTERSECTION);
  marker.visible = INTERSECTION !== undefined;
}

//Window auto resize
window.addEventListener("resize", resize, false);
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateObjectPosition(controller, object) {
  const controllerPos = new THREE.Vector3();
  controller.getWorldPosition(controllerPos);

  // Apply the offset to match the initial position relative to the controller
  const offset = controller.userData.offset;
  object.position.copy(controllerPos).add(offset);

  // Match the rotation of the controller
  object.quaternion.copy(controller.quaternion);
}
function render() {
  const deltaTime = clock.getDelta();

  updatePhysics(deltaTime);
  moveMarker();
  renderer.render(scene, camera);

  if (mixer !== undefined) {
    mixer.update(deltaTime);
  }
  if (mixer2 !== undefined) {
    mixer2.update(deltaTime);
  }
}
function updatePhysics(deltaTime) {
  // Step world
  physicsWorld.stepSimulation(deltaTime, 10);

  // Update rigid bodies
  for (let i = 0, il = rigidBodies.length; i < il; i++) {
    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();
    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();

      // Check if this is the object you want to move
      if (objThree.userData.initialPosition) {
        // Move the object along with the controller
        const controller = controller1.userData.selected
          ? controller1
          : controller2;
        const controllerPos = new THREE.Vector3();
        controller.getWorldPosition(controllerPos);
        const initialPos = objThree.userData.initialPosition;
        p.setX(initialPos.x + controllerPos.x);
        p.setY(initialPos.y + controllerPos.y);
        p.setZ(initialPos.z + controllerPos.z);

        // Update the motion state with the new position
        transformAux1.setOrigin(p);
        ms.setWorldTransform(transformAux1);
        objPhys.setWorldTransform(transformAux1);
      }

      // Update the position and rotation of the object in the scene
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

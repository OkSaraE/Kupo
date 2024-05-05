import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import Stats from "three/addons/libs/stats.module.js";

//For Vite build
let basePath;

if (import.meta.env.MODE === "production") {
  basePath = "/~saraok/kupoli/";
} else {
  basePath = "/";
}

let container, camera, scene, renderer, controls, textureLoader, stats;

//physics variables
const gravityConstant = -2.8;
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
let clock, mixer;

let marker, baseReferenceSpace;
let INTERSECTION;

const intersected = [];
const tempMatrix = new THREE.Matrix4();
//list of movable objects
const modelarray = ["cube1", "cube2", "EXAMPLE", "ex2", "ex3"];

//Groups
let teleportgroup = new THREE.Group();
teleportgroup.name = "Teleport-Group";
let movegroup = new THREE.Group();
movegroup.name = "Interaction-Group";

Ammo().then(function (AmmoLib) {
  Ammo = AmmoLib;

  init();
  animate();
});

function init() {
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

  loadmodels();
  initVR();
  initPhysics();
  createObjects();

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

  //Create a helper for the shadow camera (optional)
  const shadowhelper = new THREE.CameraHelper(directionalLight.shadow.camera);
  scene.add(shadowhelper);

  const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  scene.add(helper);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // camera
  camera.position.set = 10;
  camera.position.y = 5;
  camera.position.x = 5;
  camera.lookAt(axesHelper.position);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
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
  const ground = createParalellepiped(
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

  // cube
  /* const cubeMass = 1.2;
  const cubeRadius = 1;

  const cube = new THREE.Mesh( new THREE.BoxGeometry( 1 , 1 ,1), new THREE.MeshBasicMaterial( { color: 0x202020 } ) );
  cube.castShadow = true;
  cube.receiveShadow = true;
  const cubeShape = new Ammo.btBoxShape( cubeRadius );
  cubeShape.setMargin( margin );
  pos.set( - 3, 2, 0 );
  quat.set( 0, 0, 0, 1 );
  createRigidBody( cube, cubeShape, cubeMass, pos, quat );
  cube.userData.physicsBody.setFriction( 0.5 );
*/
  // Wall
  const brickMass = 0.2;
  const brickLength = 1;
  const brickDepth = 1;
  const brickHeight = 1;

  pos.set(-2, 19, -5);
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
  brick.castShadow = true;
  brick.receiveShadow = true;
  /*  brick.name = "EXAMPLE";
  movegroup.add(brick); */
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
  /*  threeObject.name = "ex2";
  movegroup.add(threeObject) */ return threeObject;
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
  /* body.name = "ex3";
  movegroup.add(body); */
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
    .load("testWorld/starsky.hdr", function (texture) {
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

      // Test models Delete Later
      const loader = new GLTFLoader().setPath(basePath);
      loader.load("testWorld/kupoli/base.gltf", async function (gltf) {
        const model = gltf.scene;
        model.name = "world";
        await renderer.compileAsync(model, camera, scene);
        model.position.set(0, 1, 0);
        model.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        teleportgroup.add(model);
      });

      const loader2 = new GLTFLoader().setPath(basePath);
      loader2.load("testWorld/objects.gltf", async function (gltf) {
        const model2 = gltf.scene;
        await renderer.compileAsync(model2, camera, scene);
        model2.position.set(0, 0, 0);
        model2.traverse(function (node) {
          if (node.material) {
            node.material.side = THREE.FrontSide;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        movegroup.add(model2);
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
    /* object.material.emissive.b = 1; */
    /* while (!modelarray.includes(object.name)) {
      object = object.parent;
      if (modelarray.includes(object.name)) {
        break;
      }
    } */
    controller.attach(object);
    console.log(object);

    controller.userData.selected = object;
  }

  controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    let object = controller.userData.selected;
    /* object.material.emissive.b = 0; */
    scene.attach(object);

    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  controller.updateMatrixWorld();

  raycaster.setFromXRController(controller);

  return raycaster.intersectObjects(scene.children, true);
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
    /* while (!modelarray.includes(object.name)) {
      object = object.parent;
      if (modelarray.includes(object.name)) {
        break;
      }
    }  */ /* 
    console.log("Parent", object); */
    // now it is the parent so cannot be assignemd, might be a group, need traversing to child object
    //object.material.emissive.r = 1;
    // go through object, find the materials assigned
    /* object.traverse(function (node) {
      if (node.material) {
        node.material.emissive.r = 0.3;
        node.material.transparent = true;
        node.material.opacity = 0.5;
      }
    }); */
    /*  object.material.emissive.r = 1; */
    intersected.push(object);

    line.scale.z = intersection.distance;
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    // now it is the parent so cannot be assignemd, might be a group, need traversing to child object
    //object.material.emissive.r = 1;
    // go through object, find the materials assigned
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
function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}
function render() {
  const deltaTime = clock.getDelta();

  updatePhysics(deltaTime);

  renderer.render(scene, camera);
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
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

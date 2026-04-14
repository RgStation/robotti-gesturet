let scene, camera, renderer;
let robot, mixer;
let activeAction;

init();

async function init() {

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.z = 3;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444));

  // ROBOTTI
  const loader = new THREE.GLTFLoader();
  const gltf = await new Promise(resolve => {
    loader.load("assets/models/robot/RobotExpressive.glb", resolve);
  });

  robot = gltf.scene;
  robot.scale.set(0.5, 0.5, 0.5);
  robot.position.set(0, -1, 0);
  scene.add(robot);

  // ANIMAATIOT
  mixer = new THREE.AnimationMixer(robot);

  const idle = mixer.clipAction(gltf.animations[2]);
  const jump = mixer.clipAction(gltf.animations[3]);
  const die = mixer.clipAction(gltf.animations[1]);
  const thumbsUp = mixer.clipAction(gltf.animations[9]);
  const wave = mixer.clipAction(gltf.animations[12]);
  const dance = mixer.clipAction(gltf.animations[7]); // rock

  idle.play();
  activeAction = idle;

  // Paluu idleen
  mixer.addEventListener("finished", () => {
    idle.reset();
    idle.play();
    activeAction = idle;
  });

  // ---------- GESTURET ----------

  const rockGesture = new fp.GestureDescription("rock");
  rockGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
  rockGesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
  rockGesture.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
  rockGesture.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);

  const waveGesture = new fp.GestureDescription("wave");
  for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    waveGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    waveGesture.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
  }

  const jumpGesture = new fp.GestureDescription("jump");
  jumpGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  jumpGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
  for (let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky, fp.Finger.Thumb]) {
    jumpGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  }

  const dieGesture = new fp.GestureDescription("die");
  for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    dieGesture.addDirection(finger, fp.FingerDirection.HorizontalLeft, 1.0);
    dieGesture.addDirection(finger, fp.FingerDirection.HorizontalRight, 1.0);
  }

  const estimator = new fp.GestureEstimator([
    rockGesture,
    waveGesture,
    jumpGesture,
    dieGesture,
    fp.Gestures.ThumbsUpGesture
  ]);

  // ---------- KAMERA ----------
  const video = document.createElement("video");
  video.autoplay = true;
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });

  video.srcObject = stream;

  const model = await handpose.load();

  // ---------- DETECT ----------
  async function detect() {

    const hands = await model.estimateHands(video);

    if (hands.length > 0) {

      const result = estimator.estimate(hands[0].landmarks, 6.5);

      if (result.gestures.length > 0) {

        const gesture = result.gestures[0].name;
        console.log("Gesture:", gesture);

        if (activeAction === idle) {

          if (gesture === "rock") {
            playAction(dance);
          }
          if (gesture === "wave") {
            playAction(wave);
          }
          if (gesture === "jump") {
            playAction(jump);
          }
          if (gesture === "die") {
            playAction(die);
          }
          if (gesture === "thumbs_up") {
            playAction(thumbsUp);
          }
        }
      }
    }

    requestAnimationFrame(detect);
  }

  detect();

  function playAction(action) {
    idle.stop();

    action.reset();
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();

    activeAction = action;
  }

  // ---------- RENDER ----------
  function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(0.016);
    renderer.render(scene, camera);
  }

  animate();
}
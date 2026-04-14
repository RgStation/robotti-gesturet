let scene, camera, renderer;
let robot, mixer;
let activeAction;

init();

async function init() {

  // SCENE
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

  // 🔥 SIIRRETÄÄN ROBOTTI ALEMMAS
  robot.scale.set(0.5, 0.5, 0.5);
  robot.position.set(0, -1, 0);

  scene.add(robot);

  // ANIMAATIOT
  mixer = new THREE.AnimationMixer(robot);

  const idle = mixer.clipAction(gltf.animations[2]);
  const dance = mixer.clipAction(gltf.animations[7]);

  idle.play();
  activeAction = idle;

  // 🔁 PALAUTUS IDLEEN
  mixer.addEventListener("finished", () => {
    idle.reset();
    idle.play();
    activeAction = idle;
  });

  // 🤘 ROCK GESTURE
  const rockGesture = new fp.GestureDescription("rock");

  rockGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);

  rockGesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);

  rockGesture.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
  rockGesture.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);

  const estimator = new fp.GestureEstimator([rockGesture]);

  // 📷 KAMERA (ETU)
  const video = document.createElement("video");
  video.autoplay = true;
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });

  video.srcObject = stream;

  const model = await handpose.load();

  // 🔍 DETECT
  async function detect() {

    const hands = await model.estimateHands(video);

    if (hands.length > 0) {

      const result = estimator.estimate(hands[0].landmarks, 6.5);

      if (result.gestures.length > 0) {

        const gesture = result.gestures[0].name;
        console.log("Gesture:", gesture);

        // 🤘 ROCK → käynnistä animaatio
        if (gesture === "rock" && activeAction === idle) {

          console.log("ROCK TRIGGERED");

          idle.stop();

          dance.reset();
          dance.setLoop(THREE.LoopOnce);
          dance.clampWhenFinished = true;
          dance.play();

          activeAction = dance;
        }
      }
    }

    requestAnimationFrame(detect);
  }

  detect();

  // RENDER LOOP
  function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(0.016);
    renderer.render(scene, camera);
  }

  animate();
}
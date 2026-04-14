import { loadGLTF } from "../../../libs/loader.js";

const THREE = window.MINDAR.IMAGE.THREE;

async function startAR() {

  // 🔥 EI imageTargetSrc → ei tarvita king.mind
  const mindARThreeJs = new window.MINDAR.IMAGE.MindARThree({
    container: document.body,
  });

  const { renderer, scene, camera } = mindARThreeJs;

  // VALO
  const light = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1);
  scene.add(light);

  // ROBOTTI
  const robot = await loadGLTF("assets/models/robot/RobotExpressive.glb");
  robot.scene.scale.multiplyScalar(0.4);
  robot.scene.position.set(0, -0.5, -2);

  // 🔥 LISÄTÄÄN SUORAAN SCENEEN
  scene.add(robot.scene);

  // ANIMAATIOT
  const mixer = new THREE.AnimationMixer(robot.scene);
  const clock = new THREE.Clock();

  const idleAction = mixer.clipAction(robot.animations[2]);
  const thumbsUpAction = mixer.clipAction(robot.animations[9]);
  const waveAction = mixer.clipAction(robot.animations[12]);
  const jumpAction = mixer.clipAction(robot.animations[3]);
  const dieAction = mixer.clipAction(robot.animations[1]);

  // 🤘 ROCK animaatio
  const danceAction = mixer.clipAction(robot.animations[7]);

  dieAction.loop = THREE.LoopOnce;
  jumpAction.loop = THREE.LoopOnce;
  thumbsUpAction.loop = THREE.LoopOnce;
  waveAction.loop = THREE.LoopOnce;
  danceAction.loop = THREE.LoopOnce;

  // GESTURET

  const waveGesture = new fp.GestureDescription("wave");
  for (let finger of [
    fp.Finger.Thumb,
    fp.Finger.Index,
    fp.Finger.Middle,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    waveGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    waveGesture.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
  }

  const jumpGesture = new fp.GestureDescription("jump");
  jumpGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  jumpGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);

  for (let finger of [
    fp.Finger.Thumb,
    fp.Finger.Middle,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    jumpGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  }

  const dieGesture = new fp.GestureDescription("die");
  for (let finger of [
    fp.Finger.Thumb,
    fp.Finger.Index,
    fp.Finger.Middle,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    dieGesture.addDirection(finger, fp.FingerDirection.HorizontalLeft, 1.0);
    dieGesture.addDirection(finger, fp.FingerDirection.HorizontalRight, 1.0);
  }

  // 🤘 ROCK GESTURE
  const rockGesture = new fp.GestureDescription("rock");

  rockGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);

  rockGesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
  rockGesture.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);

  rockGesture.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
  rockGesture.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);

  rockGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.5);
  rockGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 0.5);

  // ESTIMATOR
  const gestureEstimator = new fp.GestureEstimator([
    fp.Gestures.ThumbsUpGesture,
    waveGesture,
    jumpGesture,
    dieGesture,
    rockGesture,
  ]);

  // ANIMAATION HALLINTA
  let activeAction = idleAction;
  activeAction.play();

  const fadeToAction = (action, duration) => {
    if (activeAction === action) return;
    activeAction = action;
    activeAction.reset().fadeIn(duration).play();
  };

  mixer.addEventListener("finished", () => {
    fadeToAction(idleAction, 0.2);
  });

  await mindARThreeJs.start();

  // HANDPOSE
  const model = await handpose.load();
  const video = mindARThreeJs.video;

  const detect = async () => {
    if (activeAction != idleAction) {
      window.requestAnimationFrame(detect);
      return;
    }

    const predictions = await model.estimateHands(video);

    if (predictions.length > 0) {
      const estimatedGestures = gestureEstimator.estimate(predictions[0].landmarks, 7.5);

      if (estimatedGestures.gestures.length > 0) {
        const bestConfindence = estimatedGestures.gestures.sort(
          (a, b) => b.confidence - a.confidence
        )[0];

        console.log(bestConfindence.name);

        if (bestConfindence.name === "thumbs_up") {
          fadeToAction(thumbsUpAction, 0.3);
        }
        if (bestConfindence.name === "wave") {
          fadeToAction(waveAction, 0.3);
        }
        if (bestConfindence.name === "jump") {
          fadeToAction(jumpAction, 0.3);
        }
        if (bestConfindence.name === "die") {
          fadeToAction(dieAction, 0.3);
        }

        // 🤘 ROCK
        if (bestConfindence.name === "rock") {
          fadeToAction(danceAction, 0.3);
        }
      }
    }

    window.requestAnimationFrame(detect);
  };

  window.requestAnimationFrame(detect);

  // RENDER LOOP
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    mixer.update(delta);
    renderer.render(scene, camera);
  });
}

startAR();
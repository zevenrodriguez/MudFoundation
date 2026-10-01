#pragma lifecycle(startup,update,dispose)

const listener = new THREE.AudioListener();
camera.add( listener );
const userSound = new THREE.Audio( listener );
const globalAudioLoader = new THREE.AudioLoader();
let activated = false;

let curSound = "https://persistence.mud.foundation/files/f5525d22-045c-445b-8f04-78be2255e32b.mp3";
function activateSound(soundLink) {
    if (activated) return;
    activated = true;

    globalAudioLoader.load(
        soundLink,
        function (buffer) {
            userSound.stop();
            userSound.setBuffer(buffer);
            userSound.setLoop(false);
            userSound.setVolume(0.5);
            userSound.play();
            //userSound.stop(8);
        }
    );
}

function startup() {

    activateSound(curSound);
}
/*
*  Fired on every frame, allowing for continuous updates and dynamic behavior.
*/
function update(delta,time) {
}
/*
*  Fired on object destruction, enabling disposal of resources and proper finalization.
*/
function dispose() {
}

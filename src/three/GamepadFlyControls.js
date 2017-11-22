/**
 * https://gist.github.com/trevordixon/5783321
 *
 * @author James Baicoianu / http://www.baicoianu.com/
 * Originally from http://threejs.org/examples/js/controls/FlyControls.js
 * Simplified to only obey gamepad
 */

import {
  Quaternion,
  Vector3,
} from 'three';


export const GamepadFlyControls = function (object) {
    this.object = object;

    // API

    this.movementSpeed = 1.0;
    this.rollSpeed = 0.005;

    // internals

    this.tmpQuaternion = new Quaternion();

    this.moveState = {up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0};
    this.moveVector = new Vector3(0, 0, 0);
    this.rotationVector = new Vector3(0, 0, 0);

    this.gamepadYaw = 0;
    this.gamepadPitch = 0;
    this.gamepadRoll = 0;

    this.setGamepadValues = function (gamepadYaw, gamepadPitch, gamepadRoll) {
      this.gamepadYaw = gamepadYaw || 0;
      this.gamepadPitch = gamepadPitch || 0;
      this.gamepadRoll = gamepadRoll || 0;
    };

    this.update = function (delta) {
        this.moveState.yawLeft   = -this.gamepadYaw;
        this.moveState.pitchDown = this.gamepadPitch;
        this.moveState.rollLeft = -this.gamepadRoll;

        this.updateRotationVector();

        var moveMult = delta * this.movementSpeed;
        var rotMult = delta * this.rollSpeed;

        this.object.translateX(this.moveVector.x * moveMult);
        this.object.translateY(this.moveVector.y * moveMult);
        this.object.translateZ(this.moveVector.z * moveMult);

        this.tmpQuaternion.set(this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1).normalize();
        this.object.quaternion.multiply(this.tmpQuaternion);
    };

    this.updateRotationVector = function () {
        this.rotationVector.x = ( -this.moveState.pitchDown + this.moveState.pitchUp );
        this.rotationVector.y = ( -this.moveState.yawRight  + this.moveState.yawLeft );
        this.rotationVector.z = ( -this.moveState.rollRight + this.moveState.rollLeft );
    };

    this.updateRotationVector();
};

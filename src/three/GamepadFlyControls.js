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
  // Internals

  this.object = object;

  this.tmpMoveVector = new Vector3();
  this.tmpQuaternion = new Quaternion();

  this.rotationVector = new Vector3(0, 0, 0);
  this.moveVector = new Vector3(0, 0, 0);

  this.yawSpeed = 0;
  this.pitchSpeed = 0;
  this.rollSpeed = 0;
  this.moveSpeed = 0;

  // API

  this.setSpeeds = function (yawSpeed, pitchSpeed, rollSpeed, moveSpeed) {
    this.yawSpeed = yawSpeed || 0;
    this.pitchSpeed = pitchSpeed || 0;
    this.rollSpeed = rollSpeed || 0;
    this.moveSpeed = moveSpeed || 0;
  };

  this.update = function (timeStep) {
    this.rotationVector.x = -this.pitchSpeed * timeStep;
    this.rotationVector.y = -this.yawSpeed * timeStep;
    this.rotationVector.z = -this.rollSpeed * timeStep;

    this.moveVector.z = -this.moveSpeed * timeStep;

    this.tmpQuaternion.set(this.rotationVector.x, this.rotationVector.y, this.rotationVector.z, 1).normalize();
    this.object.quaternion.multiply(this.tmpQuaternion);

    this.tmpMoveVector.copy(this.moveVector);
    this.tmpMoveVector.applyQuaternion(this.object.quaternion);
    this.object.position.add(this.tmpMoveVector);
  };
};

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

  this._moveInputVector = new Vector3(0, 0, 0);
  this._rotationInputVector = new Vector3(0, 0, 0);
  this._rotationQuaternion = new Quaternion();

  // API

  this.object = object;
  this.yawSpeed = 0;
  this.pitchSpeed = 0;
  this.rollSpeed = 0;
  this.moveSpeed = 0;
  this.moveVector = new Vector3();

  this.setSpeeds = function (yawSpeed, pitchSpeed, rollSpeed, moveSpeed) {
    this.yawSpeed = yawSpeed || 0;
    this.pitchSpeed = pitchSpeed || 0;
    this.rollSpeed = rollSpeed || 0;
    this.moveSpeed = moveSpeed || 0;
  };

  this.update = function (timeStep) {
    this._rotationInputVector.x = -this.pitchSpeed * timeStep;
    this._rotationInputVector.y = -this.yawSpeed * timeStep;
    this._rotationInputVector.z = -this.rollSpeed * timeStep;

    this._moveInputVector.z = -this.moveSpeed * timeStep;

    this._rotationQuaternion.set(this._rotationInputVector.x, this._rotationInputVector.y, this._rotationInputVector.z, 1).normalize();
    this.object.quaternion.multiply(this._rotationQuaternion);

    this.moveVector.copy(this._moveInputVector).applyQuaternion(this.object.quaternion);
    this.object.position.add(this.moveVector);
  };
};

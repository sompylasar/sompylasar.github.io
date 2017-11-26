import React, { Component } from 'react';

import * as dg from 'dis-gui';

import {
  Scene,
  Group,
  Object3D,
  Vector2,
  Vector3,
  Color,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  DoubleSide,
  Mesh,
  Raycaster,
  HemisphereLight,
  DirectionalLight,
  Math as THREEMath,
} from 'three';

import { createJoyMap, createQueryModule } from 'joymap';
import vkey from 'vkey';

import { ShaderPass } from './three/ShaderPass';
import { BloomPass } from './three/BloomPass';
import { FXAAShader } from './three/FXAAShader';
import { CopyShader } from './three/CopyShader';
import { GamepadFlyControls } from './three/GamepadFlyControls';

import GLSL from 'glslify';


const markerSize = 0.02;
const markerGeometry = new BoxGeometry(markerSize, markerSize, markerSize);
markerGeometry.name = 'markerGeometry';

class DebugMarker extends Object3D {
  constructor(color, position, name) {
    super();

    const markerMaterial = new MeshBasicMaterial({ color: color, wireframe: true });

    const markerMesh = new Mesh(markerGeometry, markerMaterial);
    markerMesh.name = name + 'Mesh';
    markerMesh.position.copy(position);

    const initialRotation = Math.random() * 0.25;
    markerMesh.rotation.set(initialRotation * Math.PI, initialRotation * Math.PI, 0);

    this._markerMesh = markerMesh;

    this.name = name;
    this.add(this._markerMesh);
  }

  update(timeStep, time) {
    const scale = (1.0 + 0.2 * (Math.sin(time / 200) + 0.5));
    this._markerMesh.scale.x = scale;
    this._markerMesh.scale.y = scale;
    this._markerMesh.scale.z = scale;
    this._markerMesh.rotation.z += 0.02;
  }
}

function makeDebugMarker(color, position, name, markersArray) {
  const marker = new DebugMarker(color, position, name);
  markersArray.push(marker);
  return marker;
}


class LaserRay extends Object3D {
  constructor() {
    super();

    const rayRadius = 0.01;
    const rayGeometryLength = 1.0;

    this._raySpeed = 0.5;
    this._rayLength = 0.8;
    this._rayGeometryLength = rayGeometryLength;
    this._nearPosition = -this._rayLength;
    this._farPosition = 0;
    this._hitDistance = 100.0;
    this._finished = false;

    this.hitting = false;

    this.colorHex = 0x00ff00;
    const baseMaterial = new MeshBasicMaterial({
      color: new Color(this.colorHex),
    });
    this._baseMaterial = baseMaterial;

    // CylinderGeometry(bottomRadius, topRadius, height, segmentsRadius, segmentsHeight, openEnded )
    const rayGeometry = new CylinderGeometry(rayRadius * 0.7, rayRadius, rayGeometryLength, 10, 1, false);
    // Translate the cylinder geometry so that the desired point within the geometry is now at the origin.
    // https://stackoverflow.com/a/12835749/1346510
    rayGeometry.translate(0, rayGeometryLength / 2, 0);
    rayGeometry.rotateX(-0.5 * Math.PI);
    this._rayGeometry = rayGeometry;

    const rayMesh = new Mesh(rayGeometry, baseMaterial);
    rayMesh.name = 'rayMesh';
    rayMesh.scale.y = 0.8;
    this._rayMesh = rayMesh;

    const rayEndGeometry = new SphereGeometry(rayRadius * 1.5);
    const rayEndMesh = new Mesh(rayEndGeometry, baseMaterial);
    rayEndMesh.name = 'rayEndMesh';
    rayEndMesh.visible = false;
    this._rayEndMesh = rayEndMesh;

    this._rayGroup = new Group();
    this._rayGroup.name = 'rayGroup';
    this._rayGroup.scale.z = 0.01;
    this._rayGroup.add(rayMesh);

    this.add(this._rayGroup);
    this.add(this._rayEndMesh);
  }

  setColorHex(colorHex) {
    this.colorHex = colorHex;
    this._baseMaterial.color.setHex(colorHex);
  }

  setHitDistance(hitDistance) {
    this._hitDistance = hitDistance;
  }

  update(timeStep) {
    if (this._finished) { return; }

    const speed = this._raySpeed / timeStep;

    this._nearPosition += speed;
    this._farPosition += speed;

    const nearPosition = Math.max(0, this._nearPosition);
    const farPosition = Math.min(this._hitDistance, this._farPosition);

    const r = (Math.random() * 1.5) + 1.0;
    this._rayEndMesh.scale.x = r;
    this._rayEndMesh.scale.y = r;
    this._rayEndMesh.scale.z = 0.2;

    this._rayGroup.position.z = -nearPosition;
    this._rayGroup.scale.z = ((farPosition - nearPosition) / this._rayGeometryLength) + 0.001;

    const hitting = (this._farPosition >= this._hitDistance);
    if (hitting) {
      this._rayEndMesh.position.z = -this._hitDistance;
    }
    this._rayEndMesh.visible = hitting;
    this.hitting = hitting;

    this._finished = (this._nearPosition >= this._hitDistance);
    this.visible = !this._finished;
  }
}


const _colorConverter = new Color();
const GUIColorThreeHex = ({ colorHex, onChange, onFinishChange, ...props }) => {
  _colorConverter.setHex(colorHex);
  return (
    <dg.Color
      {...props}
      red={_colorConverter.r * 255} green={_colorConverter.g * 255} blue={_colorConverter.b * 255}
      onChange={onChange ? (c) => { onChange(_colorConverter.setRGB(c.red / 255, c.green / 255, c.blue / 255).getHex()); } : undefined}
      onFinishChange={onFinishChange ? (c) => { onFinishChange(_colorConverter.setRGB(c.red / 255, c.green / 255, c.blue / 255).getHex()); } : undefined}
    />
  );
};


function createKeyboardHandler() {
  const _pressedKeys = new Map();

  function update(timeStep) {
    _pressedKeys.forEach((time, key) => { _pressedKeys.set(key, time + timeStep); });
  }

  function onKeyDown(event) {
    const key = vkey[event.keyCode];
    _pressedKeys.set(key, 0);
  }

  function onKeyUp(event) {
    const key = vkey[event.keyCode];
    _pressedKeys.delete(key);
  }

  function isDown(key) {
    return _pressedKeys.has(key);
  }

  function destroy() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  return {
    update: update,
    isDown: isDown,
    destroy: destroy,
  };
}


function thresholdAbsMin(value, valueMin) {
  return (Math.abs(value) < Math.abs(valueMin) ? 0 : value);
}


class SompylasarWebsiteVRScene extends Component {
  constructor(props) {
    super(props);

    this._sceneState = this.props.restoreSceneState() || {
      time: 0,
    };

    // "Saving" a reference of the mutable state object once is enough for StatePersister.
    this.props.saveSceneState(this._sceneState);

    this._joymap = createJoyMap({
      autoConnect: true,
    });
    this._joymapQuery = createQueryModule();
    this._joymap.addModule(this._joymapQuery);

    this._keyboard = createKeyboardHandler();

    this._gamepadLastActiveTime = 0;
    this._keyboardLastActiveTime = 0;

    this._gamepadFlyControlsObject = new Object3D();
    this._gamepadFlyControls = new GamepadFlyControls(this._gamepadFlyControlsObject);
    this._gamepadFlyControls.movementSpeed = 1.0;
    this._gamepadFlyControls.rollInput = 0.0001;

    this._markers = [];

    this._scene = new Scene();
    this._scene.name = 'sompylasarWebsiteVRScene';

    this._cameraDolly = null;

    const floorGeometry = new PlaneGeometry( 10, 10, 10, 10 );
    floorGeometry.rotateX(-0.5 * Math.PI);
    const floorMaterial = new MeshBasicMaterial({ color: 0x101010, side: DoubleSide });
    this._floorMesh = new Mesh( floorGeometry, floorMaterial );
    this._scene.add(this._floorMesh);


    this._room = new Mesh(
  		new BoxGeometry( 6, 6, 6, 8, 8, 8 ),
  		new MeshBasicMaterial( { color: 0x404040, wireframe: true } )
  	);
  	this._scene.add( this._room );

  	this._scene.add( new HemisphereLight( 0x606060, 0x404040 ) );

  	const light = new DirectionalLight( 0xffffff );
  	light.position.set( 1, 1, 1 ).normalize();
  	this._scene.add( light );

  	const boxGeometry = new BoxGeometry( 0.15, 0.15, 0.15 );

  	for ( let i = 0; i < 200; i ++ ) {
  		const cube = new Mesh( boxGeometry, new MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

  		cube.position.x = Math.random() * 4 - 2;
  		cube.position.y = Math.random() * 4 - 2;
  		cube.position.z = Math.random() * 4 - 2;

  		cube.rotation.x = Math.random() * 2 * Math.PI;
  		cube.rotation.y = Math.random() * 2 * Math.PI;
  		cube.rotation.z = Math.random() * 2 * Math.PI;

  		cube.scale.x = Math.random() + 0.5;
  		cube.scale.y = Math.random() + 0.5;
  		cube.scale.z = Math.random() + 0.5;

  		cube.userData.velocity = new Vector3();
  		cube.userData.velocity.x = Math.random() * 0.01 - 0.005;
  		cube.userData.velocity.y = Math.random() * 0.01 - 0.005;
  		cube.userData.velocity.z = Math.random() * 0.01 - 0.005;

      cube.userData.health = 1.0;

  		this._room.add( cube );
  	}

    this._rays = [];
    this._raycaster = new Raycaster();

    this.props.setUpdate(this._updateScene);

    this._effectCopy = new ShaderPass(CopyShader);
    this._effectBloom = new BloomPass(3.0);
    this._effectFXAA = new ShaderPass(FXAAShader);
    this._effectFXAA.uniforms.resolution.value = new Vector2(1 / this.props.rendererSize.width, 1 / this.props.rendererSize.height);

    this.props.setPostProcessing([
      this._effectBloom,
      this._effectFXAA,
      this._effectCopy,
    ]);

    this.state = {
      rayBaseColor: 0x00ff00,
      bloomStrength: this._effectBloom.copyUniforms[ "opacity" ].value,
    };
  }

  componentDidMount() {
    this._warnCount = 0;
    const warn = console.warn;
    console.warn = function (...args) {
      ++this._warnCount;
      if (this._warnCount > 10) {
        this._warnCount = 0;
        throw new Error(args.join(' '));
      }
      return warn.apply(console, args);
    };
  }

  componentDidUpdate() {
    this._effectBloom.copyUniforms[ "opacity" ].value = this.state.bloomStrength;
    this._effectFXAA.uniforms.resolution.value = new Vector2(1 / this.props.rendererSize.width, 1 / this.props.rendererSize.height);
  }

  componentWillUnmount() {
    this._keyboard.destroy();
    this.props.setUpdate(null);
    // Reset the saved state.
    this.props.saveSceneState(null);
  }

  _updateScene = (timeStep, camera) => {
    const time = this._sceneState.time + timeStep;
    this._sceneState.time = time;

    if (!this._cameraDolly) {
      this._cameraDolly = new Object3D();
      this._cameraDolly.name = 'cameraDolly';
      this._cameraDolly.add(camera);
      this._cameraDolly.position.y = 0.5;
      this._cameraDolly.position.z = 5;
      this._gamepadFlyControlsObject.position.copy(this._cameraDolly.position);
      this._scene.add(this._cameraDolly);

      if (false) {
        const geom = new CylinderGeometry(
          0.1, 0.1, 2.0, 10, 2, false
        );
        geom.translate(0, 2.0 / 2, 0);
        geom.rotateX(-0.5 * Math.PI);
        this._flyingObject = new Mesh(geom, new MeshBasicMaterial({ color: 0xff0000 }));
        this._flyingObject.scale.x = 1.5;
        this._flyingObject.scale.y = 0.5;
        this._flyingObject.scale.z = 0.5;
        this._flyingObject.position.set(0,0,0);
        this._scene.add(this._flyingObject);
      }
      else {
        this._flyingObject = this._cameraDolly;
      }
    }

    this._joymap.poll();
    const leftStick = this._joymapQuery.getSticks('L');
    const rightStick = this._joymapQuery.getSticks('R');
    const leftFlap = this._joymapQuery.getButtons('L2');
    const rightFlap = this._joymapQuery.getButtons('R2');

    let yawInput = 0;
    let pitchInput = 0;
    let rollInput = 0;
    let moveInput = 0;

    this._keyboard.update(timeStep);

    let leftX = 0.3 * thresholdAbsMin(leftStick.value[0], 0.15);
    let leftY = 0.3 * (leftStick ? thresholdAbsMin(leftStick.value[1], 0.15) : 0);
    let rightX = 0.3 * thresholdAbsMin(rightStick.value[0], 0.15);
    let rightY = 0.3 * (rightStick ? thresholdAbsMin(rightStick.value[1], 0.15) : 0);
    let accel = (rightFlap ? thresholdAbsMin(rightFlap.value, 0.15) : 0);
    let decel = (leftFlap ? thresholdAbsMin(leftFlap.value, 0.15) : 0);
    if (leftX !== 0 || leftY !== 0 || rightX !== 0 || rightY !== 0 || accel !== 0 || decel !== 0) {
      this._gamepadLastActiveTime = time;
    }

    const leftXKeyboard = 0.3 * ((this._keyboard.isDown('A') ? -1 : 0) + (this._keyboard.isDown('D') ? 1 : 0));
    const leftYKeyboard = 0.3 * ((this._keyboard.isDown('W') ? -1 : 0) + (this._keyboard.isDown('S') ? 1 : 0));
    const rightXKeyboard = 0.05 * ((this._keyboard.isDown('<left>') ? -1 : 0) + (this._keyboard.isDown('<right>') ? 1 : 0));
    const rightYKeyboard = 0.3 * ((this._keyboard.isDown('<up>') ? -1 : 0) + (this._keyboard.isDown('<down>') ? 1 : 0));
    const accelKeyboard = 0;
    const decelKeyboard = 0;
    if (leftXKeyboard !== 0 || leftYKeyboard !== 0 || rightXKeyboard !== 0 || rightYKeyboard !== 0 || accelKeyboard !== 0 || decelKeyboard !== 0) {
      this._keyboardLastActiveTime = time;
    }

    if (this._keyboardLastActiveTime > this._gamepadLastActiveTime) {
      leftX = leftXKeyboard;
      leftY = leftYKeyboard;
      rightX = rightXKeyboard;
      rightY = rightYKeyboard;
      accel = accelKeyboard;
      decel = decelKeyboard;
    }

    yawInput = (rightX);
    pitchInput = -((leftY * 0.3 + (rightY * leftY <= 0 ? 0 : rightY * 0.2)) * (1.0 + 4.5 * accel));
    rollInput = (leftX * 0.8 * (1.0 + 2.5 * accel));
    moveInput = (0.0002 * (1.0 + 2.5 * accel - 2.5 * decel));

    this._gamepadFlyControls.setSpeeds(yawInput * 0.005, pitchInput * 0.005, rollInput * 0.005, moveInput);
    this._gamepadFlyControls.update(timeStep);
    this._flyingObject.position.copy(this._gamepadFlyControlsObject.position);
    this._flyingObject.quaternion.copy(this._gamepadFlyControlsObject.quaternion);

    this._flyingObject.position.y = Math.max(0.3, this._flyingObject.position.y);

    this._markers.forEach((marker) => {
      marker.update(timeStep, time);
    });

    if (!this._sceneState.nextRayTime || time >= this._sceneState.nextRayTime) {
      this._sceneState.nextRayTime = time + 300;

      const ray = new LaserRay();
      ray.setColorHex(this.state.rayBaseColor);
      this._flyingObject.updateMatrixWorld();
      const raySourceOffset = new Vector3(0, -0.13, 0);
      const pos = this._flyingObject.localToWorld(this._flyingObject.worldToLocal(this._flyingObject.position.clone()).add(raySourceOffset));
      ray.position.copy(pos);
      ray.quaternion.copy(this._flyingObject.quaternion);
      this._scene.add(ray);
      this._rays.push(ray);
    }

    if (!this._markersIntersections) { this._markersIntersections = []; }
    while (this._markersIntersections.length > 10) {
      this._scene.remove(this._markersIntersections[0]);
      this._markersIntersections.splice(0, 1);
    }

    for (let ic = this._rays.length, i = 0; i < ic; ++i) {
      const ray = this._rays[i];

      const direction = ray.localToWorld(ray.worldToLocal(ray.position.clone()).add(new Vector3(0, 0, -1))).sub(ray.position).normalize();
      this._raycaster.set(ray.position, direction);
      //this._scene.add(makeDebugMarker(ray.colorHex, ray.position, '', this._markersIntersections));

      const intersections = this._raycaster.intersectObjects(this._room.children).filter((x) => (x.distance > 0));
      const intersection = intersections[0];
      if (intersection) {
        //this._scene.add(makeDebugMarker(ray.colorHex, intersection.point, '', this._markersIntersections));
        ray.setHitDistance(intersections[0].distance);
      }
      else {
        ray.setHitDistance(100.0);
      }

      ray.update(timeStep);

      if (!ray.visible) {
        this._scene.remove(ray);
        this._rays.splice(i, 1);
        --ic;
        --i;
        continue;
      }

      if (ray.hitting && intersection && intersection.object) {
        const cube = intersection.object;

        cube.userData.health -= 0.02;
        cube.material.opacity = cube.userData.health;

        cube.userData.velocity.add(
          direction.clone().cross(intersection.face.normal.clone().multiplyScalar(0.001))
        );
      }
    }

    // Keep cubes inside room
		for ( let i = 0; i < this._room.children.length; i ++ ) {
			const cube = this._room.children[ i ];
      if (cube.userData.health <= 0) {
        this._room.remove(cube);
        --i;
        continue;
      }

			cube.userData.velocity.multiplyScalar( 1 - ( 0.001 * timeStep ) );
			cube.position.add( cube.userData.velocity );
			if ( cube.position.x < - 3 || cube.position.x > 3 ) {
				cube.position.x = THREEMath.clamp( cube.position.x, - 3, 3 );
				cube.userData.velocity.x = - cube.userData.velocity.x;
			}
			if ( cube.position.y < - 3 || cube.position.y > 3 ) {
				cube.position.y = THREEMath.clamp( cube.position.y, - 3, 3 );
				cube.userData.velocity.y = - cube.userData.velocity.y;
			}
			if ( cube.position.z < - 3 || cube.position.z > 3 ) {
				cube.position.z = THREEMath.clamp( cube.position.z, - 3, 3 );
				cube.userData.velocity.z = - cube.userData.velocity.z;
			}

			cube.rotation.x += cube.userData.velocity.x * 2 * timeStep;
			cube.rotation.y += cube.userData.velocity.y * 2 * timeStep;
			cube.rotation.z += cube.userData.velocity.z * 2 * timeStep;
		}

    return this._scene;
  }

  render() {
    if (this.props.isDebug) {
      return (
        <dg.GUI>
          <GUIColorThreeHex label='rayBaseColor' colorHex={this.state.rayBaseColor} onChange={(colorHex) => { this.setState({ rayBaseColor: colorHex }); }} />
          <dg.Number label='bloomStrength' min={0.0} max={10.0} value={this.state.bloomStrength} onChange={(value) => { this.setState({ bloomStrength: value }); }} />
          <dg.Number label='slowFactor' min={0.01} max={30.0} value={this.props.slowFactor} onChange={(value) => { this.props.setSlow(value); }} />
          <dg.Checkbox label='isDebug' checked={this.props.isDebug} onChange={(isDebug) => { this.props.setDebug(isDebug); }} />
          <dg.Checkbox label='isMono' checked={this.props.isMono} onChange={(isMono) => { this.props.setMono(isMono); }} />
        </dg.GUI>
      );
    }

    return null;
  }
}

export default SompylasarWebsiteVRScene;

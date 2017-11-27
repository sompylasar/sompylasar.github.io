import React, { Component } from 'react';

import * as dg from 'dis-gui';

import {
  Scene,
  Object3D,
  Vector2,
  Vector3,
  Matrix4,
  Quaternion,
  Color,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  ShaderMaterial,
  BackSide,
  DoubleSide,
  Mesh,
  Raycaster,
  HemisphereLight,
  DirectionalLight,
  Math as THREEMath,
} from 'three';

import * as CANNON from 'cannon';

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


class LaserRayState {
  constructor() {
    this.raySpeed = 0.5;
    this.rayLength = 0.8;
    this.nearPosition = -this.rayLength;
    this.farPosition = 0;
    this.hitDistance = 100.0;
    this.hitting = false;
    this.hitRadius = 0;
    this.visible = true;
    this.colorHex = 0x00ff00;
  }

  update(timeStep) {
    if (!this.visible) { return; }

    const speed = this.raySpeed / timeStep;
    this.nearPosition += speed;
    this.farPosition += speed;  // TODO(@sompylasar): Increase farPosition speed by sin(speed) for fancy effect?
    this.hitting = (this.farPosition >= this.hitDistance);
    this.hitRadius = 1.0 + (Math.random() * 1.5);
    this.visible = (this.nearPosition < this.hitDistance);
  }
}

const RAY_GEOMETRY_RADIUS = 0.01;
const RAY_GEOMETRY_LENGTH = 1.0;

class LaserRay extends Object3D {
  constructor() {
    super();

    this.state = new LaserRayState();

    const baseMaterial = new MeshBasicMaterial({
      color: new Color(this.state.colorHex),
      side: DoubleSide,
    });
    this._baseMaterial = baseMaterial;

    // CylinderGeometry(bottomRadius, topRadius, height, segmentsRadius, segmentsHeight, openEnded )
    const rayGeometry = new CylinderGeometry(0.7 * RAY_GEOMETRY_RADIUS, RAY_GEOMETRY_RADIUS, RAY_GEOMETRY_LENGTH, 10, 1, false);
    // Translate the cylinder geometry so that the desired point within the geometry is now at the origin.
    // https://stackoverflow.com/a/12835749/1346510
    rayGeometry.translate(0, 0.5 * RAY_GEOMETRY_LENGTH, 0);
    rayGeometry.rotateX(-0.5 * Math.PI);

    const rayMesh = new Mesh(rayGeometry, baseMaterial);
    rayMesh.name = 'rayMesh';
    rayMesh.scale.y = 0.8;
    this._rayMesh = rayMesh;

    const rayEndGeometry = new SphereGeometry(1.5 * RAY_GEOMETRY_RADIUS);
    const rayEndMesh = new Mesh(rayEndGeometry, baseMaterial);
    rayEndMesh.name = 'rayEndMesh';
    rayEndMesh.scale.z = 0.2;
    rayEndMesh.visible = false;
    this._rayEndMesh = rayEndMesh;

    this.add(this._rayMesh);
    this.add(this._rayGlowMesh);
    this.add(this._rayEndMesh);

    this.render();
  }

  setColorHex(colorHex) {
    this.state.colorHex = colorHex;
  }

  setHitDistance(hitDistance) {
    this.state.hitDistance = hitDistance;
  }

  update(timeStep) {
    this.state.update(timeStep);
    this.render();
  }

  render() {
    const {
      visible,
      hitRadius,
      nearPosition,
      hitDistance,
      farPosition,
      hitting,
    } = this.state;

    this.visible = visible;

    if (visible) {
      this._baseMaterial.color.setHex(this.state.colorHex);

      const nearPositionClamped = (nearPosition < 0 ? 0 : nearPosition);
      const farPositionClamped = (farPosition > hitDistance ? hitDistance : farPosition);
      this._rayMesh.position.z = -nearPositionClamped;
      this._rayMesh.scale.z = (farPositionClamped - nearPositionClamped) * RAY_GEOMETRY_LENGTH + 0.001;

      this._rayEndMesh.scale.x = hitRadius;
      this._rayEndMesh.scale.y = hitRadius;
      if (hitting) {
        this._rayEndMesh.position.z = -this.state.hitDistance;
      }
      this._rayEndMesh.visible = hitting;
    }
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

    this._markers = [];

    this._scene = new Scene();
    this._scene.name = 'sompylasarWebsiteVRScene';

    {
      const world = new CANNON.World();
      world.quatNormalizeSkip = 0;
      world.quatNormalizeFast = false;
      world.defaultContactMaterial.contactEquationStiffness = 1e9;
      world.defaultContactMaterial.contactEquationRelaxation = 4;

      const solver = new CANNON.GSSolver();
      solver.iterations = 7;
      solver.tolerance = 0.1;

      world.solver = new CANNON.SplitSolver(solver);
      world.gravity.set(0, 0, 0);
      world.broadphase = new CANNON.NaiveBroadphase();

      this._physicsWorld = world;
    }

    this._cameraDolly = null;

    {
      const geom = new SphereGeometry(50, 100, 100);
      const mesh = new Mesh(geom, new MeshBasicMaterial({ color: 0x333333, wireframe: true, side: BackSide }));
      mesh.position.set(0, 0, 0);
      this._scene.add(mesh);
    }

    this._room = new Mesh(
  		new BoxGeometry( 6, 6, 6, 8, 8, 8 ),
  		new MeshBasicMaterial( { color: 0x404040, visible: false, wireframe: true } )
  	);
  	this._scene.add( this._room );

  	this._scene.add( new HemisphereLight( 0x606060, 0x404040 ) );

  	const light = new DirectionalLight( 0xffffff );
  	light.position.set( 1, 1, 1 ).normalize();
  	this._scene.add( light );

  	const boxGeometry = new BoxGeometry( 1, 1, 1 );

    for ( let i = 0; i < 30; i ++ ) {
  		const cube = new Mesh( boxGeometry, new MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

  		cube.position.x = Math.random() * 4 - 2;
  		cube.position.y = Math.random() * 4 - 2;
  		cube.position.z = Math.random() * 4 - 2;

  		cube.rotation.x = Math.random() * 2 * Math.PI;
  		cube.rotation.y = Math.random() * 2 * Math.PI;
  		cube.rotation.z = Math.random() * 2 * Math.PI;

      const size = 0.35;
  		cube.scale.x = size * (Math.random() + 0.5);
  		cube.scale.y = size * (Math.random() + 0.5);
  		cube.scale.z = size * (Math.random() + 0.5);

      cube.userData.physicsBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3().copy(cube.position),
        quaternion: new CANNON.Quaternion().copy(cube.quaternion),
        shape: new CANNON.Box(new CANNON.Vec3().copy(cube.scale).scale(0.5)),
        angularDamping: 0.001,
      });
      this._physicsWorld.add(cube.userData.physicsBody);

  		cube.userData.velocity = new Vector3();
  		cube.userData.velocity.x = Math.random() * 0.01 - 0.005;
  		cube.userData.velocity.y = Math.random() * 0.01 - 0.005;
  		cube.userData.velocity.z = Math.random() * 0.01 - 0.005;

      cube.userData.angularVelocity = new Vector3();
  		cube.userData.angularVelocity.x = Math.random() * 0.01 - 0.005;
  		cube.userData.angularVelocity.y = Math.random() * 0.01 - 0.005;
  		cube.userData.angularVelocity.z = Math.random() * 0.01 - 0.005;

      cube.userData.health = 1.0;

  		this._room.add( cube );
  	}

    this._focusedMesh = new Mesh(
  		new BoxGeometry( 1, 1, 1, 3, 3, 3 ),
  		new MeshBasicMaterial( { color: 0xff0000, wireframe: true } )
  	);
    this._focusedMesh.visible = false;
  	this._scene.add( this._focusedMesh );

    this._rays = [];
    this._raycaster = new Raycaster();

    this.props.setUpdate(this._updateScene);

    this._effectCopy = new ShaderPass(CopyShader);
    this._effectBloom = new BloomPass(2.0);
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
        this._flyingObject.position.set(0, 0, 0);
        this._scene.add(this._flyingObject);
      }
      else {
        this._flyingObject = this._cameraDolly;

        {
          const geom = new SphereGeometry(0.00005);
          const mesh = new Mesh(geom, new MeshBasicMaterial({ color: 0x00ff00 }));
          mesh.position.set(0, 0, -0.02);
          //this._flyingObject.add(mesh);
        }
      }

      this._flyingObject.userData.physicsBody = new CANNON.Body({
        mass: 100,
        position: new CANNON.Vec3(this._flyingObject.position.x, this._flyingObject.position.y, this._flyingObject.position.z),
        shape: new CANNON.Sphere(0.3),
      });
      this._physicsWorld.add(this._flyingObject.userData.physicsBody);
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
    let accel = 1.5 * (rightFlap ? thresholdAbsMin(rightFlap.value, 0.15) : 0);
    let decel = (leftFlap ? thresholdAbsMin(leftFlap.value, 0.15) : 0);
    if (leftX !== 0 || leftY !== 0 || rightX !== 0 || rightY !== 0 || accel !== 0 || decel !== 0) {
      this._gamepadLastActiveTime = time;
    }

    const leftXKeyboard = 0.3 * ((this._keyboard.isDown('A') ? -1 : 0) + (this._keyboard.isDown('D') ? 1 : 0));
    const leftYKeyboard = 0.3 * ((this._keyboard.isDown('W') ? -1 : 0) + (this._keyboard.isDown('S') ? 1 : 0));
    const rightXKeyboard = 0.05 * ((this._keyboard.isDown('<left>') ? -1 : 0) + (this._keyboard.isDown('<right>') ? 1 : 0));
    const rightYKeyboard = 0.3 * ((this._keyboard.isDown('<up>') ? -1 : 0) + (this._keyboard.isDown('<down>') ? 1 : 0));
    const accelKeyboard = 1.5 * (this._keyboard.isDown('E') ? 1 : 0);
    const decelKeyboard = 0.5 * (this._keyboard.isDown('Q') ? 1 : 0);
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
    pitchInput = -((leftY * 0.3 + (rightY * leftY <= 0 ? 0 : rightY * 0.2)) * (1.0 + 0.7 * accel));
    rollInput = (leftX * 0.8 * (1.0 + 0.5 * accel));
    moveInput = (0.0005 * (1.0 + 2.5 * accel - 2.5 * decel));

    this._gamepadFlyControls.setSpeeds(yawInput * 0.005, pitchInput * 0.005, rollInput * 0.005, moveInput);
    this._gamepadFlyControls.update(timeStep);
    this._flyingObject.position.copy(this._gamepadFlyControlsObject.position);
    this._flyingObject.quaternion.copy(this._gamepadFlyControlsObject.quaternion);
    this._flyingObject.updateMatrixWorld();

    this._flyingObject.userData.physicsBody.position.copy(this._flyingObject.position);
    this._flyingObject.userData.physicsBody.quaternion.copy(this._flyingObject.quaternion);

    this._physicsWorld.step(timeStep);

    this._markers.forEach((marker) => {
      marker.update(timeStep, time);
    });

    const leftStickButton = this._joymapQuery.getButtons('L3');
    const rightStickButton = this._joymapQuery.getButtons('R3');
    const buttonA = this._joymapQuery.getButtons('A');

    const fire = (
      (leftStickButton && leftStickButton.value ? 1.0 : 0.0) ||
      (rightStickButton && rightStickButton.value ? 1.0 : 0.0) ||
      (buttonA && buttonA.value ? 1.0 : 0.0) ||
      (this._keyboard.isDown('<space>') ? 1.0 : 0.0)
    );

    const raySourceOffset = new Vector3(0, -0.02, 0);
    const raySourcePos = this._flyingObject.localToWorld(this._flyingObject.worldToLocal(this._flyingObject.position.clone()).add(raySourceOffset));
    const raySourceQuaternion = (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), 0.01 * Math.PI).multiply(this._flyingObject.quaternion);
    let focusedObject = null;

    {
      const raySourceDirection = new Vector3(0, 0, -1).applyQuaternion(raySourceQuaternion).normalize();
      this._raycaster.set(raySourcePos, raySourceDirection);
      const intersections = this._raycaster.intersectObjects(this._room.children).filter((x) => (x.distance > 0));
      const intersection = intersections[0];
      if (intersection && intersection.object) {
        focusedObject = intersection.object;
      }
    }

    if ((!this._sceneState.nextRayTime || time >= this._sceneState.nextRayTime) && fire) {
      this._sceneState.nextRayTime = time + 300;

      const ray = new LaserRay();
      ray.setColorHex(this.state.rayBaseColor);
      ray.position.copy(raySourcePos);
      ray.quaternion.copy(raySourceQuaternion);

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

      const rayDirection = new Vector3(0, 0, -1).applyQuaternion(ray.quaternion).normalize();
      this._raycaster.set(ray.position, rayDirection);
      //this._scene.add(makeDebugMarker(ray.colorHex, ray.position, '', this._markersIntersections));

      const intersections = this._raycaster.intersectObjects(this._room.children).filter((x) => (x.distance > 0));
      const intersection = intersections[0];
      if (intersection) {
        //this._scene.add(makeDebugMarker(ray.colorHex, intersection.point, '', this._markersIntersections));
        ray.setHitDistance(intersections[0].distance);
      }
      else {
        ray.setHitDistance(10.0);
      }

      ray.update(timeStep);

      if (!ray.visible) {
        this._scene.remove(ray);
        this._rays.splice(i, 1);
        --ic;
        --i;
        continue;
      }

      if (!ray.reflectionRay && ray.state.hitting && intersection && intersection.object) {
        const cube = intersection.object;

        cube.userData.health -= 0.2;
        cube.material.opacity = cube.userData.health;

        const normal = intersection.face.normal.clone().applyQuaternion(cube.quaternion);

        const reflection = rayDirection.clone().reflect(normal).normalize();

        const forceDirection = normal.clone().multiplyScalar(-0.0001);

        cube.userData.physicsBody.applyForce(
          new CANNON.Vec3(forceDirection.x, forceDirection.y, forceDirection.z),
          new CANNON.Vec3(intersection.point.x, intersection.point.y, intersection.point.z)
        );

        const reflectionRay = new LaserRay();
        ray.reflectionRay = reflectionRay;

        const color = new Color(ray.state.colorHex);
        color.lerp(cube.material.color, 0.8);
        color.offsetHSL(0, 0, 0.1);
        reflectionRay.setColorHex(color.getHex());
        //reflectionRay.setColorHex(ray.state.colorHex);

        const pos = intersection.point.clone().addScaledVector(normal, 0.01);

        const qt = new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, -1),
          reflection
        );

        reflectionRay.position.copy(pos);
        reflectionRay.quaternion.copy(qt);

        this._scene.add(reflectionRay);
        this._rays.push(reflectionRay);
      }
    }

    // Keep cubes inside room
		for ( let i = 0; i < this._room.children.length; i ++ ) {
			const cube = this._room.children[ i ];
      if (cube.userData.health <= 0) {
        cube.scale.multiplyScalar(0.8);
      }
      if (cube.scale.x < 0.01) {
        this._room.remove(cube);
        --i;
        continue;
      }

      /*
			cube.userData.velocity.multiplyScalar( 1 - ( 0.001 * timeStep ) );
      cube.userData.angularVelocity.multiplyScalar( 1 - ( 0.001 * timeStep ) );
      const cubePos = cube.position;

			cubePos.add( cube.userData.velocity );
      cube.rotation.x += cube.userData.angularVelocity.x;
			cube.rotation.y += cube.userData.angularVelocity.y;
			cube.rotation.z += cube.userData.angularVelocity.z;

			if ( cubePos.x < - 3 || cubePos.x > 3 ) {
				cubePos.x = THREEMath.clamp( cubePos.x, - 3, 3 );
				cube.userData.velocity.x = - cube.userData.velocity.x;
			}
			if ( cubePos.y < - 3 || cubePos.y > 3 ) {
				cubePos.y = THREEMath.clamp( cubePos.y, - 3, 3 );
				cube.userData.velocity.y = - cube.userData.velocity.y;
			}
			if ( cubePos.z < - 3 || cubePos.z > 3 ) {
				cubePos.z = THREEMath.clamp( cubePos.z, - 3, 3 );
				cube.userData.velocity.z = - cube.userData.velocity.z;
			}
      */

      const cubePos = cube.userData.physicsBody.position;
      if ( cubePos.x < - 3 || cubePos.x > 3 ) {
				cubePos.x = THREEMath.clamp( cubePos.x, - 3, 3 );
				cube.userData.velocity.x = - cube.userData.velocity.x;
			}
			if ( cubePos.y < - 3 || cubePos.y > 3 ) {
				cubePos.y = THREEMath.clamp( cubePos.y, - 3, 3 );
				cube.userData.velocity.y = - cube.userData.velocity.y;
			}
			if ( cubePos.z < - 3 || cubePos.z > 3 ) {
				cubePos.z = THREEMath.clamp( cubePos.z, - 3, 3 );
				cube.userData.velocity.z = - cube.userData.velocity.z;
			}

      cube.position.copy(cubePos);
      cube.quaternion.copy(cube.userData.physicsBody.quaternion);
		}

    if (focusedObject) {
      this._focusedMesh.scale.copy(focusedObject.scale.clone().multiplyScalar(1.5));
      this._focusedMesh.position.copy(focusedObject.position);
      this._focusedMesh.quaternion.copy(focusedObject.quaternion);
      this._focusedMesh.material.color.copy(new Color(0x555555)).lerp(new Color(this.state.rayBaseColor), 0.5 * (Math.sin(time / 200) + 1.0));
      this._focusedMesh.visible = true;
    }
    else {
      this._focusedMesh.visible = false;
    }

    {
      const directionToCenter = this._room.position.clone().sub(this._gamepadFlyControlsObject.position);
      const distance = directionToCenter.length();
      // TODO(@sompylasar): Re-orient to the center when far away.
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

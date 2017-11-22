import React, { Component } from 'react';

import * as dg from 'dis-gui';

import {
  Scene,
  Group,
  Object3D,
  Vector2,
  Vector3,
  Euler,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshBasicMaterial,
  Color,
  Mesh,
  GridHelper,
} from 'three';

import { createJoyMap, createQueryModule } from 'joymap';

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

    const markerMaterial = new MeshBasicMaterial({ color: color });
    markerMaterial.wireframe = true;

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
    this._farPosition = 0.01;
    this._hitDistance = Number.POSITIVE_INFINITY;
    this._finished = false;

    const baseMaterial = new MeshBasicMaterial({
      color: new Color(0x00ff00),
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
    this._rayGroup.scale.z = ((farPosition - nearPosition) / this._rayGeometryLength);

    const hit = (this._farPosition >= this._hitDistance);
    if (hit) {
      this._rayEndMesh.position.z = -this._hitDistance;
    }
    this._rayEndMesh.visible = hit;

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

    this._gamepadFlyControlsObject = new Object3D();
    this._gamepadFlyControls = new GamepadFlyControls(this._gamepadFlyControlsObject);
    this._gamepadFlyControls.movementSpeed = 1.0;
    this._gamepadFlyControls.rollSpeed = 0.0001;

    this._markers = [];

    this._scene = new Scene();
    this._scene.name = 'sompylasarWebsiteVRScene';

    this._cameraDolly = null;

    const gridCellSize = 0.5;
    const gridCells = 20;
    this._grid = new GridHelper(gridCells * gridCellSize, gridCells, 0xffffff, 0xffffff);
    this._scene.add(this._grid);

    this._raySourcePosition = new Vector3(0, 0.3, 0);
    this._raySourceRotation = new Euler(0, 0, 0, 'XYZ');
    this._scene.add(makeDebugMarker(0xffffff, this._raySourcePosition, 'raySourcePosition', this._markers));

    this._rays = [];

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

  componentDidUpdate() {
    this._effectBloom.copyUniforms[ "opacity" ].value = this.state.bloomStrength;
    this._effectFXAA.uniforms.resolution.value = new Vector2(1 / this.props.rendererSize.width, 1 / this.props.rendererSize.height);
  }

  componentWillUnmount() {
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
      //this._cameraDolly.position.z = 0.2;
      this._cameraDolly.position.y = 0.5;
      this._cameraDolly.position.z = 5;
      this._gamepadFlyControlsObject.position.copy(this._cameraDolly.position);
      this._scene.add(this._cameraDolly);

      /*
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
      */

      this._flyingObject = this._cameraDolly;
    }

    this._joymap.poll();
    const leftStick = this._joymapQuery.getSticks('L');
    const rightStick = this._joymapQuery.getSticks('R');
    const leftFlap = this._joymapQuery.getButtons('L2');
    const rightFlap = this._joymapQuery.getButtons('R2');

    if (rightStick) {
      const accel = (rightFlap ? rightFlap.value : 0);
      const decel = (leftFlap ? leftFlap.value : 0);
      this._gamepadFlyControls.moveVector.set(0, 0, -(0.0002 * (1.0 + 2.5 * accel - 2.5 * decel)));
      const leftStickPitch = leftStick.value[1];
      const rightStickPitch = rightStick.value[1];
      this._gamepadFlyControls.setGamepadValues(
        rightStick.value[0],
        -((leftStickPitch * 0.3 + (rightStickPitch * leftStickPitch <= 0 ? 0 : rightStickPitch * 0.2)) * (1.0 + 4.5 * accel)),
        leftStick.value[0] * 0.8 * (1.0 + 2.5 * accel)
      );
      this._gamepadFlyControls.update(timeStep);
      this._flyingObject.position.copy(this._gamepadFlyControlsObject.position);
      this._flyingObject.quaternion.copy(this._gamepadFlyControlsObject.quaternion);
    }
    this._flyingObject.position.x = Math.max(-5, Math.min(5, this._flyingObject.position.x));
    this._flyingObject.position.y = Math.max(0.3, Math.min(5, this._flyingObject.position.y));
    this._flyingObject.position.z = Math.max(-5, Math.min(5, this._flyingObject.position.z));

    this._markers.forEach((marker) => {
      marker.update(timeStep, time);
    });

    /*
    this._raySourceRotation.copy(new Euler(
      -0.40 * Math.PI,// * Math.sin(time / 1000),
      0,
      -0.45 * Math.PI * Math.sin(time / 1000),
      'XYZ'
    ));
    */

    if (!this._sceneState.nextRayTime || time >= this._sceneState.nextRayTime) {
      this._sceneState.nextRayTime = time + 300;

      const ray = new LaserRay();
      //for (let i = 20; i >= 0; --i) { ray.update(timeStep); }
      ray.setColorHex(this.state.rayBaseColor);
      ray.setHitDistance(2.0);
      //ray.position.copy(this._raySourcePosition);
      //ray.rotation.copy(this._raySourceRotation);
      this._flyingObject.updateMatrixWorld();
      const raySourceOffset = new Vector3(0, -0.13, 0);
      const pos = this._flyingObject.localToWorld(this._flyingObject.worldToLocal(this._flyingObject.position.clone()).add(raySourceOffset));
      ray.position.copy(pos);
      ray.quaternion.copy(this._flyingObject.quaternion);
      this._scene.add(ray);
      this._rays.push(ray);
    }
    else {
      for (let ic = this._rays.length, i = 0; i < ic; ++i) {
        const ray = this._rays[i];
        ray.update(timeStep);
        if (!ray.visible) {
          this._scene.remove(ray);
          this._rays.splice(i, 1);
          --ic;
          --i;
        }
      }
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

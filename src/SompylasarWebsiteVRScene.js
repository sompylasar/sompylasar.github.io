import { Component } from 'react';

import {
  Scene,
  Group,
  Object3D,
  Vector3,
  Euler,
  Matrix4,
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  ShaderMaterial,
  Color,
  Mesh,
  FrontSide,
  BackSide,
  AdditiveBlending,
} from 'three';

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

    const baseMaterial = new MeshBasicMaterial({ color: 0x00ff00 });

    const radius = 0.005;
    const baseLength = 0.5;

    // CylinderGeometry(bottomRadius, topRadius, height, segmentsRadius, segmentsHeight, openEnded )
    const rayGeometry = new CylinderGeometry(radius * 0.7, radius, baseLength, 10, 1, false);
    // Translate the cylinder geometry so that the desired point within the geometry is now at the origin.
    // https://stackoverflow.com/a/12835749/1346510
    rayGeometry.translate(0, baseLength / 2, 0);

    const rayMesh = new Mesh(rayGeometry, baseMaterial);
    rayMesh.name = 'rayMesh';

    this._cameraWorldPosition = new Vector3();
    this._glowWorldPosition = new Vector3();
    this._viewVector = new Vector3();

    const glowMaterial = new ShaderMaterial({
      uniforms: {
        c: { type: 'f', value: 1.0 },
        p: { type: 'f', value: 1.0 },
        glowColor: { type: 'c', value: new Color(0x00ff99) },
        viewVector: { type: 'v3', value: this._viewVector },
      },
      vertexShader: (
        `
          uniform vec3 viewVector;
          uniform float c;
          uniform float p;
          varying float intensity;
          void main()
          {
            vec3 vNormal = normalize( normalMatrix * normal );
        	  vec3 vNormel = normalize( normalMatrix * viewVector );
        	  intensity = pow( c - dot(vNormal, vNormel), p );

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `
      ),
      fragmentShader: (
        `
          uniform vec3 glowColor;
          varying float intensity;
          void main()
          {
          	vec3 glow = glowColor * intensity;
            gl_FragColor = vec4( glow, 1.0 );
          }
        `
      ),
      side: FrontSide,
      blending: AdditiveBlending,
      transparent: true,
    });
    glowMaterial.name = 'glowMaterial';
    this._glowMaterial = glowMaterial;

    const glowDebugMaterial = new MeshBasicMaterial({ color: glowMaterial.uniforms.glowColor.value });
    const glowMesh = new Mesh(rayGeometry, glowMaterial);
    glowMesh.name = 'glowMesh';
    glowMesh.scale.x = 3.25;
    glowMesh.scale.y = 1.0;
    glowMesh.scale.z = 3.25;
    this._glowMesh = glowMesh;

    this._rayGroup = new Group();
    this._rayGroup.name = 'rayGroup';
    //this._rayGroup.add(rayMesh);
    this._rayGroup.add(glowMesh);

    this.add(this._rayGroup);
  }

  setRayLength(lengthRatio) {
    this._rayGroup.scale.y = lengthRatio;
  }

  updateRayGlow(camera) {
    // TODO(@sompylasar): This `updateMatrixWorld` should happen automatically.
    camera.traverseAncestors((obj) => { obj.updateMatrixWorld(true); });
    this._glowMesh.traverseAncestors((obj) => { obj.updateMatrixWorld(true); });

    this._cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    this._glowWorldPosition.setFromMatrixPosition(this._glowMesh.matrixWorld);

    this._viewVector.subVectors(this._cameraWorldPosition, this._glowWorldPosition);
    //this._viewVector.set(0,-1,0);
  }
}


class SompylasarWebsiteVRScene extends Component {
  constructor(props) {
    super(props);

    this._sceneState = this.props.restoreSceneState() || {
      time: 0,
    };

    // "Saving" a reference of the mutable state object once is enough for StatePersister.
    this.props.saveSceneState(this._sceneState);

    this._markers = [];

    this._scene = new Scene();
    this._scene.name = 'sompylasarWebsiteVRScene';

    this._cameraDolly = null;

    //this._scene.add(makeDebugMarker(0xffffff, new Vector3(0, 0, 0), 'zeroMarker', this._markers));

    this._ray = new LaserRay();
    this._ray.name = 'ray';
    //this._ray.add(makeDebugMarker(0xff0000, new Vector3(0, 0, 0), 'rayPositionMarker', this._markers));
    this._scene.add(this._ray);

    this.props.setUpdate(this._updateScene);
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
      this._cameraDolly.position.z = 0.2;
      this._scene.add(this._cameraDolly);
    }

    this._markers.forEach((marker) => {
      marker.update(timeStep, time);
    });

    this._ray.position.copy(new Vector3(0, 0, 0));

    /*
    this._ray.rotation.copy(new Euler(
      -0.45 * Math.PI * Math.sin(time / 1000),
      0,
      -0.45 * Math.PI * Math.sin(time / 1000),
      'XYZ'
    ));
    */

    this._ray.rotation.copy(new Euler(
      -0.55 * Math.PI,
      0,
      0.15 * Math.PI,//Math.sin(time / 1000) * 0.15 * Math.PI,
      //0.15 * Math.PI,
      'XYZ'
    ));

    //this._ray.setRayLength(Math.sin(time / 1000));

    this._ray.updateRayGlow(camera);

    return this._scene;
  }

  render() {
    return null;
  }
}

export default SompylasarWebsiteVRScene;

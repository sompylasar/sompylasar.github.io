import React, { Component } from 'react';
import { Scene, Entity } from 'aframe-react';
import 'aframe-environment-component';
import 'aframe-extras';
import 'fpsmeter';

import ReactChildren from './ReactChildren';


const THREE = window.THREE;


// http://codeincomplete.com/posts/javascript-game-foundations-the-game-loop/
function createRunLoop(update, render, fpsmeter) {
  function now() {
    return (window.performance && window.performance.now ? window.performance.now() : new Date().getTime());
  }

  let _lastTimestamp;
  let _dt = 0;
  let _step = 1000 / 90;
  let _slowFactor = 1.0;
  let _slowStep = _slowFactor * _step;
  let _timer;

  function frame() {
    if (fpsmeter) { fpsmeter.tickStart(); }
    const nowTimestamp = now();
    _dt = _dt + Math.min(1000, (nowTimestamp - _lastTimestamp));
    while (_dt > _slowStep) {
      _dt = _dt - _slowStep;
      update(_step);
    }
    render(_dt / _slowFactor);
    _lastTimestamp = nowTimestamp;
    if (fpsmeter) { fpsmeter.tick(); }
    _timer = requestAnimationFrame(frame);
  }

  return {
    start: () => { _lastTimestamp = now(); _timer = requestAnimationFrame(frame); },
    setFps: (fps) => { _step = 1000 / fps; _slowStep = _slowFactor * _step; },
    setSlow: (slowFactor) => { _slowFactor = slowFactor; },
    stop: () => { cancelAnimationFrame(_timer); }
  };
}


class SompylasarWebsiteVRContent extends Component {
  constructor(...args) {
    super(...args);

    this._initialState = {
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      cameraPos: { x: 0, y: 2.5, z: 0 },
      cameraRot: { x: 0, y: 0, z: 0 },
    };

    let state = {};
    try {
      state = JSON.parse(window.sessionStorage.getItem('SompylasarWebsiteVRContent.state')) || {};
    }
    catch (ex) {}

    this._state = { ...this._initialState, ...state };
    this.state = this._state;

    this._fpsmeter = null;
    this._runLoop = null;
  }

  _update = (step) => {
    const state = this._state;
    state.p0 = state.p0 + 1 / step;
    state.p1 = 0.02 * (state.p0);
    state.p2 = -0.01 * (state.p0);
    state.p3 = state.p3 + 5 / step;
  }

  _render = (dt) => {
    this.setState((state) => ({ ...state, ...this._state }));
  }

  _onSceneRef = (scene) => {
    this._scene = scene;
    const camera = this._scene.querySelector('[camera]');
    if (camera) {
      camera.setAttribute('position', this._state.cameraPos);
      camera.setAttribute('rotation', this._state.cameraRot);
    }
  }

  _onBeforeUnload = () => {
    if (this._scene) {
      const camera = this._scene.querySelector('[camera]');
      if (camera) {
        this._state.cameraPos = camera.getAttribute('position', this._state.cameraPos);
        this._state.cameraRot = camera.getAttribute('rotation', this._state.cameraRot);
      }
    }
    window.sessionStorage.setItem('SompylasarWebsiteVRContent.state', JSON.stringify(this._state));
  }

  componentDidMount() {
    if (window.location.port && parseInt(window.location.port, 10) !== 80) {
      this._fpsmeter = new window.FPSMeter();
    }
    this._runLoop = createRunLoop(this._update, this._render, this._fpsmeter);
    this._runLoop.start();

    window.addEventListener('beforeunload', this._onBeforeUnload);
  }

  componentWillUnmount() {
    this._runLoop.stop();
    this._fpsmeter.destroy();

    document.body.classList.remove('a-body');
    document.documentElement.classList.remove('a-body');

    window.removeEventListener('beforeunload', this._onBeforeUnload);
    this._onBeforeUnload();
  }

  render() {
    const state = this.state;

    const centerPos = new THREE.Vector3(0, 3, -5);

    const lights = [
      { color: '#fff', distance: 1.5, vector: new THREE.Vector3(
        Math.cos(state.p1 * Math.PI * 1.0),
        Math.sin(state.p2 * Math.PI * 1.0),
        Math.sin(state.p2 * Math.PI * 2.0)
      ), },
      { color: '#f00', distance: 1.5, vector: new THREE.Vector3(
        Math.cos(state.p2 * Math.PI * 1.0),
        Math.sin(state.p2 * Math.PI * 3.0),
        Math.sin(state.p1 * Math.PI * 2.0)
      ), },
      { color: '#0f0', distance: 1.5, vector: new THREE.Vector3(
        Math.cos(state.p2 * Math.PI * 1.0 + 0.3 * Math.PI),
        Math.sin(state.p2 * Math.PI * 3.0 + 0.2 * Math.PI),
        Math.sin(state.p1 * Math.PI * 2.0)
      ), },
    ];

    return (
      <Scene _ref={this._onSceneRef}>
        <Entity camera="active: true" look-controls wasd-controls>
          <Entity
            cursor
            position="0 0 -1"
            geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03;"
            material="color: #000; opacity: 0.5; emissive: #fff; emissiveIntensity: 0.5;"

          />
          <Entity
            light={{ type: 'point', intensity: 0.5 }}
            position="0 0 -1"
          />
        </Entity>
        <Entity
          geometry={{ primitive: 'box' }}
          material={{
            color: '#0a0e23',
            metalness: 0.8,
            normalMap: document.querySelector('.sompylasar-website-avatar__image'),
          }}
          position={centerPos}
          rotation={{ x: 30, y: (0.6 * state.p1) / Math.PI * 180 + 30, z: 30 }}
        />
        {lights.map((light) => (
          <ReactChildren>
            <Entity
              geometry={{ primitive: 'sphere', radius: 0.04 }}
              material={{ color: light.color, metalness: 1, emissive: light.color, emissiveIntensity: 2.0 }}
              position={centerPos.clone().add(light.vector.multiplyScalar(light.distance))}
            />
            <Entity
              light={{
                type: 'point',
                intensity: 1.6,
                color: light.color,
              }}
              position={centerPos.clone().add(light.vector.multiplyScalar(light.distance))}
            />
          </ReactChildren>
        ))}
        <Entity
          primitive="a-sky"
          color="#000"
        />
        {/*<Entity
          environment={{ preset: 'osiris', dressing: 'none' }}
        />*/}
      </Scene>
    );
  }
}


export default SompylasarWebsiteVRContent;

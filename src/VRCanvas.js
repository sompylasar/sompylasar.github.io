import React, { Component } from 'react';

import 'webvr-polyfill';
import {
  WebVRManager,
  State as WebVRManagerState,
} from 'webvr-ui';

import {
  WebGLRenderer,
  PerspectiveCamera,
} from 'three';

import {
  StereoEffect,
} from './StereoEffect';

import preventDefaultForEvent from './preventDefaultForEvent';
import { createDisplayController } from './DisplayController';
import { FPSMeter } from './FPSMeter';


class WindowVRDisplay {
  constructor(window) {
    this.requestAnimationFrame = window.requestAnimationFrame.bind(window);
    this.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  }
}


const vrFrameData = ('VRFrameData' in window ? new window.VRFrameData() : null);

function updateCameraFromVRDisplay(camera, vrDisplay) {
  let pose;
  if (vrDisplay.getFrameData && vrFrameData) {
    vrDisplay.getFrameData(vrFrameData);
    pose = vrFrameData.pose;
  }
  else if (vrDisplay.getPose) {
    pose = vrDisplay.getPose();
  }

  if (pose && pose.orientation !== null) {
    camera.quaternion.fromArray(pose.orientation);
  }

  if (pose && pose.position !== null) {
    camera.position.fromArray(pose.position);
  }
  else {
    camera.position.set(0, 0, 0);
  }
}


class VRCanvas extends Component {
  constructor(props) {
    super(props);

    this._fpsmeter = null;

    this._windowDisplay = new WindowVRDisplay(window);

    this._displayController = createDisplayController();

    this._webvrManagerState = null;
    this._webvrManager = new WebVRManager();
    this._webvrManager.checkDisplays();
    this._webvrManager.addListener('change', (state) => {
      this._webvrManagerState = state;
      this.setState(this._getState());
    });

    this._scene = null;

    if (this.props.isDebug) {
      window.THREE = require('three');
    }

    this._glRenderer = new WebGLRenderer({ antialias: true });
    this._glRenderer.setPixelRatio(window.devicePixelRatio);

    this._camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
    this._camera.name = 'vrCanvasCamera';

    this._stereoRenderer = new StereoEffect(this._glRenderer);

    this.state = this._getState();

    this._displayController.setRender(this._onRender);

    window.addEventListener('resize', this._onContainerResize);
  }

  componentDidMount() {
    this._setupFpsMeter(this.props.isDebug);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.isDebug !== this.props.isDebug || prevState.isPresenting !== this.state.isPresenting) {
      this._setupFpsMeter(this.props.isDebug);
    }
    if (prevState.presentingDisplay !== this.state.presentingDisplay) {
      this._displayController.setDisplay(this.state.presentingDisplay);
    }
    if (prevState.isPresenting !== this.state.isPresenting && this.state.isPresenting) {
      this._onContainerResize();
    }
    if (
      this.props.autoPresent &&
      !this._autoPresentTriggered &&
      this.state.isReadyToPresent &&
      !this.state.isPresenting
    ) {
      this._autoPresentTriggered = true;
      this._requestPresent();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onContainerResize);

    this._displayController.setDisplay(null);
    this._displayController.setRender(null);
    this._setupFpsMeter(false);

    this._webvrManager.remove();
    this._webvrManager = null;
  }

  _onContainerRef = (containerEl) => {
    if (containerEl) {
      this._containerEl = containerEl;
      containerEl.appendChild(this._glRenderer.domElement);
      this._onContainerResize();
    }
    else if (this._containerEl) {
      this._containerEl.removeChild(this._glRenderer.domElement);
      this._containerEl = null;
    }
  }

  _onContainerResize = () => {
    if (this._containerEl) {
      const rect = this._containerEl.getBoundingClientRect();
      const width = (rect.right - rect.left);
      const height = (rect.bottom - rect.top);

      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();

      this._glRenderer.setSize(width, height);
      this._stereoRenderer.setSize(width, height);
    }
  }

  _requestPresent = () => {
    Promise.resolve()
      .then(() => {
        if (!this._webvrManager.defaultDisplay) {
          throw new Error('No defaultDisplay, should fall back to fullscreen.');
        }
        return this._webvrManager.enterVR(this._webvrManager.defaultDisplay, this._glRenderer.domElement);
      })
      .catch(() => {
        return this._webvrManager.enterFullscreen(this._containerEl);
      })
      .then(() => {
        this.setState(this._getState());
      })
      .catch(() => {
        // TODO(@sompylasar): Move to error state.
      });
  }

  _requestExitPresent = () => {
    const initialState = this._webvrManagerState;
    Promise.resolve()
      .then(() => (
        initialState === WebVRManagerState.PRESENTING
          ? this._webvrManager.exitVR(this._webvrManager.defaultDisplay)
          : this._webvrManager.exitFullscreen()
      ))
      .then(() => {
        this.setState(this._getState());
      })
      .catch(() => {
        // TODO(@sompylasar): Move to error state.
      });
  }

  _getState() {
    return {
      isReadyToPresent: (
        this._webvrManagerState === WebVRManagerState.READY_TO_PRESENT ||
        this._webvrManagerState === WebVRManagerState.ERROR_NO_PRESENTABLE_DISPLAYS
      ),
      isPresenting: (
        this._webvrManagerState === WebVRManagerState.PRESENTING ||
        this._webvrManagerState === WebVRManagerState.PRESENTING_FULLSCREEN
      ),
      presentingDisplay: (
        this._webvrManagerState === WebVRManagerState.PRESENTING
          ? this._webvrManager.defaultDisplay
          : (this._webvrManagerState === WebVRManagerState.PRESENTING_FULLSCREEN
            ? this._windowDisplay
            : null
          )
      ),
    };
  }

  _setupFpsMeter(isDebug) {
    if (isDebug && this.state.isPresenting) {
      if (!this._fpsmeter) {
        this._fpsmeter = new FPSMeter(this._containerEl);
      }
    }
    else if (this._fpsmeter) {
      this._fpsmeter.destroy();
      this._fpsmeter = null;
    }
    this._displayController.setFpsMeter(this._fpsmeter);
  }

  _onRender = () => {
    const presentingDisplay = this.state.presentingDisplay;
    if (!presentingDisplay) { return; }

    if (this._scene) {
      if (this.props.forceMono) {
        this._glRenderer.render(this._scene, this._camera);
      }
      else {
        this._stereoRenderer.render(this._scene, this._camera);
      }
    }

    if (presentingDisplay.submitFrame) {
      presentingDisplay.submitFrame();
    }
  }

  _setUpdate = (updateScene) => {
    if (updateScene) {
      this._displayController.setUpdate((timeStep) => {
        const presentingDisplay = this.state.presentingDisplay;
        if (!presentingDisplay) { return; }

        updateCameraFromVRDisplay(this._camera, presentingDisplay);

        this._scene = updateScene(timeStep, this._camera);

        if (this.props.isDebug && window.scene !== this._scene) {
          window.scene = this._scene;
        }
      });
    }
    else {
      this._displayController.setUpdate(null);
    }
  }

  render() {
    const {
      isReadyToPresent,
      isPresenting,
    } = this.state;

    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: (isPresenting ? 'block' : 'none'),
        }}
        onMouseDown={preventDefaultForEvent}
        onTouchStart={preventDefaultForEvent}
        ref={this._onContainerRef}
      >
        {this.props.render({
          isReadyToPresent: isReadyToPresent,
          isPresenting: isPresenting,
          requestPresent: this._requestPresent,
          requestExitPresent: this._requestExitPresent,
          setUpdate: this._setUpdate,
        })}
      </div>
    );
  }
}


export default VRCanvas;

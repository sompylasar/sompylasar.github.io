import React, { Component } from 'react';

import 'webvr-polyfill';
import {
  WebVRManager,
  State as WebVRManagerState,
} from 'webvr-ui/build/webvr-ui.js';

import {
  WebGLRenderer,
  PerspectiveCamera,
} from 'three';

import { StereoRendererWithEffectsComposer } from './three/StereoRendererWithEffectsComposer';

import preventDefaultForEvent from './preventDefaultForEvent';
import { createDisplayController } from './displayController';
import { FPSMeter } from './fpsmeter';


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

    this._glRenderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
    });
    this._glRenderer.autoClear = false;
    this._glRenderer.setPixelRatio(window.devicePixelRatio);

    this._camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 100 );
    this._camera.name = 'vrCanvasCamera';

    this._stereoRenderer = new StereoRendererWithEffectsComposer( this._glRenderer );

    this._postProcessingPasses = [];

    this.state = this._getState({
      isDebug: !!this.props.isDebug,
      isMono: !!this.props.isMono,
      slowFactor: 1.0,
    });

    this._displayController.setRender(this._onRender);

    window.addEventListener('resize', this._onContainerResize);
  }

  componentDidMount() {
    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.isDebug !== this.state.isDebug) {
      if (this.state.isDebug) {
        window.THREE = require('three');
        window.scene = this._scene;
      }
      else {
        delete window.THREE;
        delete window.scene;
      }
    }
    if (prevState.isDebug !== this.state.isDebug || prevState.isPresenting !== this.state.isPresenting) {
      this._setupFpsMeter(this.state.isDebug);
    }
    if (prevState.presentingDisplay !== this.state.presentingDisplay) {
      this._displayController.setDisplay(this.state.presentingDisplay);
    }
    if (prevState.slowFactor !== this.state.slowFactor) {
      this._displayController.setSlow(this.state.slowFactor);
    }
    if (prevState.isPresenting !== this.state.isPresenting && this.state.isPresenting) {
      this._onContainerResize();
    }
    if (prevState.isMono !== this.state.isMono) {
      this._stereoRenderer.setMono(this.state.isMono);
      // TODO(@sompylasar): We may need to reset `this._webvrManager` here to enable VR after stereo has been enabled.
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

      const rendererSize = this._glRenderer.getSize();
      if (width > 0 && height > 0 && (rendererSize.width !== width || rendererSize.height !== height)) {
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

        this._glRenderer.setSize(width, height);
        this._stereoRenderer.setSize(width, height);

        this.setState({ rendererSize: rendererSize });
      }
    }
  }

  _requestPresent = () => {
    Promise.resolve()
      .then(() => {
        if (!this._webvrManager.defaultDisplay) {
          throw new Error('No defaultDisplay, should fall back to fullscreen.');
        }
        if (this.state.isMono) {
          throw new Error('Forced isMono, should fall back to fullscreen.');
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

  _getState(initialState) {
    return {
      isDebug: (initialState ? initialState.isDebug : this.state.isDebug),
      isMono: (initialState ? initialState.isMono : this.state.isMono),
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
      rendererSize: this._glRenderer.getSize(),
      slowFactor: (initialState ? initialState.slowFactor : this.state.slowFactor),
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
      this._stereoRenderer.render(this._scene, this._camera);
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

        if (this.state.isDebug) {
          if (window.scene !== this._scene) {
            window.scene = this._scene;
          }
        }
      });
    }
    else {
      this._displayController.setUpdate(null);
    }
  }

  _setPostProcessing = (postProcessingPasses) => {
    this._stereoRenderer.setPostProcessing(postProcessingPasses);
  }

  _setDebug = (isDebug) => {
    this.setState({ isDebug: !!isDebug });
  }

  _setMono = (isMono) => {
    this.setState({ isMono: !!isMono });
  }

  _setSlow = (slowFactor) => {
    this.setState({ slowFactor: slowFactor });
  }

  render() {
    const {
      isReadyToPresent,
      isPresenting,
      isDebug,
      isMono,
      rendererSize,
      slowFactor,
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
          setPostProcessing: this._setPostProcessing,
          setDebug: this._setDebug,
          setMono: this._setMono,
          setSlow: this._setSlow,
          isDebug: isDebug,
          isMono: isMono,
          rendererSize: rendererSize,
          slowFactor: slowFactor,
        })}
      </div>
    );
  }
}


export default VRCanvas;

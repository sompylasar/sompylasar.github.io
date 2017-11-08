import { Component } from 'react';

import {
  WebVRManager,
  State as WebVRManagerState,
} from 'webvr-ui';


class VRStateManager extends Component {
  constructor(...args) {
    super(...args);

    this._sourceCanvas = null;

    this._webvrManager = new WebVRManager();
    this._webvrManager.checkDisplays();
    this._webvrManagerState = null;
    this._webvrManager.addListener('change', (state) => {
      this._webvrManagerState = state;
      this.forceUpdate();
    });
  }

  componentDidMount() {
    this._sourceCanvas = null;  // TODO(@sompylasar): Find the canvas.
  }

  componentWillUnmount() {
    this._webvrManager.remove();
    this._webvrManager = null;

    this._sourceCanvas = null;
  }

  _requestPresentVR = () => {
    Promise.resolve()
      .then(() => {
        return this._webvrManager.enterVR(this._webvrManager.defaultDisplay, this._sourceCanvas);
      })
      .catch(() => {
        return this._webvrManager.enterFullscreen(this._sourceCanvas);
      })
      .then(() => {
        this.props.resetState();
        this.forceUpdate();
      })
      .catch(() => {});
  }

  _requestExitVR = () => {
    const initialState = this._webvrManagerState;
    Promise.resolve()
      .then(() => (
        initialState === WebVRManagerState.PRESENTING
          ? this._webvrManager.exitVR(this._webvrManager.defaultDisplay)
          : this._webvrManager.exitFullscreen()
      ))
      .catch(() => {})
      .then(() => {
        this.props.resetState();
        this.forceUpdate();
      })
      .catch(() => {});
  }

  render() {
    return this.props.render({
      isReadyToPresentVR: (
        this._webvrManagerState === WebVRManagerState.READY_TO_PRESENT
      ),
      isPresentingVR: (
        this._webvrManagerState === WebVRManagerState.PRESENTING ||
        this._webvrManagerState === WebVRManagerState.PRESENTING_FULLSCREEN
      ),
      display: (
        this._webvrManagerState === WebVRManagerState.PRESENTING
          ? this._webvrManager.defaultDisplay
          : (this._webvrManagerState === WebVRManagerState.PRESENTING_FULLSCREEN
            ? window
            : null
          )
      ),
      requestPresentVR: this._requestPresentVR,
      requestExitVR: this._requestExitVR,
    });
  }
}


export default VRStateManager;

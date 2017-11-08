import React, { Component } from 'react';

import { FPSMeter } from './fpsmeter';

import preventDefaultForEvent from './preventDefaultForEvent';

import { createDisplayController } from './displayController';

import SompylasarWebsiteVRContent from './SompylasarWebsiteVRContent';


class SompylasarWebsiteVRScene extends Component {
  constructor(props) {
    super(props);

    this._displayController = createDisplayController();
    this._fpsmeter = null;
  }

  componentDidMount() {
    this._updateFromProps(this.props);
  }

  componentDidUpdate() {
    this._updateFromProps(this.props);
  }

  componentWillUnmount() {
    this._updateFromProps({
      isDebug: false,
      display: null,
    });
  }

  _updateFromProps(props) {
    if (props.isDebug) {
      if (!this._fpsmeter) {
        this._fpsmeter = new FPSMeter();
      }
    }
    else if (this._fpsmeter) {
      this._fpsmeter.destroy();
      this._fpsmeter = null;
    }
    this._displayController.setFpsMeter(this._fpsmeter);
    this._displayController.setDisplay(props.display);
  }

  render() {
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
        }}
        onMouseDown={preventDefaultForEvent}
        onTouchStart={preventDefaultForEvent}
      >
        <SompylasarWebsiteVRContent
          displayController={this._displayController}
          saveState={this.props.saveState}
          restoreState={this.props.restoreState}
        />
      </div>
    );
  }
}


export default SompylasarWebsiteVRScene;

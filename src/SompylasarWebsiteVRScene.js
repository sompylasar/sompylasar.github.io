import 'aframe';
import React, { Component } from 'react';

import preventDefaultForEvent from './preventDefaultForEvent';

import SompylasarWebsiteVRContent from './SompylasarWebsiteVRContent';


class SompylasarWebsiteVRScene extends Component {
  render() {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
        }}
        onMouseDown={preventDefaultForEvent}
        onTouchStart={preventDefaultForEvent}
      >
        <SompylasarWebsiteVRContent />
      </div>
    );
  }
}


export default SompylasarWebsiteVRScene;

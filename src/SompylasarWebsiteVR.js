import 'aframe';
import React, { Component } from 'react';
import { Entity, Scene } from 'aframe-react';


function preventDefaultForEvent(event) {
  event.preventDefault();
}


class SompylasarWebsiteVR extends Component {
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
        <Scene>
          <Entity geometry={{primitive: 'box'}} material={{color: 'red'}} position={{x: 0, y: 0, z: -5}}/>
          <Entity particle-system={{preset: 'snow'}}/>
          <Entity light={{type: 'point'}}/>
          <Entity text={{value: 'Hello, WebVR!'}}/>
        </Scene>
      </div>
    );
  }
}

export default SompylasarWebsiteVR;

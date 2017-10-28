import React from 'react';

import SompylasarWebsiteVRScene from './SompylasarWebsiteVRScene';
import SompylasarWebsiteVRToggle from './SompylasarWebsiteVRToggle';


const SompylasarWebsiteVR = () => (
  <SompylasarWebsiteVRToggle render={({ isVR }) => (isVR && <SompylasarWebsiteVRScene />)} />
);


export default SompylasarWebsiteVR;

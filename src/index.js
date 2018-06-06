import React from 'react';
import ReactDOM from 'react-dom';

import SompylasarWebsiteVRRoot from './SompylasarWebsiteVRRoot';


const isDebugPort = (!!window.location.port && parseInt(window.location.port, 10) !== 80);
const isDebugQueryString = /(^|[?&])debug([=]|$)/i.test(window.location.search);
const isDebug = (isDebugPort || isDebugQueryString);

const rootEl = document.getElementById('sompylasar-website-vr');
if (rootEl) {
  ReactDOM.render(<SompylasarWebsiteVRRoot isDebug={isDebug} />, rootEl);
}

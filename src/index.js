import React from 'react';
import ReactDOM from 'react-dom';

import SompylasarWebsiteVRRoot from './SompylasarWebsiteVRRoot';


// NOTE(@sompylasar): Disable debug mode by port on local (non-production). Closer to production by default.
// NOTE(@sompylasar): Keeping the debug mode by port code in place for quick re-enabling if needed.
const isDebugPort = false && (!!window.location.port && parseInt(window.location.port, 10) !== 80);
const isDebugQueryString = /(^|[?&])debug([=]|$)/i.test(window.location.search);
const isDebug = (isDebugPort || isDebugQueryString);

const rootEl = document.getElementById('sompylasar-website-vr');
if (rootEl) {
  ReactDOM.render(<SompylasarWebsiteVRRoot isDebug={isDebug} />, rootEl);
}

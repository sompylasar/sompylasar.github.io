import React from 'react';
import ReactDOM from 'react-dom';

import SompylasarWebsiteVR from './SompylasarWebsiteVR';

const rootEl = document.getElementById('sompylasar-website-vr');
const enterButtonEl = document.getElementById('sompylasar-website-enter-vr');

function checkVR() {
  return /^[#]?vr$/.test(window.location.hash);
}

let rootComponent;
function render() {
  const isVR = checkVR();
  if (isVR && rootEl && !rootComponent) {
    rootComponent = ReactDOM.render(<SompylasarWebsiteVR />, rootEl);
  }
  else if (!isVR && rootEl && rootComponent) {
    ReactDOM.unmountComponentAtNode(rootEl);
    rootComponent = null;
    document.body.classList.remove('a-body');
    document.documentElement.classList.remove('a-body');
  }
  rootEl.style.display = (isVR ? '' : 'none');
}

window.addEventListener('load', () => {
  render();
});
window.addEventListener('hashchange', () => {
  render();
});

if (enterButtonEl) {
  enterButtonEl.style.cursor = 'pointer';
  enterButtonEl.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.hash = (checkVR() ? '' : 'vr');
  });
}

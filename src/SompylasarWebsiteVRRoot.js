import React from 'react';

import SessionStateSaver from './SessionStateSaver';
import VRStateManager from './VRStateManager';
import ReactChildren from './ReactChildren';

import SompylasarWebsiteVRAvatarToggle from './SompylasarWebsiteVRAvatarToggle';
import SompylasarWebsiteVRScene from './SompylasarWebsiteVRScene';


const SompylasarWebsiteVRRoot = ({ isDebug }) => (
  <SessionStateSaver
    storageKey={'SompylasarWebsiteVRRoot.state'}
    render={({ saveState, restoreState, resetState }) => (
      <VRStateManager
        render={({
          isReadyToPresentVR,
          isPresentingVR,
          display,
          requestPresentVR,
          requestExitVR,
        }) => (
          <ReactChildren>
            <SompylasarWebsiteVRAvatarToggle
              isReadyToPresentVR={isReadyToPresentVR}
              isPresentingVR={isPresentingVR}
              onEnterVRRequested={requestPresentVR}
              onExitVRRequested={requestExitVR}
            />
            {isPresentingVR && (
              <SompylasarWebsiteVRScene
                isDebug={isDebug}
                display={display}
                saveState={saveState}
                restoreState={restoreState}
              />
            )}
          </ReactChildren>
        )}
        resetState={resetState}
      />
    )}
  />
);


export default SompylasarWebsiteVRRoot;

import React from 'react';

import StatePersister from './StatePersister';
import VRCanvas from './VRCanvas';
import ReactChildren from './ReactChildren';

import SompylasarWebsiteVRAvatarToggle from './SompylasarWebsiteVRAvatarToggle';
import SompylasarWebsiteVRScene from './SompylasarWebsiteVRScene';


const SompylasarWebsiteVRRoot = ({ isDebug }) => (
  <StatePersister
    storageKey={'SompylasarWebsiteVRRoot.state'}
    render={({ saveState, restoreState, resetState }) => (
      <VRCanvas
        isDebug={isDebug}
        autoPresent={isDebug}
        forceMono={isDebug}
        render={({
          isReadyToPresent,
          isPresenting,
          requestPresent,
          requestExitPresent,
          setUpdate,
        }) => (
          <ReactChildren>
            <SompylasarWebsiteVRAvatarToggle
              isReadyToPresent={isReadyToPresent}
              isPresenting={isPresenting}
              requestPresent={requestPresent}
              requestExitPresent={requestExitPresent}
            />
            {isPresenting && (
              <SompylasarWebsiteVRScene
                saveSceneState={saveState}
                restoreSceneState={restoreState}
                setUpdate={setUpdate}
              />
            )}
          </ReactChildren>
        )}
      />
    )}
  />
);


export default SompylasarWebsiteVRRoot;

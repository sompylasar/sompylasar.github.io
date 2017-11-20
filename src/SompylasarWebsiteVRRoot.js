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
        isMono={isDebug}
        autoPresent={isDebug}
        render={({
          isReadyToPresent,
          isPresenting,
          requestPresent,
          requestExitPresent,
          setUpdate,
          setPostProcessing,
          setDebug,
          setMono,
          setSlow,
          isDebug,
          isMono,
          rendererSize,
          slowFactor,
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
                setPostProcessing={setPostProcessing}
                setDebug={setDebug}
                setMono={setMono}
                setSlow={setSlow}
                isDebug={isDebug}
                isMono={isMono}
                rendererSize={rendererSize}
                slowFactor={slowFactor}
              />
            )}
          </ReactChildren>
        )}
      />
    )}
  />
);


export default SompylasarWebsiteVRRoot;

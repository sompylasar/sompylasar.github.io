/**
 * @author sompylasar
 * @author owntheweb / https://rawgit.com/owntheweb/three.js/dev/examples/vr_effect_composer_stereo_camera.html
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author arodic / http://aleksandarrodic.com/
 * @author fonserbc / http://fonserbc.github.io/
 */

import {
	StereoCamera,
} from 'three';

import { EffectComposer } from './EffectComposer';
import { RenderPass } from './RenderPass';


export const StereoRendererWithEffectsComposer = function ( renderer ) {

	const _stereo = new StereoCamera();
	_stereo.aspect = 0.5;

	const _composer = new EffectComposer( renderer, undefined );
	const _renderPass = new RenderPass( undefined, undefined );
  _composer.addPass(_renderPass);

	let _isMono = false;
	let _postProcessingPasses = [];


	this.setEyeSeparation = function ( eyeSep ) {

		_stereo.eyeSep = eyeSep;

	};

	this.setSize = function ( width, height ) {

		renderer.setSize( width, height );
    _composer.setSize( width, height );

	};

	this.setMono = function ( isMono ) {

		_isMono = isMono;

	};

	this.setPostProcessing = function ( postProcessingPasses ) {

		if ( postProcessingPasses !== _postProcessingPasses ) {

			// The first is the initial RenderPass, we keep it.
			_composer.passes.splice(1);

      // Replace the rest of the post-processing.
			if ( postProcessingPasses ) {
				for (let ic = postProcessingPasses.length, i = 0; i < ic; ++i) {
					_composer.addPass(postProcessingPasses[i]);
				}
			}

		}
	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		const size = renderer.getSize();

		if ( renderer.autoClear ) renderer.clear();

		_renderPass.scene = scene;

    // Ensure the last pass renders to screen.
    _composer.passes[_composer.passes.length - 1].renderToScreen = true;

		if ( _isMono ) {

			renderer.setScissorTest( false );

			renderer.setScissor( 0, 0, size.width, size.height );
			renderer.setViewport( 0, 0, size.width, size.height );

			_renderPass.camera = camera;
			_composer.render();

		} else {

      _stereo.update( camera );

			renderer.setScissorTest( true );

			renderer.setScissor( 0, 0, size.width / 2, size.height );
			renderer.setViewport( 0, 0, size.width / 2, size.height );

			_renderPass.camera = _stereo.cameraL;
			_composer.render();

			renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
			renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );

			_renderPass.camera = _stereo.cameraR;
			_composer.render();

			renderer.setScissorTest( false );

		}

	};

};

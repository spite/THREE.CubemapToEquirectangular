import {
	Camera,
	CubeCamera,
	HalfFloatType,
	LinearMipmapLinearFilter,
	Mesh,
	NoBlending,
	PlaneGeometry,
	ShaderMaterial,
	WebGLCubeRenderTarget,
	WebGLRenderTarget
} from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const vertexShader = /* glsl */`

	varying vec2 vUv;

	void main() {

		vUv = uv;
		gl_Position = vec4( position.xy, 0.0, 1.0 );

	}

`;

const fragmentShader = /* glsl */`

	uniform highp samplerCube map;

	varying vec2 vUv;

	const float PI = 3.141592653589793;

	void main() {

		// rows run top to bottom, so the pixels read back are the image the right way up
		float longitude = ( vUv.x - 0.5 ) * 2.0 * PI;
		float latitude = ( 0.5 - vUv.y ) * PI;

		vec3 direction = vec3(
			cos( latitude ) * cos( longitude ),
			sin( latitude ),
			cos( latitude ) * sin( longitude )
		);

		// explicit LOD from the angular footprint, implicit derivatives blur a line along the cube edges
		float major = max( max( abs( direction.x ), abs( direction.y ) ), abs( direction.z ) );
		float angle = max( length( dFdx( direction ) ), length( dFdy( direction ) ) );
		float texels = angle * float( textureSize( map, 0 ).x ) * 0.5 / ( major * sqrt( major ) );

		gl_FragColor = textureLod( map, direction, log2( texels ) );

	}

`;

class CubemapToEquirectangular {

	constructor( renderer, provideCubeCamera ) {

		this.width = 1;
		this.height = 1;

		this.renderer = renderer;

		this.material = new ShaderMaterial( {
			uniforms: { map: { value: null } },
			vertexShader,
			fragmentShader,
			blending: NoBlending,
			depthTest: false,
			depthWrite: false
		} );

		this.quad = new Mesh( new PlaneGeometry( 2, 2 ), this.material );
		this.quad.frustumCulled = false;
		this.camera = new Camera();

		// the panorama in linear HDR, then tone mapped and encoded like the screen into output
		this.linear = new WebGLRenderTarget( 1, 1, { type: HalfFloatType, depthBuffer: false } );
		this.output = new WebGLRenderTarget( 1, 1, { depthBuffer: false } );
		this.outputPass = new OutputPass();

		this.cubeCamera = null;
		this.cubeMapSize = renderer.capabilities.maxCubemapSize;

		this.setSize( 4096, 2048 );

		if ( provideCubeCamera ) {

			this.getCubeCamera( 2048 );

		}

	}

	setSize( width, height ) {

		const max = this.renderer.capabilities.maxTextureSize;

		if ( ! ( width >= 1 && width <= max && height >= 1 && height <= max ) ) {

			throw new RangeError( 'CubemapToEquirectangular: width and height must be between 1 and ' + max + ', got ' + width + 'x' + height );

		}

		this.width = Math.floor( width );
		this.height = Math.floor( height );

		this.linear.setSize( this.width, this.height );
		this.output.setSize( this.width, this.height );

	}

	getCubeCamera( size ) {

		if ( this.cubeCamera ) this.cubeCamera.renderTarget.dispose();

		const renderTarget = new WebGLCubeRenderTarget( Math.min( this.cubeMapSize, size ), {
			type: HalfFloatType,
			generateMipmaps: true,
			minFilter: LinearMipmapLinearFilter
		} );

		this.cubeCamera = new CubeCamera( .1, 1000, renderTarget );

		return this.cubeCamera;

	}

	convert( cubeCamera, download ) {

		const renderer = this.renderer;
		const renderTarget = renderer.getRenderTarget();
		const cubeFace = renderer.getActiveCubeFace();
		const mipmapLevel = renderer.getActiveMipmapLevel();

		this.material.uniforms.map.value = cubeCamera.renderTarget.texture;
		renderer.setRenderTarget( this.linear );
		renderer.render( this.quad, this.camera );
		this.material.uniforms.map.value = null;

		this.outputPass.render( renderer, this.output, this.linear );

		const pixels = new Uint8Array( 4 * this.width * this.height );
		renderer.readRenderTargetPixels( this.output, 0, 0, this.width, this.height, pixels );

		renderer.setRenderTarget( renderTarget, cubeFace, mipmapLevel );

		const imageData = new ImageData( new Uint8ClampedArray( pixels.buffer ), this.width, this.height );

		if ( download !== false ) {

			this.download( imageData );

		}

		return imageData;

	}

	download( imageData ) {

		const canvas = document.createElement( 'canvas' );
		canvas.width = imageData.width;
		canvas.height = imageData.height;
		canvas.getContext( '2d' ).putImageData( imageData, 0, 0 );

		canvas.toBlob( function( blob ) {

			const url = URL.createObjectURL( blob );
			const anchor = document.createElement( 'a' );
			anchor.href = url;
			anchor.download = 'pano-' + document.title + '-' + Date.now() + '.png';
			anchor.style.display = 'none';
			document.body.appendChild( anchor );
			anchor.click();
			document.body.removeChild( anchor );
			setTimeout( function() { URL.revokeObjectURL( url ); }, 1000 );

		}, 'image/png' );

	}

	update( camera, scene, download ) {

		const renderer = this.renderer;
		const cubeCamera = this.cubeCamera || this.getCubeCamera( 2048 );

		camera.getWorldPosition( cubeCamera.position );
		cubeCamera.layers.mask = camera.layers.mask;

		if ( camera.near !== undefined && camera.far !== undefined ) {

			for ( const face of cubeCamera.children ) {

				face.near = camera.near;
				face.far = camera.far;
				face.updateProjectionMatrix();

			}

		}

		const autoClear = renderer.autoClear;
		renderer.autoClear = true;
		cubeCamera.update( renderer, scene );
		renderer.autoClear = autoClear;

		return this.convert( cubeCamera, download );

	}

	dispose() {

		this.material.dispose();
		this.quad.geometry.dispose();
		this.linear.dispose();
		this.output.dispose();
		this.outputPass.dispose();

		if ( this.cubeCamera ) this.cubeCamera.renderTarget.dispose();

	}

}

export { CubemapToEquirectangular };

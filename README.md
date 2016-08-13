# THREE.CubemapToEquirectangular

Helper to extract an equirectangular panorama PNG from any three.js scene.

Here's a demo with some cubes: [Demo](http://clicktorelease.com/tools/CubemapToEquirectangular/index-managed.html)


![](https://raw.githubusercontent.com/spite/THREE.CubemapToEquirectangular/master/about/pano-cru%C2%B7ci%C2%B7form-1471040116139.jpg)
![](https://raw.githubusercontent.com/spite/THREE.CubemapToEquirectangular/master/about/pano-The%20Polygon%20Shredder-1471041904038.jpg)

#### How to use ####
Include script after THREE is included
```
<script src="CubemapToEquirectangular.js"></script>
```
Define a new instance of THREE.CubemapToEquirectangular.
```
// create renderer, scene, camera, etc.
var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var camera = new THREE.Camera( /* ... */ );

// Create a managed CubemapToEquirectangular
var equiManaged = new THREE.CubemapToEquirectangular( renderer, true );

// or create an unmanaged CubemapToEquirectangular
var equiUnmanaged = new THREE.CubemapToEquirectangular( renderer, false );
```

#### Managed CubemapToEquirectangular ####
With Managed mode, the THREE.CubeCamera creation, update, render, etc. is all taken care of. You only have to call:
```
equiManaged.update( camera, scene );
```
at any point in your code that you want to extract a panorama.
The cube map created will be 4096x4096 and the exported panorama will be 4096x2048.

Demo of Managed mode: [Demo](http://clicktorelease.com/tools/CubemapToEquirectangular/index-managed.html)


#### Unmanaged CubemapToEquirectangular ####
If you want to use a different CubeMap camera, or do something custom with the render, you will have to set the Unmanaged mode.

You will have to create and manage your THREE.CubeCamera:
```
var cubeCamera = new THREE.CubeCamera( .1, 1000, 4096 );
```
and manage all your scene update and rendering. When you want to export a panorama, call:
```
// this is where the developer updates the scene and creates a cubemap of the scene
cubeCamera.position.copy( camera.position );
cubeCamera.updateCubeMap( renderer, scene );

// call this to convert the cubemap rendertarget to a panorama
equiUnmanaged.convert( cubeCamera );
```

Demo of Unmanaged mode: [Demo](http://clicktorelease.com/tools/CubemapToEquirectangular/index-unmanaged.html)

#### Changing output size ####
To export a different size, call ```setSize( width, height )```:
```
equi.setSize( 2048, 1024 );
```

#### Notes ###

Built using ES6 template strings.
Needs canvas.toBlob, polyfill in the examples folder

#### TODO ####

- Fix for Android (if it's a relevant use case)
- Add importance sampling (improves quality of output)
- Handle postprocessing
- Handle Safari not supporting download attribute
- Let users have more control over file name, callbacks, progress

#### License ####

MIT licensed

Copyright (C) 2016 Jaume Sanchez Elias, http://www.clicktorelease.com

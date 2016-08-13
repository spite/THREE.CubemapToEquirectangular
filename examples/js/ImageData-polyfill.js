( function() {

	try {
		var i = new ImageData( new Uint8ClampedArray( [ 1, 1, 1, 1 ] ), 1, 1 );
	} catch( e ) {
		window.ImageData = function( data, width, height ) {
			var canvas = document.createElement( 'canvas' );
			var ctx = canvas.getContext( '2d' );
			var imageData = ctx.createImageData( width, height );
			imageData.data.set( data );
			return imageData
		}
	}

})();

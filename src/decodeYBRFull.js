/**
 */
var cornerstoneWADOImageLoader = (function (cornerstoneWADOImageLoader) {

    "use strict";

    if(cornerstoneWADOImageLoader === undefined) {
        cornerstoneWADOImageLoader = {};
    }

    function decodeYBRFull(ybrBuffer, rgbaBuffer, planarConfiguration ) {
        if(ybrBuffer === undefined) {
            throw "decodeRGB: ybrBuffer must not be undefined";
        }
        if(ybrBuffer.length % 3 !== 0) {
            throw "decodeRGB: ybrBuffer length must be divisble by 3";
        }

        var numPixels = ybrBuffer.length / 3;
        var rgbaIndex = 0;
        if( planarConfiguration===0 ) {
            var ybrIndex = 0;
            for(var i= 0; i < numPixels; i++) {
                var y = ybrBuffer[ybrIndex++];
                var cb = ybrBuffer[ybrIndex++];
                var cr = ybrBuffer[ybrIndex++];
                rgbaBuffer[rgbaIndex++] = y + 1.40200 * (cr - 128);// red
                rgbaBuffer[rgbaIndex++] = y - 0.34414 * (cb -128) - 0.71414 * (cr- 128); // green
                rgbaBuffer[rgbaIndex++] = y + 1.77200 * (cb - 128); // blue
                rgbaBuffer[rgbaIndex++] = 255; //alpha
            }
        } else if (planarConfiguration===1) {
            var yIndex=0;
            var bIndex=numPixels;
            var rIndex=numPixels*2;
            for(var i= 0; i < numPixels; i++) {
                var y = ybrBuffer[yIndex++];
                var cb = ybrBuffer[bIndex++];
                var cr = ybrBuffer[rIndex++];
                rgbaBuffer[rgbaIndex++] = y + 1.40200 * (cr - 128);// red
                rgbaBuffer[rgbaIndex++] = y - 0.34414 * (cb -128) - 0.71414 * (cr- 128); // green
                rgbaBuffer[rgbaIndex++] = y + 1.77200 * (cb - 128); // blue
                rgbaBuffer[rgbaIndex++] = 255; //alpha
            }
        }

    }

    // module exports
    cornerstoneWADOImageLoader.decodeYBRFull = decodeYBRFull;

    return cornerstoneWADOImageLoader;
}(cornerstoneWADOImageLoader));
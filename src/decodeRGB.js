/**
 */
var cornerstoneWADOImageLoader = (function (cornerstoneWADOImageLoader) {

    "use strict";

    if(cornerstoneWADOImageLoader === undefined) {
        cornerstoneWADOImageLoader = {};
    }

    function decodeRGB(rgbBuffer, rgbaBuffer, planarConfiguration) {
        if(rgbBuffer === undefined) {
            throw "decodeRGB: rgbBuffer must not be undefined";
        }
        if(rgbBuffer.length % 3 !== 0) {
            throw "decodeRGB: rgbBuffer length must be divisble by 3";
        }

        var numPixels = rgbBuffer.length / 3;
        var rgbaIndex = 0;
        if( planarConfiguration===0 ) {
            var rgbIndex = 0;
            for(var i= 0; i < numPixels; i++) {
                rgbaBuffer[rgbaIndex++] = rgbBuffer[rgbIndex++]; // red
                rgbaBuffer[rgbaIndex++] = rgbBuffer[rgbIndex++]; // green
                rgbaBuffer[rgbaIndex++] = rgbBuffer[rgbIndex++]; // blue
                rgbaBuffer[rgbaIndex++] = 255; //alpha
            }
        } else if (planarConfiguration===1) {
            var rIndex = 0;
            var gIndex = numPixels;
            var bIndex = numPixels*2;
            for(var i= 0; i < numPixels; i++) {
                rgbaBuffer[rgbaIndex++] = rgbBuffer[rIndex++]; // red
                rgbaBuffer[rgbaIndex++] = rgbBuffer[gIndex++]; // green
                rgbaBuffer[rgbaIndex++] = rgbBuffer[bIndex++]; // blue
                rgbaBuffer[rgbaIndex++] = 255; //alpha
            }
        }
    }

    // module exports
    cornerstoneWADOImageLoader.decodeRGB = decodeRGB;

    return cornerstoneWADOImageLoader;
}(cornerstoneWADOImageLoader));
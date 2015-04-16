var cornerstoneWADOImageLoader = (function ($, cornerstone, cornerstoneWADOImageLoader) {

    "use strict";

    if(cornerstoneWADOImageLoader === undefined) {
        cornerstoneWADOImageLoader = {};
    }

    var canvas = document.createElement('canvas');
    var lastImageIdDrawn = "";

    function arrayBufferToString(buffer) {
        return binaryToString(String.fromCharCode.apply(null, Array.prototype.slice.apply(new Uint8Array(buffer))));
    }

    function binaryToString(binary) {
        var error;

        try {
            return decodeURIComponent(escape(binary));
        } catch (_error) {
            error = _error;
            if (error instanceof URIError) {
                return binary;
            } else {
                throw error;
            }
        }
    }

    function extractStoredPixels(dataSet, byteArray, photometricInterpretation, width, height, frame) {
        canvas.height = height;
        canvas.width = width;

        var planarConfiguration = dataSet.uint16('x00280006');
        var pixelDataElement = dataSet.elements.x7fe00010;
        var pixelDataOffset = pixelDataElement.dataOffset;
        var transferSyntax = dataSet.string('x00020010');
        var samplesPerPixel = dataSet.uint16('x00280002');

        var frameSize = width * height * samplesPerPixel;
        var frameOffset = pixelDataOffset + frame * frameSize;
        var encodedPixelData;
        var context = canvas.getContext('2d');
        var imageData = context.createImageData(width, height);

        var deferred = $.Deferred();
        
        // this is an exception
        if( (photometricInterpretation === "YBR_FULL_422" || photometricInterpretation === "YBR_FULL") &&
                transferSyntax === "1.2.840.10008.1.2.4.50")
        {
            encodedPixelData = dicomParser.readEncapsulatedPixelData(dataSet, frame);
            // need to read the encapsulated stream here i think
            var imgBlob = new Blob([encodedPixelData], {type: "image/jpeg"});
            var r = new FileReader();
            if(r.readAsBinaryString === undefined) {
                r.readAsArrayBuffer(imgBlob);
            }
            else {
                r.readAsBinaryString(imgBlob); // doesn't work on IE11
            }
            r.onload = function(){
                var img=new Image();
                img.onload = function() {
                    context.drawImage(this, 0, 0);
                    imageData = context.getImageData(0, 0, width, height);
                    deferred.resolve(imageData);
                };
                img.onerror = function(z) {
                    deferred.reject();
                };
                if(r.readAsBinaryString === undefined) {
                    img.src = "data:image/jpeg;base64,"+window.btoa(arrayBufferToString(r.result));
                }
                else {
                    img.src = "data:image/jpeg;base64,"+window.btoa(r.result); // doesn't work on IE11
                }

            };
            return deferred;
        }
        
        // verify transfer syntax
        if( transferSyntax === "1.2.840.10008.1.2.1") {
            encodedPixelData = new Uint8Array(byteArray.buffer, frameOffset, frameSize);
            
        } else if ( transferSyntax === "1.2.840.10008.1.2.5" ) {
            planarConfiguration=1;
            var frameData = dicomParser.readEncapsulatedPixelData( dataSet, frame );
            var pixelFormat = cornerstoneWADOImageLoader.getPixelFormat(dataSet);
            encodedPixelData=cornerstoneWADOImageLoader.unRLE( pixelFormat, samplesPerPixel, frameData, width, height);
            
        } else if ( transferSyntax === "1.2.840.10008.1.2.4.50" ) {
            frameData = dicomParser.readEncapsulatedPixelData( dataSet, frame );
            var jpeg = new JpegImage();
            jpeg.parse( frameData );
            encodedPixelData=jpeg.getData(width, height);

        } else
            throw "no codec for " + photometricInterpretation + " ts=" + transferSyntax;
        
        // verify photometrci interpretation
        if( photometricInterpretation === "RGB" ) {
            cornerstoneWADOImageLoader.decodeRGB(encodedPixelData, imageData.data, planarConfiguration);
            
        } else if( photometricInterpretation === "PALETTE COLOR" )  {
            cornerstoneWADOImageLoader.decodePALETTE(encodedPixelData, imageData.data, dataSet );

        }
        else if( photometricInterpretation === "YBR_FULL_422" || photometricInterpretation === "YBR_FULL" ) {
            cornerstoneWADOImageLoader.decodeYBRFull(encodedPixelData, imageData.data, planarConfiguration);

        } else
            throw "no codec for " + photometricInterpretation + " ts=" + transferSyntax;

        deferred.resolve(imageData);
        return deferred;
/*
        if (photometricInterpretation === "RGB" &&
                transferSyntax === "1.2.840.10008.1.2.1") 
        {
            encodedPixelData = new Uint8Array(byteArray.buffer, frameOffset, frameSize);
            cornerstoneWADOImageLoader.decodeRGB(encodedPixelData, imageData.data);
            deferred.resolve(imageData);
            return deferred;
        }
        else if( photometricInterpretation === "RGB" &&
                transferSyntax === "1.2.840.10008.1.2.4.50") 
        {
            encodedPixelData = dicomParser.readEncapsulatedPixelData( dataSet, frame );
            var jpeg = new JpegImage();
            jpeg.parse( encodedPixelData );
            imageData=jpeg.getData(width, height);
            cornerstoneWADOImageLoader.decodeRGB(encodedPixelData, imageData.data);
            deferred.resolve(imageData);
            return deferred;
        }
        else if (photometricInterpretation === "RGB" &&
                transferSyntax === "1.2.840.10008.1.2.5") 
        {
            // RLE
        }
        else if( (photometricInterpretation === "YBR_FULL_422" || photometricInterpretation === "YBR_FULL") &&
                transferSyntax === "1.2.840.10008.1.2.1" )
        {
            encodedPixelData = new Uint8Array(byteArray.buffer, frameOffset, frameSize);
            cornerstoneWADOImageLoader.decodeYBRFull(encodedPixelData, imageData.data, planarConfiguration);
            deferred.resolve(imageData);
            return deferred;
        } 
        else if( (photometricInterpretation === "YBR_FULL_422" || photometricInterpretation === "YBR_FULL") &&
                transferSyntax === "1.2.840.10008.1.2.4.50")
        {
            encodedPixelData = dicomParser.readEncapsulatedPixelData(dataSet, frame);
            // need to read the encapsulated stream here i think
            var imgBlob = new Blob([encodedPixelData], {type: "image/jpeg"});
            var r = new FileReader();
            if(r.readAsBinaryString === undefined) {
                r.readAsArrayBuffer(imgBlob);
            }
            else {
                r.readAsBinaryString(imgBlob); // doesn't work on IE11
            }
            r.onload = function(){
                var img=new Image();
                img.onload = function() {
                    context.drawImage(this, 0, 0);
                    imageData = context.getImageData(0, 0, width, height);
                    deferred.resolve(imageData);
                };
                img.onerror = function(z) {
                    deferred.reject();
                };
                if(r.readAsBinaryString === undefined) {
                    img.src = "data:image/jpeg;base64,"+window.btoa(arrayBufferToString(r.result));
                }
                else {
                    img.src = "data:image/jpeg;base64,"+window.btoa(r.result); // doesn't work on IE11
                }

            };
            return deferred;
        }
        else if( (photometricInterpretation === "YBR_FULL_422" || photometricInterpretation === "YBR_FULL") &&
                transferSyntax === "1.2.840.10008.1.2.5" )
        {
            // RLE
        } 
        else if( photometricInterpretation === "PALETTE COLOR" 
                && transferSyntax === "1.2.840.10008.1.2.1" )
        {
            encodedPixelData = new Uint8Array(byteArray.buffer, frameOffset, frameSize);
            cornerstoneWADOImageLoader.decodePALETTE(encodedPixelData, imageData.data, dataSet );
            deferred.resolve(imageData);
            return deferred;
        }
        else if( photometricInterpretation === "PALETTE COLOR" 
                && transferSyntax === "1.2.840.10008.1.2.5" )
        {
            // RLE
        }
*/
    }

    function makeColorImage(imageId, dataSet, byteArray, photometricInterpretation, frame, ovls) {

        // extract the DICOM attributes we need
        var pixelSpacing = cornerstoneWADOImageLoader.getPixelSpacing(dataSet);
        var rows = dataSet.uint16('x00280010');
        var columns = dataSet.uint16('x00280011');
        var rescaleSlopeAndIntercept = cornerstoneWADOImageLoader.getRescaleSlopeAndIntercept(dataSet);
        var bytesPerPixel = 4;
        var numPixels = rows * columns;
        var sizeInBytes = numPixels * bytesPerPixel;
        var windowWidthAndCenter = cornerstoneWADOImageLoader.getWindowWidthAndCenter(dataSet);

        var deferred = $.Deferred();

        // Decompress and decode the pixel data for this image
        var imageDataPromise = extractStoredPixels(dataSet, byteArray, photometricInterpretation, columns, rows, frame);
        imageDataPromise.then(function(imageData) {
            function getPixelData() {
                return imageData.data;
            }

            function getImageData() {
                return imageData;
            }

            function getCanvas() {
                if(lastImageIdDrawn === imageId) {
                    return canvas;
                }

                canvas.height = rows;
                canvas.width = columns;
                var context = canvas.getContext('2d');
                context.putImageData(imageData, 0, 0 );
                lastImageIdDrawn = imageId;
                return canvas;
            }

            // Extract the various attributes we need
            var image = {
                imageId : imageId,
                minPixelValue : 0,
                maxPixelValue : 255,
                slope: rescaleSlopeAndIntercept.slope,
                intercept: rescaleSlopeAndIntercept.intercept,
                windowCenter : windowWidthAndCenter.windowCenter,
                windowWidth : windowWidthAndCenter.windowWidth,
                render: cornerstone.renderColorImage,
                getPixelData: getPixelData,
                getImageData: getImageData,
                getCanvas: getCanvas,
                rows: rows,
                columns: columns,
                height: rows,
                width: columns,
                color: true,
                columnPixelSpacing: pixelSpacing.column,
                rowPixelSpacing: pixelSpacing.row,
                data: dataSet,
                invert: false,
                sizeInBytes: sizeInBytes,
                overlays: ovls
            };

            if(image.windowCenter === undefined) {
                image.windowWidth = 255;
                image.windowCenter = 128;
            }
            deferred.resolve(image);
        }, function() {
            deferred.reject();
        });

        return deferred;
    }

    // module exports
    cornerstoneWADOImageLoader.makeColorImage = makeColorImage;

    return cornerstoneWADOImageLoader;
}($, cornerstone, cornerstoneWADOImageLoader));
/*! cornerstoneWADOImageLoader - v0.4.5 - 2014-11-28 | (c) 2014 Chris Hafey | https://github.com/chafey/cornerstoneWADOImageLoader */
//
// This is a cornerstone image loader for WADO requests.  It currently does not support compressed
// transfer syntaxes or big endian transfer syntaxes.  It will support implicit little endian transfer
// syntaxes but explicit little endian is strongly preferred to avoid any parsing issues related
// to SQ elements.  To request that the WADO object be returned as explicit little endian, append
// the following on your WADO url: &transferSyntax=1.2.840.10008.1.2.1
//

var cornerstoneWADOImageLoader = (function ($, cornerstone, cornerstoneWADOImageLoader) {

    "use strict";

    if(cornerstoneWADOImageLoader === undefined) {
        cornerstoneWADOImageLoader = {};
    }

    function getOverlays( dataSet, frame ) {
        var overlays=[];
        for( var ovlGroup = 0x6000; ovlGroup <= 0x601e; ovlGroup+=2 ) {
            var ovlGroupStr='x'+ovlGroup.toString(16);
            if( dataSet.elements[ovlGroupStr+'0010']===undefined || dataSet.elements[ovlGroupStr+'3000']===undefined)
                break;

            // only single frame overlay support
            var ovlFrames=dataSet.intString(ovlGroupStr+'0015');
            var ovlType=dataSet.string(ovlGroupStr+'0040');
            if( ovlFrames>1 || ovlType!=="G" )
                continue;
            
            var ovlRows=dataSet.uint16(ovlGroupStr+'0010');
            var ovlCols=dataSet.uint16(ovlGroupStr+'0011');
            var ovlX0=dataSet.int16(ovlGroupStr+'0050',0)-1;
            var ovlY0=dataSet.int16(ovlGroupStr+'0050',1)-1;
            var dataElement=dataSet.elements[ovlGroupStr+'3000'];
            var ovlData;
            if( dataElement.vr==="OW")
                ovlData=new DataView(dataSet.byteArray.buffer, dataElement.dataOffset, dataElement.length);
            else
                ovlData=new DataView(dataSet.byteArray.buffer, dataElement.dataOffset, dataElement.length);
        
            var overlay={
                width: ovlCols,
                height: ovlRows,
                X0: ovlX0,
                Y0: ovlY0,
                data: ovlData
            };
            
            overlays.push(overlay);
        }
        return overlays;
    }

    function isColorImage(photoMetricInterpretation)
    {
        if(photoMetricInterpretation === "RGB" ||
            photoMetricInterpretation === "PALETTE COLOR" ||
            photoMetricInterpretation === "YBR_FULL" ||
            photoMetricInterpretation === "YBR_FULL_422" ||
            photoMetricInterpretation === "YBR_PARTIAL_422" ||
            photoMetricInterpretation === "YBR_PARTIAL_420" ||
            photoMetricInterpretation === "YBR_RCT")
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    function createImageObject(dataSet, imageId, frame)
    {
        if(frame === undefined) {
            frame = 0;
        }

        // make the image based on whether it is color or not
        var photometricInterpretation = dataSet.string('x00280004');
        var isColor = isColorImage(photometricInterpretation);
        var ovls = getOverlays( dataSet, frame );
        var image;
        if(isColor === false) {
            image=cornerstoneWADOImageLoader.makeGrayscaleImage(imageId, dataSet, dataSet.byteArray, photometricInterpretation, frame, ovls);
        } else {
            image=cornerstoneWADOImageLoader.makeColorImage(imageId, dataSet, dataSet.byteArray, photometricInterpretation, frame, ovls);
        }
        
        return image;
    }

    var multiFrameCacheHack = {};

    // Loads an image given an imageId
    // wado url example:
    // http://localhost:3333/wado?requestType=WADO&studyUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075541.1&seriesUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075541.2&objectUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075557.1&contentType=application%2Fdicom&transferSyntax=1.2.840.10008.1.2.1
    // NOTE: supposedly the instance will be returned in Explicit Little Endian transfer syntax if you don't
    // specify a transferSyntax but Osirix doesn't do this and seems to return it with the transfer syntax it is
    // stored as.
    function loadImage(imageId) {
        // create a deferred object
        // TODO: Consider not using jquery for deferred - maybe cujo's when library
        var deferred = $.Deferred();

        // build a url by parsing out the url scheme and frame index from the imageId
        var url = imageId;
        url = url.substring(9);
        var frameIndex = url.indexOf('frame=');
        var frame;
        if(frameIndex !== -1) {
            var frameStr = url.substr(frameIndex + 6);
            frame = parseInt(frameStr);
            url = url.substr(0, frameIndex-1);
        }

        // if multiframe and cached, use the cached data set to extract the frame
        if(frame !== undefined &&
            multiFrameCacheHack.hasOwnProperty(url))
        {
            var dataSet = multiFrameCacheHack[url];
            var imagePromise = createImageObject(dataSet, imageId, frame);
            imagePromise.then(function(image) {
                deferred.resolve(image);
            }, function() {
                deferred.reject();
            });
            return deferred;
        }

        // Make the request for the DICOM data
        // TODO: consider using cujo's REST library here?
        var oReq = new XMLHttpRequest();
        oReq.open("get", url, true);
        oReq.responseType = "arraybuffer";
        //oReq.setRequestHeader("Accept", "multipart/related; type=application/dicom");

        oReq.onreadystatechange = function(oEvent) {
            // TODO: consider sending out progress messages here as we receive the pixel data
            if (oReq.readyState === 4)
            {
                if (oReq.status === 200) {
                    // request succeeded, create an image object and resolve the deferred

                    // Parse the DICOM File
                    var dicomPart10AsArrayBuffer = oReq.response;
                    var byteArray = new Uint8Array(dicomPart10AsArrayBuffer);
                    var dataSet = dicomParser.parseDicom(byteArray);

                    // if multiframe, cache the parsed data set to speed up subsequent
                    // requests for the other frames
                    if(frame !== undefined) {
                        multiFrameCacheHack[url] = dataSet;
                    }

                    var imagePromise = createImageObject(dataSet, imageId, frame);
                    imagePromise.then(function(image) {
                        deferred.resolve(image);
                    }, function() {
                        deferred.reject();
                    });
                }
                // TODO: Check for errors and reject the deferred if they happened
                else {
                    // TODO: add some error handling here
                    // request failed, reject the deferred
                    deferred.reject();
                }
            }
        };
        oReq.send();

        return deferred;
    }

    // steam the http and https prefixes so we can use wado URL's directly
    cornerstone.registerImageLoader('dicomweb', loadImage);

    return cornerstoneWADOImageLoader;
}($, cornerstone, cornerstoneWADOImageLoader));

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// To make sure we can uniquely identify each screenshot tab, add an id as a
// query param to the url that displays the screenshot.
// Note: It's OK that this is a global variable (and not in localStorage),
// because the event page will stay open as long as any screenshot tabs are
// open.
"use strict";
let id = 100;
//var saveCount = 0;
let minimumUsableScalingFactor = 0.05; // expressed as a %, don't bother if the scaling is below this value
//
// Labels for translated strings, which eventually everything goes to
//
const key_LabelNotiicationTitle = "CannotLocateQRCode";
const key_LabelShortCodeError = "CannotTranslateShortCode";
const key_LabelErrorMessage = "errorMessage";
//
// Not yet translated strings
//
const msg_Abort_Prefix = "Aborting process because - ";
const msg_Could_Not_Read_QRCode = "Could not read QR Code";
const msg_Variables_Not_Defined = "SearchForQRCode - variables not defined";
const msg_Too_Many_Records_Found = "Too many records found";
const msg_Database_Connection_Failed = "Database connection failed";
const msg_Could_Not_Translate_Part1of2 = "Could not translate QR Code ";
const msg_Could_Not_Translate_Part2of2 = " to URL";
const msg_Unexpected_Error_While_Translating_Part1of2 = "Unexpected error while translating QR Code ";
const msg_Unexpected_Error_While_Translating_Part2of2 = " to URL";
const msg_Internal_Failure = "Unexpected error while processing - code ";
const msg_Unexpected_Failure_Translating_QRCode = "Unexpected error while translating code";
const code_01 = "01"; // creating canvas failed 
const code_02 = "02"; // getting QR Code failed 
const code_03 = "03"; // getting Base64String failed
const code_04 = "04"; // HTTP Request creation failed 
const code_05 = "05"; // target link processing failed .. JSON failure?
const code_06 = "06"; // failure analysing segment
const code_07 = "07"; // failure opening new tab
const code_08 = "08"; // failure injecting CSS
const code_09 = "09"; // failure injecting script
const code_10 = "10"; // failure processing message listener
const code_11 = "11"; // failure trying to redirect url
const code_12 = "12"; // Firebase call failed

let clickInformation; // information about where the user clicked 
let searchIteration;  // which iteration of the search are we in?

const status_operationSuccessful = "0";
const status_tooManyTargetsFound = "1";
const status_databaseConnectionFailure = "2";
const status_linkExpired = "3";
const status_targetNotFound = "4";
const status_openNewTab = "1";

const _httpCompareString = "http";

const param_actionRequest = "a";
const param_showPageCommand = "sp";
const param_readImageCommand = "ri"; // primarily used for debugging purposes

const param_fileNameIdentifier = "fn"; // primarily used for debugging purposes
const param_targetPageIdentifier = "tp";

let tabNumber = 0;
let viewTabUrl;
let targetTabId;
let horizontalScalingFactor;
let verticalScalingFactor;
// var urlToInsert;
let diagonalShiftDistance = 20;

const ninjaDomain  = 'https://qrc.ninja/';
const url_install   = ninjaDomain + 'how-to-use-qrc-ninja/';
const url_uninstall = ninjaDomain + 'sorry-to-see-you-go';
const url_analyse   = ninjaDomain + "api/analyse.html";
const url_makeFile  = ninjaDomain + "makeFile.php";
const url_findKey   = ninjaDomain +  "api/findKey2.php";
//const decodeQRCodeURL = "http://51.15.108.207/decodeQRCode.php"; // Used with the Scandit library - currently inactive
const file_cssInjection = 'data/inject/inject.css';
const file_jsInjection = 'data/inject/inject.js';
const file_failureIcon = "data/icons/sadface-48.png";

let fileMade;
let imageFileName = null;
let decodedQRCString;
// var ajaxResults;  // Used with Scandit library

// Determine the browser
let isIE = /*@cc_on!@*/false || !!document.documentMode;
let isEdge = !isIE && !!window.StyleMedia;

let isChrome = navigator.userAgent.search("Chrome") > 0;
let isFirefox = navigator.userAgent.search("Firefox") > 0;

//console.log("Navigator says...." + navigator.userAgent.search("Chrome"));

const maxIterations = 15; // max number of times we will expand our search area for the QR Code
const frameIncrement = 15;  // how much we increment the area each time we expand our search region
let startingFrameWidth = 128; // Width of frame where we search for the QR Code
let frameHeight = startingFrameWidth; // QR Codes are always square!
let screenShotImage;  // stores the result of the screen capture
//
// Firebase setup
//
let config = {
  apiKey: "AIzaSyDLLSY5OJPV4D8tvpG6VpbCyNjWDMh877A",
  authDomain: "qrc-ninja-1.firebaseapp.com",
  databaseURL: "https://qrc-ninja-1.firebaseio.com",
  projectId: "qrc-ninja-1",
  storageBucket: "qrc-ninja-1.appspot.com",
  messagingSenderId: "1013322006315"
};

const app = firebase.initializeApp(config);

function abortOperation( functionName, failureString ) {

  notifyFailure(  functionName + ": " + msg_Abort_Prefix + failureString, key_LabelErrorMessage );

}

function onCaptured( screenshotUrl ){

//  saveCount = 0;

  screenShotImage = new Image();
  screenShotImage.onload = initiateSearch;
  screenShotImage.src = screenshotUrl;
        
}

function initiateSearch() {

  if (!screenShotImage ) {

   abortOperation( "initiateSearch", msg_Variables_Not_Defined );

   return;

  } 

  // Paint the screen shot to a canvas
  try {

    horizontalScalingFactor = clickInformation.screenWidth / screenShotImage.width;
    verticalScalingFactor = clickInformation.screenHeight / screenShotImage.height;
    // console.log("Horizontal scaling factor is : " + horizontalScalingFactor);
    // console.log("Vertical scaling factor is : " + verticalScalingFactor);
    var screenShotCanvas = document.createElement("canvas");
    var screenShotContext = screenShotCanvas.getContext("2d");

    screenShotCanvas.width = screenShotImage.width;
    screenShotCanvas.height = screenShotImage.height;
    screenShotContext.drawImage(screenShotImage, 0, 0);
    // console.log("Screen shot size is width: " + screenShotImage.width + " height: " + screenShotImage.height);
    // console.log("Screen width is : " + window.screen.width + " Screen height is : " + window.screen.height);
    // console.log("Screen width is : " + window.screen.availWidth + " Screen height is : " + window.screen.availHeight);
//    save( screenShotImage, "imagescreenshot");

  }
  catch {

    abortOperation("initiateSearch", msg_Internal_Failure + code_01 );

  }
  // Now that we have the screen capture, we want to pick out the section that the user
  // clicked on

  // However ... it is possible that the user clicked in an area that doesn't full contain
  // the QR Code, so we will get a region and test to see if it contains a readable QR Code.
  //
  let qrCodeFound = false;
  let qrCode;
  fileMade = false;
  decodedQRCString = null;
  // console.log("The device Pixel Ratio is " + window.devicePixelRatio);
  // console.log("The click was at left: " + clickInformation.left + " and Right : " + clickInformation.top);

  // ajaxResults = null;

//  for (searchIteration = 0; (searchIteration < maxIterations) && !qrCodeFound && !ajaxResults; searchIteration++) {
for (searchIteration = 0; (searchIteration < maxIterations) && !qrCodeFound; searchIteration++) {

    // Pull the QR Code from the primary image
    // We start with a small square and incrementally grow larger
  let newWidth = (startingFrameWidth + (frameIncrement * searchIteration));
  let newHeight = newWidth; // width and height are always the same
  let leftPosition = Math.max(0, clickInformation.left - (newWidth/ 2));
  let topPosition = Math.max(0, clickInformation.top - (newHeight/ 2));

//    save(screenShotCanvas.toDataURL(), "testfile.png");
  qrCode = analyseImageSegment( screenShotContext, topPosition, leftPosition, newWidth, newHeight );
    
    qrCodeFound = !!qrCode && !!qrCode.data;

    // I am doing somewhat kludgy testing because I have only had one instance where it *looked like*
    // scaling was causing a problem and unfortunately I am not able to test the fix.  So, here I fix
    // until I get an opportunity to test the one system that was problematic
    //
    // This problem is currently specific to Chrome
    //
    if ( isChrome && !qrCodeFound && 
      ( scalingIsMeaningful( horizontalScalingFactor ) || scalingIsMeaningful( verticalScalingFactor ) ) ) { 

      let newLeftPosition = leftPosition * horizontalScalingFactor;
      let newTopPosition = topPosition * verticalScalingFactor;
  
  //    save(screenShotCanvas.toDataURL(), "testfile.png");
      qrCode = analyseImageSegment( screenShotContext, newTopPosition, newLeftPosition, newWidth, newHeight );

      qrCodeFound = !!qrCode && !!qrCode.data;

    }

  }
  //
  // Because a QR Code can be a link, check to see if it is in the database.
  //
  if ( qrCodeFound ) {

//    searchForLinkFirebase(qrCode.data);
    searchForLink(qrCode.data);

  } 
  // else if ( ajaxResults ) {  // used when are using the Scandit library

  //   console.log("We have a result from the Ajax call");
  //   searchForLink( ajaxResults );

  // }
  //
  // If the search result was so bad that *nothing* was found, declare failure
  //
//  if (!qrCodeFound && !ajaxResults) { 
  if (!qrCodeFound ) { 

    notifyFailure( msg_Could_Not_Read_QRCode, key_LabelErrorMessage );
    
    return;

  }

}

function scalingIsMeaningful( scalingFactor ) {

  return Math.abs( 1 - scalingFactor ) > minimumUsableScalingFactor;

}

function isURL( textToValidate ) {
  //
  // We aren't too strict on what we consider to be a valid URL
  //  
  if (!textToValidate) {
    return false;
  } else
    return textToValidate.substring(0,_httpCompareString.length) == _httpCompareString;

}

function getQRCode( context, top, left, width, height ) {

  try {

    let imageData = context.getImageData(left, top, width, height);
    getBase64String( context, top, left, width, height);

    // Analyse the QR Code
    return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });  

  }
  catch {

    abortOperation("getQRCode", msg_Internal_Failure + code_02);

  }

}

function getBase64String( originalContext, top, left, width, height ){

  try {

    let searchCanvas = document.createElement("canvas");
    let searchContext = searchCanvas.getContext("2d");

    searchContext.drawImage(originalContext.canvas, left, top, width, height, 0, 0, width, height);

    // if ( saveCount < 5 ) {

    //   let newURL = searchCanvas.toDataURL();
    //   save( newURL, "imageFile"+saveCount);

    //   console.log("saving dimensions - top: " + top + " left: " + left + " width: " + width + " height: " + height);
    //   saveCount++;

    // }

    return searchCanvas.toDataURL("image/png");

  }
  catch {

    abortOperation("getBase64String", msg_Internal_Failure + code_03 );

  }

}

// function getAjaxDecode( decodeResults ) {

//   //
//   // If the first character of the ajax result is a '-', then that 
//   // means it was an error of some sort.  Ignore the result for now
//   //
//   console.log("Ajax call returned the value : " + decodeResults);
//   if ( decodeResults.charAt(0) != '-') {
//     ajaxResults = decodeResults;
//   }

// }

function locationIsValid( location ){

  if ( ( typeof( location.topLeftCorner.x )    != "number" ) || ( typeof( location.topLeftCorner.y ) != "number" )    ||
       ( typeof( location.bottomLeftCorner.x ) != "number" ) || ( typeof( location.bottomLeftCorner.y ) != "number" ) ||
       ( typeof( location.topRightCorner.x )   != "number" ) || ( typeof( location.topRightCorner.y ) != "number" )   ||
       ( typeof( location.topRightCorner.x )   != "number" ) || ( typeof( location.topRightCorner.y ) != "number" )
      )

    return false;

  return ( location.topLeftCorner.y < location.bottomLeftCorner.y ) &&
         ( location.topLeftCorner.x < location.topRightCorner.x ) &&
         ( location.bottomLeftCorner.x < location.bottomRightCorner.x ) &&
         ( location.topRightCorner.y < location.bottomRightCorner.y)
   ;
}

function searchForLinkFirebase(keyString) {

  try {

    decodedQRCString = keyString;
    //
    // Note - URLS are not allowed as short names right now because firebase has a problem with encoded strings as search keys
    // If this is ever fixed, we will revisit using URLs as short strings
    //
    // Why would you want to use a URL as a short string? So that a page can be opened directly without going through adverts
    //
    firebase.firestore().collection('keys').where('shortName', '==', keyString)  
      .get().then( (querySnapshot) => {
        if (!!querySnapshot) {
          if (querySnapshot.docs.length == 0) {
            getTargetLink(JSON.stringify([{ status: status_targetNotFound }]));
          } else if (querySnapshot.docs.length > 1) {
            getTargetLink(JSON.stringify([{ status: status_tooManyTargetsFound }]));
          } else {
            querySnapshot.forEach((doc) => {
              decodedQRCString = decodeURIComponent(doc.data().urlString);
              var data = [{
                status: status_operationSuccessful,
                urlString: decodedQRCString,
                openNewTab: doc.data().openNewTab
              }];
              getTargetLink(JSON.stringify(data));
            });
          }
        } 
      }).catch( e => {
        notifyFailure(msg_Unexpected_Failure_Translating_QRCode, key_LabelShortCodeError );
      });

  } catch {

    abortOperation("searchForLinkFirebase", msg_Internal_Failure + code_12);

  }


}

// function searchForLinkFirebaseV2( keyString ) {

//   try {

// //    curl 'https://demo.firebaseio.com/users.json?orderBy="email"&equalTo="something%2Botherthing%40domain.com"'
//     decodedQRCString = keyString ;
//     // Firebase currently has a problem with encoded URLs as search strings, so we want to pull out the % and replace it with a ,
//     // The , is chosen because it should already be encoded and is an allowed character in firebase
//     //
//     // Because the replace only replaces a single character, loop through until there are no more characters replaced

//     var encodedString =  encodeURIComponent(keyString );
//     var encodedString = encodeURIComponent("abcd");
//     var searchURL = `https://firestore.googleapis.com/v1/projects/experiment-with-firebase/databases/keys.json?orderBy="shortName"&equalTo="${encodedString}"`;
//     var xhr = new XMLHttpRequest();
//     xhr.open('GET', searchURL, true);
// //    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
// //    xhr.setRequestHeader('X-Firebase-Decoding', '1');
//     xhr.onload = processSearchResponse;
//      xhr.onload = function () {
//        if (xhr.status === 200) {
//          getTargetLink(xhr.responseText);
//        } else {
//          getTargetLink(status_targetNotFound);
//        }
//      };

//     xhr.send();

//     // firebase.firestore().collection('keys').where('shortName', '==', encodedString )  // sometimes the key can be a URL, which is stored encoded
//     //   .get().then((querySnapshot) => {
//     //     if (querySnapshot.docs.length == 0) {
//     //       getTargetLink(JSON.stringify([{ status: status_targetNotFound }]));
//     //     } else if (querySnapshot.docs.length > 1) {
//     //       getTargetLink(JSON.stringify([{ status: status_tooManyTargetsFound }]));
//     //     } else {
//     //       querySnapshot.forEach((doc) => {
//     //         decodedQRCString = decodeURIComponent( doc.data().urlString );
//     //         var data = [{
//     //           status: status_operationSuccessful,
//     //           urlString: decodedQRCString,
//     //           openNewTab: doc.data().openNewTab
//     //         }];
//     //         getTargetLink(JSON.stringify(data));
//     //         console.log(`${doc.id} => ${doc.data().shortName}`);
//     //       });
//     //     }
//     //   });

//     } catch {

//     abortOperation("searchForLinkFirebaseV2", msg_Internal_Failure + code_12);

//   }
  

// }

async function searchForLink( keyString ) {

  try {

    decodedQRCString = keyString;
    if ( isURL(decodedQRCString)) {
      openNewTab(decodedQRCString);
      return;
    }

    let fullURL = url_findKey + "?key=" + decodedQRCString;
    fetch(fullURL, {method: "GET"})
    .then( result => result.json())
    .then( function( data ) {
      if (data[0].status === status_operationSuccessful) {
        if (status_openNewTab === data[0].openNewTab) {
          openNewTab(data[0].urlString);
        } else {
          redirectTab(data[0].urlString);
        }
      } else {
        notifyFailure(msg_Could_Not_Translate_Part1of2 + decodedQRCString +
          msg_Could_Not_Translate_Part2of2, key_LabelErrorMessage);
      }
    })
    .catch( result => {
      notifyFailure(msg_Unexpected_Error_While_Translating_Part1of2 + decodedQRCString + result +
        msg_Unexpected_Error_While_Translating_Part2of2, key_LabelErrorMessage);
    });
//    let xhr = new XMLHttpRequest();
//    xhr.open('GET', fullURL, true);
//    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
//    xhr.onload = processSearchResponse;
    // xhr.onload = function () {
    //   if (xhr.status === 200) {
    //     getTargetLink(xhr.responseText);
    //   } else {
    //     getTargetLink(_errorTranslatingCodeToURL);
    //   }
    // };

   // xhr.send("key=" + keyString);

  }
  catch {

    abortOperation("searchForLink", msg_Internal_Failure + code_04 );

  }
 
}

function processSearchResponse() {

    if (this.status === 200) {
      getTargetLink(this.responseText);
    } else {
      notifyFailure(msg_Could_Not_Translate_Part1of2 + decodedQRCString +
        msg_Could_Not_Translate_Part2of2, key_LabelErrorMessage);
//      getTargetLink(_errorTranslatingCodeToURL);
    }

}

function getTargetLink( targetLink ){
  //
  // We can open a link in the current tab, or in a new tab
  //
  try {

    let data = JSON.parse(targetLink);
    let status = data[0].status;

    if (status == status_operationSuccessful) {
      let targetURL = data[0].urlString;
      // If the call to the database returned a URL, then open a tab with the URL
      if (isURL(targetURL)) {

//        let newTab = data[0].openNewTab;

        if ( status_openNewTab == data[0].openNewTab )
          chrome.tabs.create({ url: targetURL });
        else
          redirectTab(targetURL);
      }

    } else if (status == status_targetNotFound) {
      //
      // If the call to the database didn't return a URL, but the QR Code decoded to a 
      // URL, then open that in a advertising frame.
      //
      if (isURL(decodedQRCString)) {

        openNewTab(decodedQRCString);

      } else

        notifyFailure(msg_Could_Not_Translate_Part1of2 + decodedQRCString + 
          msg_Could_Not_Translate_Part2of2, key_LabelErrorMessage);

    } else if (status == status_tooManyTargetsFound) {

      notifyFailure(msg_Too_Many_Records_Found, key_LabelShortCodeError);

    } else if (status == status_databaseConnectionFailure) {

      notifyFailure(msg_Database_Connection_Failed, key_LabelShortCodeError);

      // } else if ( status == _errorTranslatingCodeToURL ) {

      //   notifyFailure(msg_Could_Not_Translate_Part1of2 + decodedQRCString + msg_Could_Not_Translate_Part2of2, messageLabelShortCodeError);

    } else {

      notifyFailure(msg_Unexpected_Error_While_Translating_Part1of2 + decodedQRCString + msg_Unexpected_Error_While_Translating_Part2of2, key_LabelShortCodeError);

    }

  }
  catch {

    abortOperation("getTargetLink", msg_Internal_Failure + code_05);

  }

}

// The following code uses the Scandit library, which we have not yet purchased and the test license has expired.
//
// function decodeImage( context, top, left, width, height ) {

//   var imageSegmentAsBase64String = getBase64String( context, top, left, width, height );

//   console.log("Making XMLHttpRequest request");

//   var formData = new FormData();
//   formData.append( "imageData", "imageSegmentAsBase64String");

//   var xhr = new XMLHttpRequest();
//     xhr.open('POST', decodeQRCodeURL);
//     xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
//     xhr.onload = function() {
//       if (xhr.status === 200) {
//         console.log("call was successful with the result : "  + xhr.responseText );
//         getAjaxDecode(xhr.responseText);
//       } else {
//         console.log("HTTP error while decoding QR Code");
//       }
//     };

//     xhr.send( "imageData="+imageSegmentAsBase64String );

// }

function analyseImageSegment( context, top, left, width, height ){

  // Analyse the QR Code
  let qrCode = getQRCode( context, top, left, width, height );  
  
  try {
    let newLeft, newTop, changeDirection;

    if (qrCode != null) {
      if (qrCode.data != null) {
        return qrCode
      }
      else if (qrCode.location != null && 
        (qrCode.location.topLeftCorner.x > 0) &&
        (qrCode.location.topLeftCorner.y > 0) &&
        (qrCode.location.topRightCorner.x > 0) &&
        (qrCode.location.topRightCorner.y > 0) &&
        (qrCode.location.bottomLeftCorner.x > 0) &&
        (qrCode.location.bottomLeftCorner.y > 0) &&
        (qrCode.location.bottomRightCorner.x > 0) &&
        (qrCode.location.bottomRightCorner.y > 0) &&
        (qrCode.location.topLeftCorner.y < qrCode.location.bottomLeftCorner.y) &&
        (qrCode.location.topLeftCorner.x < qrCode.topRightCorner.x)
        ) {
        //
        // If the four corners of a QR Code have been found, send the image to the server to create an image for 
        // analysis
        // 
        //      if ( !fileMade && locationIsValid ( qrCode.location ) ) {

        // 
        // The following calls use the Scandit library - which we currently have only tested but not purchased
        //
        // if ( !fileMade ) {

        //   decodeImage( context, top, left, width, height );
        //   fileMade = true; // only do this once for now
        // } 
        //
        // Find the center and try again
        //
//        console.log("location found ... try using it");

        // newLeft = left + ((qrCode.location.topLeftCorner.x < qrCode.location.topRightCorner.x) ?
        //   qrCode.location.topLeftCorner.x + (qrCode.location.topRightCorner.x - qrCode.location.topLeftCorner.x) / 2 : left);

        // newTop = top + ((qrCode.location.topLeftCorner.y < qrCode.location.bottomLeftCorner.y) ?
        //   qrCode.location.topLeftCorner.y + (qrCode.location.bottomLeftCorner.y - qrCode.location.topLeftCorner.y) / 2 : top);
        
        // In theory there should be a quiet code around the QR Code, but testing shows that this isn't an absolute requirement

        newLeft = qrCode.location.topLeftCorner.x;
        newTop = qrCode.location.topLeftCorner.y;
        newWidth = qrCode.location.topRightCorner.x - qrCode.location.topLeftCorner.x;
        newHeight = qrCode.location.bottomLeftCorner.y - qrCode.location.topLeftCorner.y;

        let result = getQRCode(context, newTop, newLeft, newWidth, newHeight);
//        let result = getQRCode(context, newTop, newLeft, width, height);

        if (result != null) {

          if (result.data != null) {

            //  alert("QR Code found with centered position"); // Remember to comment this out when loading to store

            return result;

          }

        }

      }

    } 

  }
  catch {

    return qrCode;
//    abortOperation("analyseImageSegment-1", msg_Internal_Failure + code_06);

  }

}

function openNewTab( targetString ) {

  try {

//    let newURL = url_analyse + "?" + param_actionRequest + "=" + param_showPageCommand + "&" + param_targetPageIdentifier + "=" + targetString;
//    chrome.tabs.create({ url: newURL });

    chrome.tabs.create({ url: targetString });

  }
  catch {

    abortOperation("openNewTab", msg_Internal_Failure + code_07);

  }

}

let tabID;
function injectCSSFile( tab ){

  try {

    tabID = tab.id;
    chrome.tabs.insertCSS(tab.id, { file: file_cssInjection }, injectScripts);

  }
  catch {

    abortOperation("injectCSSFile", msg_Internal_Failure + code_08);

  }

}

function injectScripts(){

  try {

    if (!tabID) {

      abortOperation("injectScripts", msg_Variables_Not_Defined);
      return;

    }

    chrome.tabs.executeScript(tabID, { file: file_jsInjection });
  }
  catch {

    abortOperation("injectScripts", msg_Internal_Failure + code_09);

  }

}

chrome.runtime.onMessage.addListener( messageListener );

function messageListener( request, sender ) {

  try {

    if (request.method === 'captured') {
      clickInformation = request;
      chrome.tabs.captureVisibleTab({ "format": "png" }, onCaptured);
    }
    else if (request.method === 'popup') {
      injectCSSFile(request.tab);
    }
    else if (request.method == 'debug') {
      console.log("debug request : " + request.cmd);
    }
    else if (request.method == 'event') {
      console.log("debug request : " + request.source);
    }

  }
  catch{

    abortOperation("messageListener", msg_Internal_Failure + code_10);

  }

}

function redirectTab( targetURL ) {

  try {

    if (!tabID) {

      abortOperation("redirectTab", msg_Variables_Not_Defined);
      return;

    }

    chrome.tabs.executeScript(tabID, { code: `location.href =  "${targetURL}"`, runAt: "document_start" });

  }
  catch {

    abortOperation("redirectTab", msg_Internal_Failure + code_11);

  }


}

function notifyFailure(errorMessage, messageTitle) {
  let title = chrome.i18n.getMessage( messageTitle );

  chrome.notifications.create({ "type": "basic", "iconUrl": chrome.extension.getURL( file_failureIcon), "title": title, "message": errorMessage});

  if (window.stop)
    window.stop();

}

function save (url, filename) {
  chrome.storage.local.get({
    timestamp: true,
    saveAs: false
  }, prefs => {
    if (prefs.timestamp) {
      filename = filename += ' ' + ((new Date()).toLocaleString()).replace(/\:/g, '-');
    }
    filename = filename
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    filename += '.png';

    fetch(url)
    .then(res => res.blob())
    .then(blob => {
      let url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename,
        saveAs: prefs.saveAs
      }, () => {
        if (chrome.runtime.lastError) {
          let a = document.createElement('a');
          a.href = url;
          a.setAttribute('download', filename);
          a.dispatchEvent(new MouseEvent('click'));
        }
      });
    });

  });
}

// Listen for a click on the icon. On that click, inject the necessary code and get going.
chrome.browserAction.onClicked.addListener( injectCSSFile );
  
chrome.storage.local.get('version', prefs => {
// let isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
//  if (isFirefox ? !prefs.version : prefs.version !== version) {
  if ( !prefs.version || (prefs.version == "" ) ) {
    let version = chrome.runtime.getManifest().version;
    chrome.storage.local.set({ version }, () => {
      chrome.tabs.create({
        url: url_install  });
    });
  }
});
(function () {
  let { version } = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL( url_uninstall );
})();

'use strict';

var monitor,
    capture,
    guide;

var frameWidth = 128;
var frameHeight = frameWidth;
var borderColor = 'red';
var searchBoxTop, searchBoxLeft;

var textBoxTopMargin = 20;
var textBoxLeftPadding = 8;

var guideMessageText = 'Click on QR Code...'; // In case the localization fails for some reason

var borderWidth = 4;
var moveEvent = null;

var searchBox = null;
var windowBox = null;
var textBox = null;
var expandingBox = null;

try {
  guide.remove();
  capture.remove();
  monitor.remove();
}
catch (e) {}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log("Got message - inject");
    chrome.runtime.sendMessage({ method: 'debug', cmd: "got the message " + request.message });

     if (request.message == 'redirect') {
      window.location.replace(request.target);
    }
  }
);

capture = (function () {
  var _left, _top, left, top, width, height;

  function remove () {
    chrome.runtime.sendMessage({
      method: 'captured',
      screenWidth: window.document.body.clientWidth,
      screenHeight: window.document.body.clientHeight,
      left: left + 1,
      top: top + 1,
      width: width - 2,
      height: height - 2,
      devicePixelRatio: window.devicePixelRatio,
      title: document.title
    });

    guide.remove();
    capture.remove();
    monitor.remove();
  }

  function mouseup(e) {
    //
    // We have to manually stop the timer interval that controls the growth of the "expanding box"
    //
    // experiment with recycling event for a mousemove
    if ( moveEvent == null ) {

      moveEvent = e;

    }
    //
    // We have to hide the boxes so they don't obscure the QR Code during the screen shot
    //
    searchBox.style.borderWidth = '0px';
  
    document.getElementById('searchBox').style.display = "none";
    document.getElementById('textBox').style.display = "none";
    document.getElementById('windowBox').style.display = "none";

    //
    // guide boxes are not being reliably hidden
    //
    guide.remove();
    // prevent content selection on Firefox
    e.stopPropagation();
    e.preventDefault();

    _left = e.clientX;
    _top = e.clientY;

    left = (e.clientX > _left ? _left : e.clientX - 1);
    top = (e.clientY > _top ? _top : e.clientY - 1);

    width = 1;
    height = 1;

    remove();

  }

  return {
    install: function () {
      //
      // We listen for a mouseup instead of a mousedown because some users feel the need to drag the guide
      // instead of click the QR Code
      //
      document.addEventListener('mouseup', mouseup, false);
    },
    remove: function () {
      document.removeEventListener('mouseup', mouseup, false);
    }
  };
})();

guide = (function () {

  var boxResized = false;

  function position (left, top) {
    //
    // Put the cursur in the center of the box
    //
    if (!boxResized) {
      
      var guideMessageText =  chrome.i18n.getMessage('guideMessage');

      searchBox.style.width = frameWidth + 'px';
      searchBox.style.height = frameWidth + 'px';
      searchBox.style.borderColor = borderColor;
      searchBox.style.borderWidth = borderWidth + 'px';
      textBox.setAttribute("data-content", guideMessageText); 
     
      textBox.style.width = (textBox.clientWidth - 10) +'px';
      textBox.style.paddingLeft = textBoxLeftPadding +'px';

      boxResized = true;

//      chrome.runtime.sendMessage({ method: 'debug', cmd : "setting event listeners" });

    }

    searchBoxTop = Math.min( window.innerHeight - frameWidth, Math.max(0, top - (frameWidth / 2)));
    searchBoxLeft = Math.min( window.innerWidth - frameWidth,  Math.max(0, left - (frameWidth / 2)));
    //
    // Place the instruction text above the guide box.  If there isn't enough room, place it below the guide box
    //
    if (searchBoxTop < textBoxTopMargin) {
      textBox.style.top = (searchBoxTop + frameHeight ) + 'px';
    }
    else {
      textBox.style.top = (searchBoxTop - textBoxTopMargin ) + 'px';
    }
    textBox.style.left = (searchBoxLeft + ((frameWidth - textBox.clientWidth)/2) - textBoxLeftPadding - borderWidth) + 'px';

    searchBox.style.top = searchBoxTop + 'px';
    searchBox.style.left = searchBoxLeft + 'px';

  }

  function update (e) {
    position(e.clientX, e.clientY);
  }
  return {
    install: function () {

//      chrome.runtime.sendMessage({ method: 'debug', cmd : "installing guide" });
  
      //
      // The user should place the search box around the QR Code
      //
      searchBox = document.createElement('div');
      searchBox.setAttribute('class', 'search-box');
      searchBox.setAttribute('id', 'searchBox'); // border: red 4px solid;
      document.body.appendChild(searchBox);
      //
      // The text box provides instructions to the user on where to put the search box
      //
      textBox = document.createElement('div');
      textBox.setAttribute('class', 'search-text-box');
      textBox.setAttribute('id', 'textBox'); // border: red 4px solid;
      document.body.appendChild(textBox);
      //
      // The window box is a box that fills the window and is used to activate mouse tracking
      //
      windowBox = document.createElement('div');
      windowBox.setAttribute('class', 'window-box');
      windowBox.setAttribute('id', 'windowBox');
      document.body.appendChild(windowBox);

      windowBox.focus();

      searchBox.style.top = '0px';
      searchBox.style.left = (window.innerWidth - frameWidth) + 'px';
      searchBox.style.width = frameWidth + 'px';
      searchBox.style.height = frameWidth + 'px'; // box is currently always square
      //
      // Position the search box at the top right hand of the screen
      //
      position( window.innerWidth - frameWidth, 0);

      document.addEventListener('mousemove', update, false);
    },
    remove: function () {
      document.removeEventListener('mousemove', update, false);
      if (searchBox && searchBox.parentNode) {
        searchBox.parentNode.removeChild(searchBox);
      }
      if (windowBox && windowBox.parentNode) {
        windowBox.parentNode.removeChild(windowBox);
      }
      if (textBox && textBox.parentNode) {
        textBox.parentNode.removeChild(textBox);
      }
      
      capture.remove();
    }
  };
})();

monitor = (function () {
  function keydown (e) {
    if (e.keyCode === 27) {
      guide.remove();
      capture.remove();
      monitor.remove();
    }
  }
  return {
    install: function () {
      if ( window ) {
        window.addEventListener('keydown', keydown, false);
      } else {
      }
    },
    remove: function () {
      if ( window  )
        window.removeEventListener('keydown', keydown, false);
    }
  };
})();

guide.install();
capture.install();
monitor.install();

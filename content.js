// content.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      if( request.message == "clicked_browser_action" ) {
        // This line is new!
        chrome.runtime.sendMessage({"message": "popup", "sender": sender});
      } else if ( request.message == 'redirect') {
        window.location.replace( request.target );
      } 
    }
  );


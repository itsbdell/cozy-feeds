(function() {
    const currentUrl = encodeURIComponent(window.location.href);
    const popupUrl = '//' + window.location.hostname + '/bookmarklet-popup.html?url=' + currentUrl;
    const popupWidth = 400;
    const popupHeight = 300;
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);
    
    try {
        const popup = window.open(popupUrl, 'CozyFeedsBookmarklet', 'width=' + popupWidth + ',height=' + popupHeight + ',left=' + left + ',top=' + top);
        if (!popup || popup.closed || typeof popup.closed == 'undefined') {
            alert('Popup blocked! Please allow popups for this site and try again.');
        }
    } catch (error) {
        alert('Error opening the bookmarklet popup: ' + error.message);
    }
})();
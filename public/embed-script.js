window.addEventListener('message', function(event) {
    if (event.data.type === 'RESIZE_IFRAME') {
        const iframe = document.querySelector('iframe[src*="embed"]');
        if (iframe) {
            iframe.style.height = event.data.height + 'px';
        }
    } else if (event.data.type === 'FOLLOW_FEED') {
        console.log('Follow feed:', event.data.feedUrl);
        // Implement your follow feed logic here
    }
});
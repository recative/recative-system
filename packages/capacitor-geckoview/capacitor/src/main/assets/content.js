const runScript = (script) => {
  var element = document.createElement('script');
  element.innerHTML = script;
  document.head.appendChild(element);
};

// background ==> content
browser.runtime.onMessage.addListener((response) => {
  console.log('[MESSAGEING]', response);
  if (typeof response !== 'object') {
    return;
  }
  switch (response.type) {
    // eval script on page
    case 'eval':
      window.postMessage({
        direction: 'messaging',
        message: {
          type: response.type,
          payload: response.payload,
        },
      }, '*');
      break;
    default:
  }
});

// page ==> content
window.addEventListener('message', (event) => {
  if (
    event.source == window
    && event.data.direction
    && event.data.direction == 'page'
  ) {
    browser.runtime.sendMessage(event.data.message);
  }
});

runScript(`
  // page <== content
  window.addEventListener('message', (event) => {
  console.log('[MESSAGEING]', 'Run script done');
    if (
      event.source === window
      && event.data.direction
      && event.data.direction === 'messaging'
      && event.data.message.type === 'eval'
    ) {
      try {
        if (event.data.message.payload) {
          eval(event.data.message.payload);
          console.log('[MESSAGEING]', 'Run script done');
        } else {
          throw new Error('payload is empty');
        }
      } catch (error) {
        console.error('[MESSAGEING]', 'Run script error', error, event);
      }
    }
  });
  window.callNative = (message) => {
    window.postMessage({
      direction: 'page',
      message: message,
    }, '*');
  }
  window.androidBridge = {
    postMessage: window.callNative,
  }
  window.readyList.forEach((fn) => {
    fn();
  });
`);

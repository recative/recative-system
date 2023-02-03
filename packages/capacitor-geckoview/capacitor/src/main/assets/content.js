const syncLocalStorage = async () => {
  const port = navigator.userAgent.match(/random_port\/(\d+)/i);
  if (port && port[1]) {
    const SESSION_ID = await browser.storage.local.get('SESSION_ID');
    if (!localStorage.getItem('__OVERWRITE_SUCCESS') !== SESSION_ID) {
      const url = new URL(location.href);
      if (url.hostname === 'localhost' && url.port === port[1]) {
        browser.storage.local.get(['localStorage']).then((result) => {
          if (result['localStorage']) {
            for (key in result['localStorage']) {
              localStorage.setItem(key, result['localStorage'][key]);
            }
          }
        });
        localStorage.setItem('__OVERWRITE_SUCCESS', SESSION_ID);
      }
    }
    setInterval(() => {
      const data = JSON.parse(JSON.stringify(localStorage));
      delete data['__OVERWRITE_SUCCESS'];
      browser.storage.local.set({
        localStorage: data,
      })
    }, 1000);
  }
};

const runScript = (script) => {
  var element = document.createElement('script');
  element.innerHTML = script;
  (document.head || document.documentElement).appendChild(element);
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
    console.log('[callNative]', message);
    window.postMessage({
      direction: 'page',
      message: message,
    }, '*');
  }
  window.androidBridge = {
    postMessage: window.callNative,
  }
  window.readyList?.forEach((fn) => {
    fn();
  });
`);

runScript(`
  let count = 0;
  const intervalId = setInterval(() => {
    window.dispatchEvent(new Event('BrowserInitCompleted'));
    count += 1;
    if (count >= 10) clearInterval(intervalId);
  }, 1000);
`);

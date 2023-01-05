//
//   portDelegate.postMessage    port.onMessage
//               ┌──────────┐    ┌───────────────┐
//               │          ├───►│               │
//               │  Native  │    │ Background.js │
//               │          │◄───┤               │
//               └──────────┘    └───────────────┘
// portDelegate.onPortMessage    port.postMessage
//
//   browser.tabs.sendMessage    browser.runtime.onMessage
//          ┌───────────────┐    ┌────────────┐
//          │               ├───►│            │
//          │ Background.js │    │ Content.js │
//          │               │◄───┤            │
//          └───────────────┘    └────────────┘
//  browser.runtime.onMessage    browser.runtime.sendMessage
//
//             ┌────────────┐    ┌──────┐
//             │ Content.js │◄───┤ Page │
//             └────────────┘    └──────┘
//           window.onmessage    window.postMessage
//

const portRegex = /http\:\/\/localhost\:(\d+)(.*)&/i;
const sourceString = 'http://localhost/';

const logURL = (requestDetails) => {
  const url = requestDetails.url;
  console.log(requestDetails)
  if (url && url.slice(0, sourceString.length) === sourceString) {
    const documentUrl = new URL(requestDetails.documentUrl);
    console.log(documentUrl)
    if (documentUrl.port) {
      const redirectUrl = documentUrl.origin + '/' + url.slice(sourceString.length, url.length)
      console.log(`redirect: ${requestDetails.url} to ${redirectUrl}`);
      return { redirectUrl };
    }
  }
  console.log(`Loading: ${requestDetails.url}`);
  return;
};

browser.webRequest.onBeforeRequest.addListener(
  logURL,
  {
    urls: [
      "*://localhost/*"
    ]
  },
  ['blocking']
);

browser.webRequest.onHeadersReceived.addListener(function onHeadersReceived(resp) {
  var len = resp.responseHeaders.length;
  while(--len) {
    if(resp.responseHeaders[len].name.toLowerCase() === "access-control-allow-origin") {
      resp.responseHeaders[len].value = "*";
      break;
    }
  }
  if (len === 0) { //if we didn't find it len will be zero
    resp.responseHeaders.push({
      'name': 'Access-Control-Allow-Origin',
      'value': '*'
    });
  }
  console.log(`rewrite: ${resp.url}`);
  return {responseHeaders: resp.responseHeaders};
}, {
  urls: ['*://*.aliyuncs.com/*', '*://localhost/*'],
  /*TYPES: "main_frame", "sub_frame", "stylesheet", "script",
           "image", "object", "xmlhttprequest", "other" */
//  types: ['xmlhttprequest']
}, ['blocking', 'responseHeaders']);

// background <=> native
const port = browser.runtime.connectNative('browser');

// background <== native
port.onMessage.addListener((response) => {
  console.log('[MESSAGEING]', response, typeof response)
  if (typeof response !== 'object') {
    return;
  }
  switch (response.type) {
    case 'pageScript':
      try {
        if (response.payload) {
          browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
              browser.tabs.sendMessage(tab.id, {
                type: 'eval',
                payload: response.payload,
              });
            }
          });
        } else {
          throw new Error('payload is empty');
        }
      } catch (error) {
        console.error(`post page script error`, error, response);
      }
      break;
    case 'backgroundScript':
      try {
        if (response.payload) {
          eval(response.payload);
          console.log('[MESSAGEING]', 'Run script done');
        } else {
          throw new Error('payload is empty');
        }
      } catch (error) {
        console.error('[MESSAGEING]', `Run background script error`, error, response);
      }
      break;
    default:
  }
});

// content ==> background
browser.runtime.onMessage.addListener((request) => {
  console.log('[MESSAGEING]', 'Post to native', request);
  port.postMessage(request)
});

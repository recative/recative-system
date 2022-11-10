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


const logURL = (requestDetails) => {
  console.log(`Loading: ${requestDetails.url}`);
  // return {
  //   redirectUrl: "https://38.media.tumblr.com/tumblr_ldbj01lZiP1qe0eclo1_500.gif"
  // };
};

browser.webRequest.onBeforeRequest.addListener(
  logURL,
  {
    urls: [
      "*://localhost/*"
    ]
  },
  // ['blocking']
);

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

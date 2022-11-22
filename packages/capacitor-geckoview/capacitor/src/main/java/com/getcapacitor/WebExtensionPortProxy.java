package com.getcapacitor;


import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;
import org.mozilla.geckoview.WebExtension;

/**
 * Proxy for WebExtension.Port and IPostMessage
 * First bind port
 * Second postMessage or eval
 * Finally unbind
 */
public class WebExtensionPortProxy {
    WebExtension.Port mPort;
    IPostMessage proxy;

    WebExtensionPortProxy(IPostMessage proxy) {
        this.proxy = proxy;
    }

    public void bindPort(WebExtension.Port port, WebExtension.PortDelegate delegate) {
        mPort = port;
        mPort.setDelegate(delegate);
    }

    public void unBind() {
        mPort = null;
    }

    public void postMessage(Object message) {
        Log.i(WebExtensionPortProxy.class.getSimpleName(), message.toString());
        if (proxy != null)
            proxy.postMessage(message);
    }

    public void eval(String js) {
        if (mPort != null) {
            try {
                JSONObject json = new JSONObject().put("type", "pageScript").put("payload", js);
                mPort.postMessage(json);
                Log.i(WebExtensionPortProxy.class.getSimpleName(), json.toString());
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }
}

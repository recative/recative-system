package com.getcapacitor;


import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;
import org.mozilla.geckoview.WebExtension;

public class WebExtensionPortProxy {
    WebExtension.Port mPort;
    IPostMessage proxy;
    WebExtensionPortProxy(IPostMessage proxy){
        this.proxy = proxy;
    }
    public void bindPort(WebExtension.Port port, WebExtension.PortDelegate delegate) {
        if (mPort != null) {
            mPort = port;
            mPort.setDelegate(delegate);
        }
    }

    public void unBind() {
        mPort = null;
    }
    public void postMessage(Object message){
        Log.i(WebExtensionPortProxy.class.getSimpleName(),message.toString());
        if(proxy!=null)
            proxy.postMessage(message);
    }
    public void eval(String js){
        if(mPort!=null){
            try {
                mPort.postMessage(new JSONObject().put("evalJson",js));
                Log.i(WebExtensionPortProxy.class.getSimpleName(),"eval:"+js);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }
}

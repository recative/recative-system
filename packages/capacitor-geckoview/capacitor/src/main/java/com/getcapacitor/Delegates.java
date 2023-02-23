package com.getcapacitor;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONException;
import org.json.JSONObject;
import org.mozilla.geckoview.WebExtension;

class MessageDelegate implements WebExtension.MessageDelegate {
    WebExtensionPortProxy proxy;
    WebExtension.PortDelegate portDelegate;
    public MessageDelegate(WebExtensionPortProxy proxy,WebExtension.PortDelegate portDelegate) {
        this.proxy = proxy;
        this.portDelegate = portDelegate;
    }

    @Nullable
    @Override
    public void onConnect(@NonNull WebExtension.Port port) {
        proxy.bindPort(port,portDelegate);
    }
}

class PortDelegate implements WebExtension.PortDelegate {
    WebExtensionPortProxy proxy;

    public PortDelegate(WebExtensionPortProxy proxy) {
        this.proxy = proxy;
    }

    @Override
    public void onPortMessage(@NonNull Object message, @NonNull WebExtension.Port port) {
        Log.i(PortDelegate.class.getSimpleName(),message.toString());
        proxy.postMessage(message);
    }

    @NonNull
    @Override
    public void onDisconnect(@NonNull WebExtension.Port port) {
        this.proxy.unBind();
    }
}

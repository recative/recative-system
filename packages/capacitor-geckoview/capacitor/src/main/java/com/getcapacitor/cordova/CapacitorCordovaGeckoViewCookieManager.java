package com.getcapacitor.cordova;

import android.webkit.CookieManager;
import android.webkit.WebView;

import org.apache.cordova.ICordovaCookieManager;
import org.mozilla.geckoview.GeckoView;

public class CapacitorCordovaGeckoViewCookieManager implements ICordovaCookieManager {
    protected final GeckoView webView;
    private final CookieManager cookieManager;
    public CapacitorCordovaGeckoViewCookieManager(GeckoView webview) {
        webView = webview;
        cookieManager = CookieManager.getInstance();
        CookieManager.setAcceptFileSchemeCookies(true);
//        cookieManager.setAcceptThirdPartyCookies(webView, true);
    }
    @Override
    public void setCookiesEnabled(boolean accept) {
        // TODO: 2022/10/19 not implement it
    }

    @Override
    public void setCookie(String url, String value) {
// TODO: 2022/10/19 not implement it
    }

    @Override
    public String getCookie(String url) {
        // TODO: 2022/10/19 not implement it
        return null;
    }

    @Override
    public void clearCookies() {
// TODO: 2022/10/19 not implement it
    }

    @Override
    public void flush() {
// TODO: 2022/10/19 not implement it
    }
}

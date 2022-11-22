/**
 * Boxing some api for compatible
 */
package com.getcapacitor;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;


import org.mozilla.geckoview.GeckoResult;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoView;

public class WebviewExtension {
    private GeckoView webview;
    private boolean cansGoBack;
    public WebviewExtension(GeckoView geckoView){
        this.webview=geckoView;
    }
    public boolean canGoBack(){
        return cansGoBack;
    }
    public void goBack(){
        this.webview.getSession().goBack();
    }
    public GeckoSession getSession(){
        return this.webview.getSession();
    }
    public void setSession(GeckoSession session){
        this.webview.setSession(session);
        this.webview.getSession().setNavigationDelegate(new GeckoSession.NavigationDelegate() {
            @Override
            public void onCanGoBack(@NonNull GeckoSession session, boolean canGoBack) {
                cansGoBack = canGoBack;
            }
        });
        this.webview.getSession().setPermissionDelegate(new GeckoSession.PermissionDelegate() {
            @Nullable
            @Override
            public GeckoResult<Integer> onContentPermissionRequest(@NonNull GeckoSession session, @NonNull ContentPermission perm) {
                 if(perm.permission == GeckoSession.PermissionDelegate.PERMISSION_AUTOPLAY_AUDIBLE|| perm.permission == GeckoSession.PermissionDelegate.PERMISSION_AUTOPLAY_INAUDIBLE){
                    GeckoResult s = new GeckoResult<Integer>();
                    return GeckoResult.fromValue(ContentPermission.VALUE_ALLOW);
                }else {
                     return GeckoSession.PermissionDelegate.super.onContentPermissionRequest(session, perm);
                 }
            }}
        );
    }
    public GeckoView getWebview() {
        return webview;
    }
}

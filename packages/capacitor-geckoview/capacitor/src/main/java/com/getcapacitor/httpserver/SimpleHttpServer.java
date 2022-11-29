package com.getcapacitor.httpserver;

import static com.getcapacitor.Logger.config;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.text.TextUtils;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSExport;
import com.getcapacitor.JSExportException;
import com.getcapacitor.Logger;
import com.getcapacitor.PluginConfig;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.WebViewLocalServer;
import com.getcapacitor.android.BuildConfig;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

class FileDownloadResponse extends NanoHTTPD.Response {
    public FileDownloadResponse(String mimeType, InputStream inputStream, Long length) {
        super(Status.OK, mimeType, inputStream, length);
    }
}
class NanoHttpDRequest implements WebResourceRequest{
    Uri uri;
    Map<String,String> headers=new HashMap<>();
    String method;
    int port=0;
    public NanoHttpDRequest(NanoHTTPD.IHTTPSession session,int port){
        this.uri=Uri.parse("http://"+session.getRemoteHostName()+":"+port+session.getUri());
        this.headers=session.getHeaders();
        this.method=session.getMethod().name();
        this.port=port;
    }
    @Override
    public Uri getUrl() {
        return uri;
    }

    @Override
    public boolean isForMainFrame() {
        return false;
    }

    @Override
    public boolean isRedirect() {
        return false;
    }

    @Override
    public boolean hasGesture() {
        return false;
    }

    @Override
    public String getMethod() {
        return method;
    }

    @Override
    public Map<String, String> getRequestHeaders() {
        return headers;
    }
}

public class SimpleHttpServer extends NanoHTTPD {
    Context context;
    Bridge bridge;
    public SimpleHttpServer(Context context, Bridge bridge) {
        super(bridge.getConfig().getPort());
        this.context = context;
        this.bridge = bridge;
    }
    @Override
    public Response serve(IHTTPSession session) {
        WebResourceRequest request = new NanoHttpDRequest(session,getListeningPort());
        WebResourceResponse response = this.bridge.getLocalServer().shouldInterceptRequest(request);
        Response result = null;
        InputStream inputStream = null;
        try {
            inputStream = response.getData();
            int length = inputStream.available();
            String mimeType = response.getMimeType();
            result = new FileDownloadResponse(mimeType,inputStream,(long)length);
        } catch (IOException e) {
            e.printStackTrace();
            result = newFixedLengthResponse(Response.Status.NOT_FOUND,"text","File not found");
        }
        return result;
    }
}

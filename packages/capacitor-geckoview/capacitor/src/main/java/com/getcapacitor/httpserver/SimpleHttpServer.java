package com.getcapacitor.httpserver;

import android.content.Context;
import android.net.Uri;
import android.text.TextUtils;
import android.util.Log;
import java.io.IOException;
import java.io.InputStream;

import fi.iki.elonen.NanoHTTPD;

class FileDownloadResponse extends NanoHTTPD.Response {
    public FileDownloadResponse(String mimeType, InputStream inputStream, Long length) {
        super(Status.OK, mimeType, inputStream, length);
    }
}

public class SimpleHttpServer extends NanoHTTPD {
    Context context;

    public SimpleHttpServer(Context context,int port) {
        super(port);
        this.context = context;
    }

    @Override
    public Response serve(IHTTPSession session) {
        Uri sourceUri = Uri.parse(TextUtils.isEmpty(session.getUri())||session.getUri().equals("/")?"/index.html":session.getUri());
        Uri uri = Uri.parse("/public"+sourceUri.getPath());
        Log.i("NanoHttpServer", "uri:" + uri.toString());
        String path = uri.getPath().replaceFirst("/", "");
        InputStream inputStream = null;
        Response response = null;
        try {
            inputStream = context.getAssets().open(path);
            int length = inputStream.available();
            String mimeType = getMimeTypeForFile(uri.toString());
            response =new FileDownloadResponse(mimeType, inputStream, (long) length);
        } catch (IOException e) {
            e.printStackTrace();
            response = newFixedLengthResponse(Response.Status.NOT_FOUND,"text","File not found");
        }
        return response;
    }
}

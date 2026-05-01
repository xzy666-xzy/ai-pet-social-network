package com.wepet.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getWindow().setBackgroundDrawableResource(com.wepet.app.R.color.splash_background);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#FF6A00"));
    }
}

package com.cliqz.browser.tabs;

import android.os.Message;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.main.TabFragment2;

import acr.browser.lightning.view.CliqzWebView;

class TabImpl extends Tab {

    final TabFragment2 fragment;
    private CliqzWebView cachedWebView;
    private Message message;

    TabImpl(@NonNull String id,
            @Nullable String parentId,
            @NonNull TabFragment2 fragment) {
        super(id, parentId);
        this.fragment = fragment;
    }

    @Nullable
    @Override
    public Message fetchMessage() {
        final Message msg = message;
        message = null;
        return msg;
    }

    @Override
    public boolean hasToLoad() {
        final String url = getUrl();
        return  cachedWebView != null &&
                !url.isEmpty() &&
                !url.equals(cachedWebView.getUrl());
    }

    @Nullable
    CliqzWebView getCachedWebView() {
        return cachedWebView;
    }

    void setCachedWebView(@Nullable CliqzWebView webView) {
        cachedWebView = webView;
    }

    void setMessage(@NonNull Message message) {
        this.message = message;
    }
}

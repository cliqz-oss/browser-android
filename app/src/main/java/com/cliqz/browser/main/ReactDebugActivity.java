package com.cliqz.browser.main;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.jsengine.Engine;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnTextChanged;

/**
 * Helper activity to debug reactnative based search
 *
 * @author Stefano Pacifici
 */
public class ReactDebugActivity extends Activity implements DefaultHardwareBackBtnHandler {

    private Engine mEngine;

    @BindView(R.id.reactViewContainer)
    FrameLayout reactViewContainer;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            mEngine = component.getEngine();
        }
        setContentView(R.layout.react_debug_activity);
        ButterKnife.bind(this);
        reactViewContainer.addView(mEngine.reactRootView);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mEngine.reactInstanceManager != null) {
            mEngine.reactInstanceManager.onHostPause(this);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mEngine.reactInstanceManager != null) {
            mEngine.reactInstanceManager.onHostResume(this, this);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mEngine.reactInstanceManager != null) {
            mEngine.reactInstanceManager.onHostDestroy();
        }
    }

    @Override
    public void onBackPressed() {
        if (mEngine.reactInstanceManager != null) {
            mEngine.reactInstanceManager.onBackPressed();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU && mEngine.reactInstanceManager != null) {
            mEngine.reactInstanceManager.showDevOptionsDialog();
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public void invokeDefaultOnBackPressed() {
        onBackPressed();
    }


    @OnTextChanged(R.id.searchBox)
    void onTextChanged(CharSequence text) {
        try {
            mEngine.getBridge().publishEvent("search", text.toString());
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            engineNotYetAvailable.printStackTrace();
        }
    }

}
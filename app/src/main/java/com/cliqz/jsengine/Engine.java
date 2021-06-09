package com.cliqz.jsengine;

import android.app.Application;

import com.bebnev.RNUserAgentPackage;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.ReactSearchPackage;
import com.cliqz.nove.Bus;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;
import com.facebook.react.shell.MainReactPackage;
import com.oney.WebRTCModule.WebRTCModulePackage;
import com.reactlibrary.RNSqlite2Package;
import com.rnfs.RNFSPackage;

import java.util.LinkedList;
import java.util.List;

import cl.json.RNSharePackage;
import timber.log.Timber;

/**
 * @author Sam Macbeth
 */
public class Engine implements ReactInstanceManager.ReactInstanceEventListener {
    private static final String TAG = Engine.class.getSimpleName();
    public final ReactRootView reactRootView;
    public final ReactRootView offboaringView;
    public final ReactInstanceManager reactInstanceManager;
    private List<Runnable> startupCallbacks = new LinkedList<>();
    private ReactContext mReactContext = null;
    private final EngineQueuingThread engineQueuingThread;

    private JSBridge mJSBridge;

    public Engine(final Application app, Bus bus) {
        reactRootView = new ReactRootView(app);
        offboaringView = new ReactRootView(app);
        reactInstanceManager = ReactInstanceManager.builder()
                .setApplication(app)
                .setBundleAssetName("jsengine.bundle.js")
                .setJSMainModulePath("index")
                .addPackage(new MainReactPackage())
                .addPackage(new RNFSPackage())
                .addPackage(new RNSqlite2Package())
                .addPackage(new JSEngineReactPackage(this, bus))
                .addPackage(new ReactSearchPackage(bus))
                .addPackage(new RNSharePackage())
                .addPackage(new RNUserAgentPackage())
                .addPackage(new WebRTCModulePackage())
                .setUseDeveloperSupport(BuildConfig.DEBUG)
                .setInitialLifecycleState(LifecycleState.RESUMED)
                .build();

        // increase database space (default is 6MB), as suggested by https://github.com/stockulus/pouchdb-react-native
        long size = 50L * 1024L * 1024L; // 50 MB
        ReactDatabaseSupplier.getInstance(app).setMaximumSize(size);

        reactInstanceManager.addReactInstanceEventListener(this);
        reactInstanceManager.createReactContextInBackground();
        reactRootView.startReactApplication(reactInstanceManager, "ExtensionApp", null);
        offboaringView.startReactApplication(reactInstanceManager, "Offboarding", null);
        engineQueuingThread = new EngineQueuingThread(this);
        engineQueuingThread.start();
    }

    public void callAction(final String functionName, final JSBridge.Callback callback, final Object... args) {
        engineQueuingThread.getHandler().post(() -> {
            try {
                getBridge().callAction(functionName, callback, args);
            } catch (EngineNotYetAvailable engineNotYetAvailable) {
                Timber.e(engineNotYetAvailable, "Engine not available");
            }
        });
    }

    public void publishEvent(final String eventName, final Object... args) {
        engineQueuingThread.getHandler().post(() -> {
            try {
                getBridge().publishEvent(eventName, args);
            } catch (EngineNotYetAvailable engineNotYetAvailable) {
                Timber.e(engineNotYetAvailable, "Engine not available");
            }
        });
    }

    public JSBridge getBridge() throws EngineNotYetAvailable {
        if (mReactContext != null) {
            if (mJSBridge == null) {
                mJSBridge = mReactContext.getNativeModule(JSBridge.class);
            }
            return mJSBridge;
        }
        throw new EngineNotYetAvailable();
    }

    public WebRequest getWebRequest() throws EngineNotYetAvailable {
        if (mReactContext != null) {
            return mReactContext.getNativeModule(WebRequest.class);
        }
        throw new EngineNotYetAvailable();
    }

    void setPref(String pref, Object value) {
        this.callAction("core:setPref", new JSBridge.NoopCallback(), pref, value);
    }

    void setBridgeIsReady() {
        for (Runnable cb : this.startupCallbacks) {
            cb.run();
        }
    }

    void registerStartupCallback(Runnable callback) {
        this.startupCallbacks.add(callback);
    }

    public void showDebugMenu() {
        reactInstanceManager.getDevSupportManager().showDevOptionsDialog();
    }

    @Override
    public void onReactContextInitialized(ReactContext context) {
        mReactContext = context;
    }
}

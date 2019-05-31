package com.cliqz.browser.app;

import com.cliqz.browser.abtesting.ABTestFetcher;
import com.cliqz.browser.connect.PairedDevicesFragment;
import com.cliqz.browser.connect.SyncActivity;
import com.cliqz.browser.controlcenter.ControlCenterComponent;
import com.cliqz.browser.controlcenter.ControlCenterModule;
import com.cliqz.browser.gcm.MessageListenerService;
import com.cliqz.browser.gcm.NotificationDismissedReceiver;
import com.cliqz.browser.gcm.RegistrationIntentService;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.MainActivityModule;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.main.SearchModule;
import com.cliqz.browser.main.SubscriptionModule;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.main.search.TopsitesAdapter;
import com.cliqz.browser.peercomm.PeerCommBridge;
import com.cliqz.browser.peercomm.PeerWebView;
import com.cliqz.browser.qrscanner.CaptureFragment;
import com.cliqz.browser.qrscanner.CodeScannerActivity;
import com.cliqz.browser.reactnative.AutoCompletion;
import com.cliqz.browser.reactnative.BrowserActions;
import com.cliqz.browser.reactnative.GeoLocationModule;
import com.cliqz.browser.reactnative.PermissionManagerModule;
import com.cliqz.browser.reactnative.QuerySuggestion;
import com.cliqz.browser.reactnative.SearchEnginesModule;
import com.cliqz.browser.reactnative.TelemetryModule;
import com.cliqz.browser.settings.BaseSettingsFragment;
import com.cliqz.browser.telemetry.InstallReferrerReceiver;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.HistoryCleaner;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.browser.webview.Bridge;
import com.cliqz.browser.widget.AutocompleteEditText;
import com.cliqz.browser.widget.SearchBar;
import com.cliqz.jsengine.Engine;

import javax.inject.Singleton;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.preference.PreferenceManager;
import dagger.Component;

/**
 * @author Stefano Pacifici
 */
@Singleton
@Component(modules = {AppModule.class})
public interface AppComponent {

    PreferenceManager getPreferenceManager();

    Telemetry getTelemetry();

    Timings getTimings();

    HistoryDatabase getHistoryDatabase();

    /**
     * This method is used in code that is not part of the release build
     *
     * @return the js engine (ReactNative)
     */
    Engine getEngine();

    FlavoredActivityComponent plus(MainActivityModule module);

    ControlCenterComponent plus(ControlCenterModule dialog);

    void inject(BaseSettingsFragment baseSettingsFragment);

    void inject(AutocompleteEditText autocompleteEditText);

    void inject(HistoryCleaner historyCleaner);

    void inject(RegistrationIntentService registrationIntentService);

    void inject(NotificationDismissedReceiver notificationDismissedReceiver);

    void inject(InstallReferrerReceiver installReferrerReceiver);

    void inject(TabsManager tabsManager);

    void inject(SettingsActivity settingsActivity);

    void inject(OnBoardingHelper onBoardingHelper);

    void inject(Bridge bridge);

    void inject(PeerCommBridge peerCommBridge);

    void inject(PairedDevicesFragment fragment);

    void inject(SyncActivity activity);

    void inject(CaptureFragment captureFragment);

    void inject(TopsitesAdapter topsitesAdapter);

    void inject(ABTestFetcher abTestFetcher);

    void inject(WebViewPersister webViewPersister);

    void inject(BrowserActions browserActions);

    void inject(SearchModule searchModule);

    void inject(LightningDownloadListener lightningDownloadListener);

    void inject(MessageListenerService messageListenerService);

    void inject(CodeScannerActivity codeScannerActivity);

    void inject(SearchBar searchBar);

    void inject(PeerWebView peerWebView);

    void inject(SubscriptionModule subscriptionModule);

    void inject(QuerySuggestion querySuggestion);

    void inject(AutoCompletion autoCompletion);

    void inject(PermissionManagerModule permissionManagerModule);

    void inject(TelemetryModule telemetryModule);

    void inject(GeoLocationModule geoLocationModule);

    void inject(SearchEnginesModule searchEnginesModule);

    void inject(BrowserApp browserApp);

}

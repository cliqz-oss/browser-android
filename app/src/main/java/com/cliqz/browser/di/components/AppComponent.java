package com.cliqz.browser.di.components;

import com.cliqz.browser.di.modules.AppModule;
import com.cliqz.browser.di.modules.MainActivityModule;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.settings.BaseSettingsFragment;
import com.cliqz.browser.utils.HistoryCleaner;
import com.cliqz.browser.utils.InstallReferrerReceiver;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.Timings;
import com.cliqz.browser.widget.AutocompleteEditText;

import javax.inject.Singleton;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.activity.ThemableBrowserActivity;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import dagger.Component;

/**
 * Created by Stefano Pacifici on 01/09/15.
 */
@Singleton
@Component(modules = {AppModule.class})
public interface AppComponent {

    PreferenceManager getPreferenceManager();

    Telemetry getTelemetry();

    LocationCache getLocationCache();

    Timings getTimings();

    HistoryDatabase getHistoryDatabase();

    void inject(ThemableBrowserActivity activity);

    void inject(BaseSettingsFragment baseSettingsFragment);

    void inject(AutocompleteEditText autocompleteEditText);

    void inject(Telemetry telemetry);

    void inject(PasswordManager passwordManager);

    ActivityComponent plus(MainActivityModule module);

    void inject(HistoryCleaner historyCleaner);

    void inject(InstallReferrerReceiver installReferrerReceiver);

    void inject(TabsManager tabsManager);

    void inject(SettingsActivity settingsActivity);
}

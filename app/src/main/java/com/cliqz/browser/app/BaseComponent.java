package com.cliqz.browser.app;

import com.cliqz.browser.gcm.NotificationDismissedReceiver;
import com.cliqz.browser.main.AppUpdateReceiver;
import com.cliqz.browser.telemetry.InstallReferrerReceiver;
import com.cliqz.browser.gcm.MessageListenerService;

import javax.inject.Singleton;

import dagger.Component;

/**
 * Generally used as a fallback component for receivers. On Android 6.0, in particular, receivers
 * are often not associated with a {@link com.cliqz.browser.app.BrowserApp} instance
 *
 * @author Stefano Pacifici
 */
@Singleton
@Component(modules = BaseModule.class)
public interface BaseComponent {
    void inject(InstallReferrerReceiver installReferrerReceiver);

    void inject(NotificationDismissedReceiver notificationDismissedReceiver);

    void inject(AppUpdateReceiver appUpdateReceiver);

    void inject(MessageListenerService messageListenerService);
}

package acr.browser.lightning.utils;

import android.app.Activity;
import android.content.DialogInterface;
import android.support.v7.app.AlertDialog;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

import net.i2p.android.ui.I2PAndroidHelper;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import info.guardianproject.netcipher.proxy.OrbotHelper;
import info.guardianproject.netcipher.web.WebkitProxy;

/**
 * 6/4/2015 Anthony Restaino
 */
public class ProxyUtils {

    /**
     * The state of the proxy
     */
    public enum ProxyState {
        /**
         * The proxy is ready to forward your requests
         */
        READY,
        /**
         * If the user set the I2P proxy, I2P is not running
         */
        I2P_NOT_RUNNING,
        /**
         * If the user set the I2P proxy, I2P is not ready
         */
        I2P_TUNNELS_NOT_READY
    }

    private static boolean I2PHelperBound;
    private static boolean mI2PProxyInitialized;
    private final PreferenceManager preferences;
    private final I2PAndroidHelper I2PHelper;

    public ProxyUtils(PreferenceManager preferences, I2PAndroidHelper I2PHelper) {
        this.preferences = preferences;
        this.I2PHelper = I2PHelper;
    }

    /*
     * If Orbot/Tor or I2P is installed, prompt the user if they want to enable
     * proxying for this session
     */
    public void checkForProxy(final Activity activity) {
        boolean useProxy = preferences.getUseProxy();

        final boolean orbotInstalled = OrbotHelper.isOrbotInstalled(activity);
        boolean orbotChecked = preferences.getCheckedForTor();
        boolean orbot = orbotInstalled && !orbotChecked;

        boolean i2pInstalled = I2PHelper.isI2PAndroidInstalled();
        boolean i2pChecked = preferences.getCheckedForI2P();
        boolean i2p = i2pInstalled && !i2pChecked;

        // TODO Is the idea to show this per-session, or only once?
        if (!useProxy && (orbot || i2p)) {
            if (orbot) preferences.setCheckedForTor(true);
            if (i2p) preferences.setCheckedForI2P(true);
            AlertDialog.Builder builder = new AlertDialog.Builder(activity);

            if (orbotInstalled && i2pInstalled) {
                String[] proxyChoices = activity.getResources().getStringArray(R.array.proxy_choices_array);
                builder.setTitle(activity.getResources().getString(R.string.http_proxy))
                        .setSingleChoiceItems(proxyChoices, preferences.getProxyChoice(),
                                new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int which) {
                                        preferences.setProxyChoice(which);
                                    }
                                })
                        .setNeutralButton(activity.getResources().getString(R.string.action_ok),
                                new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int which) {
                                        if (preferences.getUseProxy())
                                            initializeProxy(activity);
                                    }
                                });
            } else {
                DialogInterface.OnClickListener dialogClickListener = new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        switch (which) {
                            case DialogInterface.BUTTON_POSITIVE:
                                preferences.setProxyChoice(orbotInstalled ?
                                        Constants.PROXY_ORBOT : Constants.PROXY_I2P);
                                initializeProxy(activity);
                                break;
                            case DialogInterface.BUTTON_NEGATIVE:
                                preferences.setProxyChoice(Constants.NO_PROXY);
                                break;
                        }
                    }
                };

                builder.setMessage(orbotInstalled ? R.string.use_tor_prompt : R.string.use_i2p_prompt)
                        .setPositiveButton(R.string.yes, dialogClickListener)
                        .setNegativeButton(R.string.no, dialogClickListener);
            }
            builder.show();
        }
    }

    /*
     * Initialize WebKit Proxying
     */
    private void initializeProxy(Activity activity) {
        String host;
        int port;

        switch (preferences.getProxyChoice()) {
            case Constants.NO_PROXY:
                // We shouldn't be here
                return;

            case Constants.PROXY_ORBOT:
                if (!OrbotHelper.isOrbotRunning(activity))
                    OrbotHelper.requestStartTor(activity);
                host = "localhost";
                port = 8118;
                break;

            case Constants.PROXY_I2P:
                mI2PProxyInitialized = true;
                if (I2PHelperBound && !I2PHelper.isI2PAndroidRunning()) {
                    I2PHelper.requestI2PAndroidStart(activity);
                }
                host = "localhost";
                port = 4444;
                break;

            default:
                host = preferences.getProxyHost();
                port = preferences.getProxyPort();
        }

        try {
            WebkitProxy.setProxy(BrowserApp.class.getName(), activity.getApplicationContext(), null, host, port);
        } catch (Exception e) {
            Log.d(Constants.TAG, "error enabling web proxying", e);
        }

    }

    public ProxyState getProxyState() {
        if (preferences.getProxyChoice() == Constants.PROXY_I2P) {
            if (!I2PHelper.isI2PAndroidRunning()) {
                // bus.post(new BrowserEvents.ShowSnackBarMessage(R.string.i2p_not_running));
                return ProxyState.I2P_NOT_RUNNING;
            } else if (!I2PHelper.areTunnelsActive()) {
                // bus.post(new BrowserEvents.ShowSnackBarMessage(R.string.i2p_tunnels_not_ready));
                return ProxyState.I2P_TUNNELS_NOT_READY;
            }
        }

        return ProxyState.READY;
    }

    public void updateProxySettings(Activity activity) {
        if (preferences.getUseProxy()) {
            initializeProxy(activity);
        } else {
            try {
                WebkitProxy.resetProxy(BrowserApp.class.getName(), activity.getApplicationContext());
            } catch (Exception e) {
                e.printStackTrace();
            }

            mI2PProxyInitialized = false;
        }
    }

    public void onStop() {
        I2PHelper.unbind();
        I2PHelperBound = false;
    }

    public void onStart(final Activity activity) {
        if (preferences.getProxyChoice() == Constants.PROXY_I2P) {
            // Try to bind to I2P Android
            I2PHelper.bind(new I2PAndroidHelper.Callback() {
                @Override
                public void onI2PAndroidBound() {
                    I2PHelperBound = true;
                    if (mI2PProxyInitialized && !I2PHelper.isI2PAndroidRunning())
                        I2PHelper.requestI2PAndroidStart(activity);
                }
            });
        }
    }

    public static int setProxyChoice(int choice, Activity activity) {
        switch (choice) {
            case Constants.PROXY_ORBOT:
                if (!OrbotHelper.isOrbotInstalled(activity)) {
                    choice = Constants.NO_PROXY;
                    Utils.showSnackbar(activity, R.string.install_orbot);
                }
                break;

            case Constants.PROXY_I2P:
                I2PAndroidHelper ih = new I2PAndroidHelper(BrowserApp.getAppContext());
                if (!ih.isI2PAndroidInstalled()) {
                    choice = Constants.NO_PROXY;
                    ih.promptToInstall(activity);
                }
                break;
            case Constants.PROXY_MANUAL:
                break;
        }
        return choice;
    }
}

package com.cliqz.browser.main;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.res.Resources;
import android.graphics.Rect;
import android.support.annotation.IdRes;
import android.support.annotation.NonNull;
import android.support.annotation.StringRes;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.TelemetryKeys;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Callable;

import acr.browser.lightning.utils.Utils;
import uk.co.deanwild.materialshowcaseview.IShowcaseListener;
import uk.co.deanwild.materialshowcaseview.MaterialShowcaseView;

/**
 * @author Stefano Pacifici
 * @date 2016/09/06
 */
public class OnBoardingHelper {

    public static final String ONBOARDING_VERSION = "1.2";
    private static final String TAG = OnBoardingHelper.class.getSimpleName();
    private static final String ONBOARDING_PREFERENCES_NAME = TAG + ".preferences";
    private String currentView;
    private long startTime;

    private enum Names {
        SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION(TAG + ".should_show_anti_tracking_description"),
        SHOULD_SHOW_SEARCH_DESCRIPTION(TAG + ".should_show_search_description"),
        SHOULD_SHOW_ONBOARDING(TAG + ".should_show_onboarding");

        final String preferenceName;

        Names(String preferenceName) {
            this.preferenceName = preferenceName;
        }
    }

    private final MainActivity mainActivity;
    private final SharedPreferences manager;

    private View mOnBoarding = null;

    public OnBoardingHelper(MainActivity mainActivity) {
        this.mainActivity = mainActivity;
        this.manager = mainActivity.getSharedPreferences(ONBOARDING_PREFERENCES_NAME,
                Activity.MODE_PRIVATE);
    }

    public static void forceHide(Context context) {
        setAllPreferences(context, false);
    }

    public static void forceShow(Context context) {
        setAllPreferences(context, true);
    }

    private static void setAllPreferences(Context context, boolean value) {
        final SharedPreferences.Editor editor =
                context
                        .getSharedPreferences(ONBOARDING_PREFERENCES_NAME, Activity.MODE_PRIVATE)
                        .edit();
        for (Names name: Names.values()) {
            // You can not reset on boarding
            if (name != Names.SHOULD_SHOW_ONBOARDING) {
                editor.putBoolean(name.preferenceName, value);
            }
        }
        editor.apply();
    }

    public boolean isOnboardingCompleted() {
        return manager.getBoolean(Names.SHOULD_SHOW_ONBOARDING.preferenceName, true);
    }

    public boolean conditionallyShowOnBoarding(final Callable<Void> callback) {
        final boolean shouldShow = manager.getBoolean(Names.SHOULD_SHOW_ONBOARDING.preferenceName, true);

        if (!shouldShow || mOnBoarding != null) {
            return false;
        }
        manager.edit().putBoolean(Names.SHOULD_SHOW_ONBOARDING.preferenceName, false).apply();

        mOnBoarding = LayoutInflater.from(mainActivity)
                .inflate(R.layout.on_boarding, null);

        mOnBoarding.findViewById(R.id.next).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                hideOnBoarding();
            }
        });
        mOnBoarding.setTag(callback);

        mainActivity.setContentView(mOnBoarding);

        return true;
    }

    public boolean conditionallyShowAntiTrackingDescription() {
        return showShowcase(Names.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION.preferenceName,
                            R.string.showcase_antitracking_title,R.string.showcase_antitracking_message,
                            R.id.anti_tracking_details);
    }

    public boolean conditionallyShowSearchDescription() {
        return showShowcase(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName,
                            R.string.showcace_search_title,R.string.showcase_search_message,
                            R.id.onboarding_view_marker);
    }

    private boolean showShowcase(@NonNull String preference, @StringRes int title,
                                 @StringRes int message, @IdRes int anchor) {
        final View anchorView = mainActivity.findViewById(anchor);
        final boolean shouldShow =
                manager.getBoolean(preference, true);
        final boolean anchorIsVisible = checkAnchorVisibility(anchorView);

        if (anchorView == null || !shouldShow || !anchorIsVisible) {
            return false;
        }

        if (preference.equals(Names.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION.preferenceName)) {
            mainActivity.telemetry.sendAttrackShowCaseSignal();
        } else if (preference.equals(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName)) {
            mainActivity.telemetry.sendCardsShowCaseSignal();
        }

        currentView = preference;
        startTime = System.currentTimeMillis();

        mainActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        manager.edit().putBoolean(preference, false).apply();

        final Resources resources = mainActivity.getResources();
        final int backgroundColor = resources.getColor(R.color.showcase_background_color);
        final int titleColor = resources.getColor(R.color.showcase_title_color);
        final int messageColor = resources.getColor(R.color.showcase_message_color);

        new MaterialShowcaseView.Builder(mainActivity)
                .setTarget(anchorView)
                .setMaskColour(backgroundColor)
                .setDismissText(mainActivity.getString(R.string.got_it).toUpperCase(Locale.getDefault()))
                .setDismissTextColor(titleColor)
                .setContentText(message)
                .setContentTextColor(messageColor)
                .setTitleText(title)
                .setTitleTextColor(titleColor)
                .setShapePadding(Utils.dpToPx(10))
                .show()
                .addShowcaseListener(showcaseListener);

        return true;
    }

    private boolean checkAnchorVisibility(View anchorView) {
        final Rect rect = new Rect();
        final boolean visible = anchorView.getGlobalVisibleRect(rect);
        return visible;
    }

    public boolean close() {
        return showcaseListener.closeAllShowcases() || hideOnBoarding();
    }

    private boolean hideOnBoarding() {
        if (mOnBoarding == null) {
            return false;
        }
        // Can't be removed from parent (bug on Android 6.0.1?)
        mOnBoarding.setVisibility(View.GONE);
        try {
            Callable.class.cast(mOnBoarding.getTag()).call();
        } catch (Throwable e) {
            Log.e(TAG, "This should never happen", e);
        }
        mOnBoarding = null;
        return true;
    }

    private final ShowcaseListener showcaseListener = new ShowcaseListener();

    private class ShowcaseListener implements IShowcaseListener {
        private final Set<MaterialShowcaseView> views = new HashSet<>();

        @Override
        public void onShowcaseDisplayed(MaterialShowcaseView materialShowcaseView) {
            views.add(materialShowcaseView);
        }

        @Override
        public void onShowcaseDismissed(MaterialShowcaseView materialShowcaseView) {
            mainActivity.telemetry.sendShowCaseDoneSignal(currentView.equals(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName)
            ? TelemetryKeys.CARDS : TelemetryKeys.ATTRACK, System.currentTimeMillis() - startTime);
            views.remove(materialShowcaseView);
            mainActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        boolean closeAllShowcases() {
            boolean result = false;
            for (MaterialShowcaseView view: views) {
                result = true;
                view.hide();
            }
            views.clear();
            mainActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            return result;
        }

    };

}

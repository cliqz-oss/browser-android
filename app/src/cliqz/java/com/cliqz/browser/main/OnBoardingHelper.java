package com.cliqz.browser.main;

import android.content.pm.ActivityInfo;
import android.content.res.Resources;
import android.graphics.Rect;
import android.text.Spannable;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.core.content.ContextCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.utils.SpannableUtils;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Callable;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.Utils;
import timber.log.Timber;
import uk.co.deanwild.materialshowcaseview.IShowcaseListener;
import uk.co.deanwild.materialshowcaseview.MaterialShowcaseView;

import static android.util.TypedValue.COMPLEX_UNIT_PX;
import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;

/**
 * @author Stefano Pacifici
 */
public class OnBoardingHelper {

    public static final String ONBOARDING_VERSION = "1.2";
    private static final String TAG = OnBoardingHelper.class.getSimpleName();
    private String currentView;
    private long startTime;
    private MaterialShowcaseView showcaseView = null;

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

    @SuppressWarnings("WeakerAccess")
    @Inject
    PreferenceManager preferences;

    private View mOnBoarding = null;

    OnBoardingHelper(MainActivity mainActivity) {
        this.mainActivity = mainActivity;
        BrowserApp.getAppComponent().inject(this);
    }

    boolean conditionallyShowAntiTrackingDescription() {
        return showShowcase(Names.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION.preferenceName,
                R.string.showcase_antitracking_title, R.string.showcase_antitracking_message,
                R.id.control_center);
    }

    boolean conditionallyShowSearchDescription() {
        return showShowcase(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName,
                R.string.showcace_search_title, R.string.showcase_search_message,
                R.id.onboarding_view_marker);
    }

    @SuppressWarnings("SimplifiableIfStatement")
    private boolean showShowcase(@NonNull String preference, @StringRes int title,
                                 @StringRes int message, @IdRes int anchor) {
        final View anchorView = mainActivity.findViewById(anchor);
        final boolean shouldShow;
        if (preference.equals(Names.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION.preferenceName)) {
            shouldShow = preferences.getShouldShowAntiTrackingDescription();
        } else if (preference.equals(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName)) {
            shouldShow = preferences.getShouldShowSearchDescription();
        } else {
            shouldShow = false;
        }

        final boolean isAnotherShowcaseVisible = showcaseView != null &&
                showcaseView.getVisibility() == View.VISIBLE;
        final boolean anchorIsVisible = checkAnchorVisibility(anchorView);

        if (anchorView == null || !shouldShow || !anchorIsVisible || isAnotherShowcaseVisible) {
            return false;
        }

        if (preference.equals(Names.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION.preferenceName)) {
            mainActivity.telemetry.sendAttrackShowCaseSignal();
            preferences.setShouldShowAntiTrackingDescription(false);
        } else if (preference.equals(Names.SHOULD_SHOW_SEARCH_DESCRIPTION.preferenceName)) {
            mainActivity.telemetry.sendCardsShowCaseSignal();
            preferences.setShouldShowSearchDescription(false);
        }

        currentView = preference;
        startTime = System.currentTimeMillis();

        mainActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        preferences.setShouldShowOnboarding(false);

        final int backgroundColor = ContextCompat.getColor(mainActivity, R.color.showcase_background_color);
        final int titleColor = ContextCompat.getColor(mainActivity, R.color.showcase_title_color);
        final int messageColor = ContextCompat.getColor(mainActivity, R.color.showcase_message_color);
        final Spannable spannedMessage =
                SpannableUtils.markdownStringToSpannable(mainActivity, message);
        final MaterialShowcaseView showcaseView = new MaterialShowcaseView.Builder(mainActivity)
                .setTarget(anchorView)
                .setMaskColour(backgroundColor)
                .setDismissText(mainActivity.getString(R.string.got_it).toUpperCase(Locale.getDefault()))
                .setDismissTextColor(titleColor)
                .setContentText(spannedMessage)
                .setContentTextColor(messageColor)
                .setTitleText(title)
                .setTitleTextColor(titleColor)
                .setShapePadding(Utils.dpToPx(10))
                .build();
        final Resources res = mainActivity.getResources();
        final TextView contentTextView = (TextView) showcaseView.findViewById(R.id.tv_content);
        contentTextView.setAlpha(1.0f);
        contentTextView.setTextSize(COMPLEX_UNIT_PX,res.getDimension(R.dimen.on_boarding_content));
        ((TextView) showcaseView.findViewById(R.id.tv_title)).setTextSize(COMPLEX_UNIT_PX,
                res.getDimension(R.dimen.on_boarding_title));
        ((TextView) showcaseView.findViewById(R.id.tv_dismiss)).setTextSize(COMPLEX_UNIT_PX,
                res.getDimension(R.dimen.on_boarding_dismiss));

        DisplayMetrics displayMetrics = new DisplayMetrics();
        mainActivity.getWindowManager().getDefaultDisplay().getMetrics(displayMetrics);
        final int height = displayMetrics.heightPixels;
        showcaseView.setLayoutParams(new ViewGroup.LayoutParams(MATCH_PARENT,height));
        showcaseView.show(mainActivity);
        showcaseView.addShowcaseListener(showcaseListener);
        return true;
    }

    private boolean checkAnchorVisibility(@Nullable View anchorView) {
        final Rect rect = new Rect();
        return anchorView != null && anchorView.getGlobalVisibleRect(rect);
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
            Timber.e(e, "This should never happen");
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
            for (MaterialShowcaseView view : views) {
                result = true;
                view.hide();
            }
            views.clear();
            mainActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            return result;
        }

    }
}

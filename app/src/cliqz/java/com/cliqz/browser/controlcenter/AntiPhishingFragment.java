package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.os.Bundle;
import androidx.annotation.LayoutRes;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatButton;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
public class AntiPhishingFragment extends ControlCenterFragment {

    private static final String antiPhishingHelupUrlDe = "https://cliqz.com/whycliqz/anti-phishing";
    private static final String antiPhishingHelupUrlEn = "https://cliqz.com/en/whycliqz/anti-phishing";

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @BindView(R.id.button_ok)
    AppCompatButton helpButton;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
    }

    @Override
    protected View onCreateThemedView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        //noinspection ConstantConditions
        ControlCenterDialog.getComponent().inject(this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.anti_phishing_land;
                } else {
                    layout = R.layout.anti_phishing;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.anti_phishing_land;
                break;
            default:
                layout = R.layout.anti_phishing;
                break;
        }
        final View view = inflater.inflate(layout, container, false);
        ButterKnife.bind(this, view);
        view.setAlpha(0.97f);
        return view;
    }

    @SuppressWarnings("UnusedParameters")
    @OnClick(R.id.button_ok)
    void onHelpClickd(View v) {
        bus.post(new Messages.DismissControlCenter());
        telemetry.sendCCOkSignal(TelemetryKeys.OK, TelemetryKeys.ATPHISH);
    }

    @SuppressWarnings("UnusedParameters")
    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                antiPhishingHelupUrlDe : antiPhishingHelupUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(helpUrl));
        bus.post(new Messages.DismissControlCenter());
        telemetry.sendLearnMoreClickSignal(TelemetryKeys.ATPHISH);
    }
}

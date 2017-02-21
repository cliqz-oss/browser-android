package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.graphics.PorterDuff;
import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.support.v4.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;

import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * Created by Ravjit on 21/11/16.
 */

public class AntiPhishingFragment extends Fragment {

    private static final String TAG = AntiPhishingFragment.class.getSimpleName();

    private static final String antiPhishingHelupUrlDe = "https://cliqz.com/whycliqz/anti-phishing";
    private static final String antiPhishingHelupUrlEn = "https://cliqz.com/en/whycliqz/anti-phishing";
    private static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";

    @Inject
    Bus bus;

    @Bind(R.id.button_ok)
    Button helpButton;

    private boolean mIsIncognito;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        BrowserApp.getActivityComponent(getActivity()).inject(this);
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
        final int popupBgColor = mIsIncognito ? R.color.incognito_tab_primary_color : R.color.white;
        final int popupTextColor = mIsIncognito ? R.color.white : R.color.incognito_tab_primary_color;
        view.setBackgroundColor(ContextCompat.getColor(getContext(), popupBgColor));
        view.setAlpha(0.97f);
        helpButton.setTextColor(ContextCompat.getColor(getContext(), popupBgColor));
        helpButton.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        return view;
    }

    @OnClick(R.id.button_ok)
    void onHelpClickd(View v) {
        bus.post(new Messages.DismissControlCenter());
    }

    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                antiPhishingHelupUrlDe : antiPhishingHelupUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(helpUrl));
        bus.post(new Messages.DismissControlCenter());
    }

    public static AntiPhishingFragment create(boolean isIncognito) {
        final AntiPhishingFragment fragment = new AntiPhishingFragment();
        final Bundle arguments = new Bundle();
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }
}

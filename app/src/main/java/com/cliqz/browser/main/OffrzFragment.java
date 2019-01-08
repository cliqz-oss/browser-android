package com.cliqz.browser.main;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.support.annotation.ColorInt;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.ContextCompat;
import android.support.v4.content.Loader;
import android.support.v4.graphics.drawable.DrawableCompat;
import android.support.v7.content.res.AppCompatResources;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.cliqz.browser.R;
import com.cliqz.browser.offrz.OffrzLoader;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.webview.CliqzMessages;
import com.facebook.drawee.view.SimpleDraweeView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.LinkedList;
import java.util.List;

import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * This fragment display the currently available offers. It uses {@link OffrzLoader} to fetch and
 * display the current available offers.
 *
 * @author Stefano Pacifici
 */
public class OffrzFragment extends FragmentWithBus implements
        LoaderManager.LoaderCallbacks<JSONObject> {

    private static final String ACTIONS_KEY = "actions";
    private static final String UI_INFO_KEY = "ui_info";
    private static final String TEMPLATE_DATA_KEY = "template_data";
    private static final String TEMPLATE_TITLE_KEY = "title";
    private static final String TEMPLATE_CODE_KEY = "code";
    private static final String ERROR_FALLBACK = "!!! ERROR !!!";
    private static final String TEMPLATE_DESCRIPTION_KEY = "desc";
    private static final String TEMPLATE_LOGO_KEY = "logo_url";
    private static final String ERROR_URL_FALLBAK = "http://cliqz.com";
    private static final String CALL_TO_ACTION_KEY = "call_to_action";
    private static final String CALL_TO_ACTION_TEXT_KEY = "text";
    private static final String CALL_TO_ACTION_URL_KEY = "url";

    @Bind(R.id.empty_offers_outer_container)
    ViewGroup emptyOffersOuterContainer;

    @Bind(R.id.offers_outer_container)
    View offersOuterContainer;

    @Bind(R.id.offrz_onboaring_container)
    ViewGroup onboardingVG;

    @Bind(R.id.offrz_activation_container)
    ViewGroup activationVG;

    @Bind(R.id.offers_container)
    ViewGroup offersContainer;

    @Bind(R.id.onboarding_feature_icon_iv)
    ImageView onboardingIcon;

    @Bind(R.id.empty_offers_icon_iv)
    ImageView emptyOffersIcon;

    @Bind(R.id.onboarding_feature_description_tv)
    TextView onboardingText;

    @Bind(R.id.activation_feature_description_tv)
    TextView activationText;

    @Bind(R.id.offers_loading_pb)
    ProgressBar progressBar;

    @Bind(R.id.myoffrz_deactivate_view)
    View myOffrzDeactivateView;

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.offrz_fragment, container, false);

        ButterKnife.bind(this, view);
        onboardingText.setText(R.string.myoffrz_onboarding_description);
        activationText.setText(R.string.myoffrz_activation_description);

        return view;
    }

    @Override
    protected void registerToBus() {
        // NOP
    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        getLoaderManager().initLoader(0, null, this);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (!preferenceManager.isMyOffrzEnable()) {
            activationVG.setVisibility(View.VISIBLE);
            myOffrzDeactivateView.setVisibility(View.VISIBLE);
            myOffrzDeactivateView.bringToFront();
            enableClickActionsOnOffrz(false);
        } else if (preferenceManager.isMyOffrzOnboardingEnabled()) {
            onboardingVG.setVisibility(View.VISIBLE);
            telemetry.sendOnboardingSignal(TelemetryKeys.SHOW, TelemetryKeys.OFFRZ);
        }
    }

    @OnClick(R.id.activate_btn)
    void OnActivateButtonClicked(){
        preferenceManager.setMyOffrzEnable(true);
        preferenceManager.setMyOffrzOnboardingEnabled(false);
        activationVG.setVisibility(View.GONE);
        myOffrzDeactivateView.setVisibility(View.INVISIBLE);
        enableClickActionsOnOffrz(true);
    }

    private void enableClickActionsOnOffrz(boolean enable){
        for(int i = 0 ; i < offersContainer.getChildCount();i++){
            View curChild = offersContainer.getChildAt(i);
            if (curChild.getId() == R.id.offer_card){
                curChild.findViewById(R.id.terms_and_conditions_btn).setClickable(enable);
                curChild.findViewById(R.id.go_to_offer_btn).setClickable(enable);
                curChild.findViewById(R.id.offer_copy_code_btn).setClickable(enable);
            }
        }
    }

    @OnClick(R.id.learn_more_tv)
    void onActivationLearnMoreClicked() {
        bus.post(new CliqzMessages.OpenTab(getString(R.string.myoffrz_url), "", false));
    }

    @OnClick(R.id.learn_more_btn)
    void onOnBoardingLearnMoreClicked() {
        closeOnboarding();
        telemetry.sendOnboardingSignal(TelemetryKeys.CLICK, TelemetryKeys.LEARN_MORE,
                TelemetryKeys.OFFRZ);
        bus.post(new CliqzMessages.OpenTab(getString(R.string.myoffrz_url), "", false));
    }

    @OnClick(R.id.onboarding_close_btn)
    void onOnboardingCloseClicked() {
        telemetry.sendOnboardingSignal(TelemetryKeys.HIDE, TelemetryKeys.OFFRZ);
        closeOnboarding();
    }

    private void closeOnboarding() {
        onboardingVG.setVisibility(View.GONE);
        preferenceManager.setMyOffrzOnboardingEnabled(false);
    }

    @Override
    public Loader<JSONObject> onCreateLoader(int id, Bundle args) {
        return new OffrzLoader(getActivity());
    }

    @Override
    public void onLoadFinished(Loader<JSONObject> loader, JSONObject data) {
        progressBar.setVisibility(View.GONE);
        if (data == null) {
            // display an error message here
            offersOuterContainer.setVisibility(View.INVISIBLE);
            emptyOffersOuterContainer.setVisibility(View.VISIBLE);
            return;
        }
        offersOuterContainer.setVisibility(View.VISIBLE);
        emptyOffersOuterContainer.setVisibility(View.GONE);

        // Remove all previous offers if needed
        final List<View> toBeRemoved = new LinkedList<>();
        for (int i = 0; i < offersContainer.getChildCount(); i++) {
            final View view = offersContainer.getChildAt(i);
            if (view.getId() == R.id.offer_card) {
                toBeRemoved.add(view);
            }
        }
        for (View v: toBeRemoved) {
            offersContainer.removeView(v);
        }

        final LayoutInflater inflater = LayoutInflater.from(getContext());
        final View offer = inflater.inflate(R.layout.offrz_offer_template, offersContainer, false);
        final ViewHolder holder = new ViewHolder(offer);

        // !!! No terms and conditions right now !!!
        holder.termsAndConditions.setVisibility(View.GONE);
        holder.termsAndConditionsButton.setVisibility(View.GONE);
        // !!! No terms and conditions right now !!!

        final JSONObject templateData = getTemplateData(data);
        if (templateData == null) {
            return;
        }
        if (!templateData.has(TEMPLATE_TITLE_KEY)) {
            return;
        }

        final JSONObject callToActionData = templateData.optJSONObject(CALL_TO_ACTION_KEY);
        if (callToActionData == null ||
                !callToActionData.has(CALL_TO_ACTION_TEXT_KEY) ||
                !callToActionData.has(CALL_TO_ACTION_URL_KEY)) {
            return;
        }

        holder.title.setText(templateData.optString(TEMPLATE_TITLE_KEY, ERROR_FALLBACK));
        holder.setOfferUrl(callToActionData.optString(CALL_TO_ACTION_URL_KEY, ERROR_URL_FALLBAK));
        holder.goToOffer
                .setText(callToActionData.optString(CALL_TO_ACTION_TEXT_KEY, ERROR_FALLBACK));
        if (!templateData.has(TEMPLATE_CODE_KEY)) {
            return;
        }
        final String code = templateData.optString(TEMPLATE_CODE_KEY, ERROR_FALLBACK);
        holder.copyCode.setText(code);
        holder.setCode(code);

        if (!templateData.has(TEMPLATE_DESCRIPTION_KEY)) {
            holder.descrption.setVisibility(View.GONE);
        } else {
            holder.descrption.setText(templateData.optString(TEMPLATE_DESCRIPTION_KEY, ERROR_FALLBACK));
        }

        if (!templateData.has(TEMPLATE_LOGO_KEY)) {
            holder.image.setVisibility(View.GONE);
        } else {
            holder.image.setImageURI(templateData.optString(TEMPLATE_LOGO_KEY, ERROR_URL_FALLBAK));
        }

        offersContainer.addView(offer);
        if(!preferenceManager.isMyOffrzEnable()) {
            myOffrzDeactivateView.setVisibility(View.VISIBLE);
            myOffrzDeactivateView.bringToFront();
            holder.enableClickActions(false);
        }else{
            myOffrzDeactivateView.setVisibility(View.INVISIBLE);
            holder.enableClickActions(true);
        }
    }

    private static JSONObject getTemplateData(final JSONObject data) {
        final Object[] path = new Object[] {
                ACTIONS_KEY, 1, 1, 1, UI_INFO_KEY, TEMPLATE_DATA_KEY
        };
        Object currentNode = data;
        for (Object key: path) {
            if (currentNode instanceof JSONObject && key instanceof String) {
                currentNode = ((JSONObject) currentNode).opt((String) key);
            } else if (currentNode instanceof JSONArray && key instanceof Integer) {
                currentNode = ((JSONArray) currentNode).opt((Integer) key);
            } else {
                return null;
            }
        }
        if (!(currentNode instanceof JSONObject)) {
            return null;
        }
        return (JSONObject) currentNode;
    }

    @Override
    public void onLoaderReset(Loader<JSONObject> loader) {

    }

    class ViewHolder {
        @Bind(R.id.offer_title_tv)
        TextView title;

        @Bind(R.id.offer_description_tv)
        TextView descrption;

        @Bind(R.id.offer_image_iv)
        SimpleDraweeView image;

        @Bind(R.id.terms_and_conditions_btn)
        Button termsAndConditionsButton;

        @Bind(R.id.terms_and_conditions_tv)
        TextView termsAndConditions;

        @Bind(R.id.offer_copy_code_btn)
        Button copyCode;

        @Bind(R.id.go_to_offer_btn)
        Button goToOffer;

        private String mUrl;
        private String mCode;

        @OnClick(R.id.offer_copy_code_btn)
        void onCopyButtonClicked() {
            final Context context = getContext();
            if (context == null || mCode == null || mCode.isEmpty()) {
                return;
            }

            final ClipboardManager clipboardManager =
                    (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboardManager != null) {
                final ClipData clipData = ClipData.newPlainText("text", mCode);
                clipboardManager.setPrimaryClip(clipData);
                telemetry.sendOffrzSignal(TelemetryKeys.COPY, TelemetryKeys.CODE);
                Toast.makeText(context, R.string.message_code_copied, Toast.LENGTH_SHORT).show();
            }
        }

        @OnClick(R.id.terms_and_conditions_btn)
        void onTermsAndConditionClicked() {
            // !!! IMPLEMENT THIS WHEN WE WILL HAVE SOMETHING TO TRY !!!
        }

        @OnClick(R.id.go_to_offer_btn)
        void onGoToOfferClicked() {
            if (mUrl != null) {
                bus.post(new CliqzMessages.OpenTab(mUrl, "", false));
                telemetry.sendOffrzSignal(TelemetryKeys.CLICK, TelemetryKeys.USE);
            }
        }

        ViewHolder(@NonNull View view) {
            ButterKnife.bind(this, view);
            setTermsAndConditionButtonDrawables();
        }

        private void setTermsAndConditionButtonDrawables() {
            final Context context = getContext();
            final Drawable leftDrawable = AppCompatResources.getDrawable(context, R.drawable.ic_info_black).mutate();
            final Drawable rightDrawable = AppCompatResources.getDrawable(context, R.drawable.ic_arrow_up).mutate();

            final @ColorInt int color = ContextCompat.getColor(context, R.color.accent_color);

            DrawableCompat.setTint(leftDrawable, color);
            DrawableCompat.setTint(rightDrawable, color);

            termsAndConditionsButton.setCompoundDrawablesWithIntrinsicBounds(leftDrawable,null,rightDrawable,null);
        }

        void setOfferUrl(String url) {
            this.mUrl = url;
        }

        public void setCode(String code) {
            this.mCode = code;
        }

        public void enableClickActions(boolean enable){
            goToOffer.setClickable(enable);
            termsAndConditionsButton.setClickable(enable);
            copyCode.setClickable(enable);
        }
    }
}

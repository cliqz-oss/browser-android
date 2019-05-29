package com.cliqz.browser.view;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.style.ImageSpan;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.DrawableCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.CliqzMessages.OpenLink;
import com.cliqz.nove.Bus;

import java.util.Objects;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

import static android.view.View.MeasureSpec.makeMeasureSpec;

public class UserSurveyMessage extends FrameLayout {

    private static final long ANIMATION_DURATION = 300L;

    // This delay can not be 0, we need time for the view to be laid out
    private static final long APPEAR_ANIMATION_DELAY = 1000L;

    @Inject
    Bus bus;

    @Inject
    PreferenceManager preferenceManager;

    @BindView(R.id.user_sentiment_survey_first_line)
    TextView msgFirstLine;

    @BindView(R.id.user_sentiment_survey_second_line)
    TextView msgSecondLine;

    private boolean mInfoShowed = false;

    public UserSurveyMessage(Context context) {
        super(context);
        init(context);
    }

    public UserSurveyMessage(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public UserSurveyMessage(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(@NonNull Context context) {
        setBackgroundColor(ContextCompat.getColor(context, R.color.progress_bar_color));
        inflate(context, R.layout.user_sentiment_survey_msg, this);
        ButterKnife.bind(this);
        Objects
                .requireNonNull(BrowserApp.getActivityComponent(context))
                .inject(this);
        setVisibility(GONE);

        final SpannableString spannable = new SpannableString(context.getString(R.string.user_sentiment_survey_first_line_msg));
        final Drawable drawable = ContextCompat.getDrawable(context, R.drawable.ic_info_black);
        if (drawable != null) {
            DrawableCompat.setTint(drawable, Color.WHITE);
            drawable.setBounds(0, 0, drawable.getIntrinsicWidth(), drawable.getIntrinsicHeight());
            final ImageSpan span = new ImageSpan(drawable);
            spannable.setSpan(span, spannable.length() - 1, spannable.length(), Spannable.SPAN_INCLUSIVE_EXCLUSIVE);
            msgFirstLine.setText(spannable);
        }
    }

    @OnClick(R.id.action_later)
    void onActionLater() {
        disappear();
    }

    @OnClick(R.id.action_take_survey)
    void onActionTakeSurvey() {
        final String url = getContext().getString(R.string.user_sentiment_survey_url);
        Objects.requireNonNull(bus).post(OpenLink.open(url));
        preferenceManager.stopUserSurvey201903();
        disappear();
    }

    @OnClick(R.id.user_sentiment_survey_first_line)
    void onInfoClicked() {
        if (!mInfoShowed) {
            mInfoShowed = true;
            msgSecondLine.setVisibility(VISIBLE);
            measureChild(msgSecondLine,
                    makeMeasureSpec(getWidth(), MeasureSpec.AT_MOST),
                    makeMeasureSpec(4 * getHeight(), MeasureSpec.AT_MOST));
            final int h = msgSecondLine.getMeasuredHeight();
            final ValueAnimator animator = ValueAnimator.ofInt(0, h);
            animator.setDuration(ANIMATION_DURATION)
                    .addUpdateListener((ator) -> {
                        final ViewGroup.LayoutParams params = msgSecondLine.getLayoutParams();
                        params.height = (Integer) ator.getAnimatedValue();
                        msgSecondLine.setLayoutParams(params);
                        forceLayout();
                    });
            animator.start();
        }
    }

    private void disappear() {
        final View parent = (View) getParent();
        parent.animate()
                .setDuration(ANIMATION_DURATION)
                .y(-getMeasuredHeight())
                .withEndAction(() -> {
                    setVisibility(View.GONE);
                    parent.setY(0);
                })
                .start();
    }

    public void appear() {
        postDelayed(this::delayedAppear, APPEAR_ANIMATION_DELAY);
    }

    private void delayedAppear() {
        final View parent = (View) getParent();
        setVisibility(VISIBLE);
        final int widthSpec = makeMeasureSpec(parent.getWidth(), MeasureSpec.AT_MOST);
        final int heightSpec = makeMeasureSpec(parent.getHeight(), MeasureSpec.AT_MOST);
        measure(widthSpec, heightSpec);
        final int h = getMeasuredHeight();
        parent.setY(-h);
        parent.animate()
                .setDuration(ANIMATION_DURATION)
                .y(0)
                .start();
    }
}

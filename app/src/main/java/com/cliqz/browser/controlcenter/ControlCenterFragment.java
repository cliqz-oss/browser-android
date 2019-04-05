package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.content.res.ColorStateList;
import android.content.res.Resources;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.AttrRes;
import android.support.annotation.ColorInt;
import android.support.annotation.Nullable;
import android.support.annotation.StyleRes;
import android.support.v4.app.Fragment;
import android.support.v4.view.ViewCompat;
import android.support.v4.widget.ImageViewCompat;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.utils.ViewUtils;

import java.util.List;

/**
 * @author Stefano Pacifici
 */
abstract class ControlCenterFragment extends Fragment {

    private static final String TAG = ControlCenterFragment.class.getSimpleName();

    static final String KEY_HASHCODE = TAG + ".HASHCODE";
    static final String KEY_URL = TAG + ".URL";
    static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";

    protected boolean mIsIncognito = false;
    private boolean mEnabled;
    private List<View> mTaggedViews = null;
    private int mColorEnabled;
    private int mColorDisabled;

    @Override
    final public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container,
                                   @Nullable Bundle savedInstanceState) {

        @StyleRes final int theme = mIsIncognito ?
                R.style.Theme_ControlCenter_Fragment_Incognito :
                R.style.Theme_ControlCenter_Fragment;
        final Context context = new ContextThemeWrapper(inflater.getContext(), theme);
        final Resources.Theme themeInstance = context.getTheme();
        mColorEnabled = getThemeColor(themeInstance, R.attr.colorPrimary);
        mColorDisabled = getThemeColor(themeInstance, R.attr.colorSecondary);
        final LayoutInflater themedLayoutInflater = LayoutInflater.from(context);
        final View contentView = onCreateThemedView(themedLayoutInflater, container, savedInstanceState);
        mTaggedViews = ViewUtils.findAllViewByTag(contentView, R.id.enableable_view, null);
        updateColors();
        return contentView;
    }

    @ColorInt
    private int getThemeColor(Resources.Theme theme, @AttrRes int colorAttr) {
        final TypedValue outValue = new TypedValue();
        theme.resolveAttribute(colorAttr, outValue, true);
        return outValue.data;
    }

    abstract protected View onCreateThemedView(LayoutInflater inflater,
                                               @Nullable ViewGroup container,
                                               @Nullable Bundle savedInstanceState);

    protected void setEnabled(boolean enabled) {
        final boolean currentlyEnabled = mEnabled;
        mEnabled = enabled;
        if (enabled == currentlyEnabled || mTaggedViews == null || mTaggedViews.isEmpty()) {
            return;
        }
        updateColors();
    }

    private void updateColors() {
        final int color;
        if (mEnabled) {
            color = mColorEnabled;
        } else {
            color = mColorDisabled;
        }
        for (final View view: mTaggedViews) {
            if (view instanceof Button) {
                ViewCompat.setBackgroundTintList(view, ColorStateList.valueOf(color));
            } else if (view instanceof TextView) {
                ((TextView) view).setTextColor(color);
            } else if (view instanceof ImageView) {
                if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ((ImageView) view).setImageTintList(ColorStateList.valueOf(color));
                }else {
                    ImageViewCompat.setImageTintList(((ImageView) view),ColorStateList.valueOf(color));
                }
            } else {
                ViewCompat.setBackgroundTintList(view, ColorStateList.valueOf(color));
            }
        }
    }
}

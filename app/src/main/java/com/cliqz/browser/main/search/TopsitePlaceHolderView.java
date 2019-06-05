package com.cliqz.browser.main.search;

import android.annotation.SuppressLint;
import android.content.Context;
import androidx.core.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.View;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
public class TopsitePlaceHolderView extends View {

    private static final int MAX_SIZE = 10000;
    private static int sSize = -1;

    public TopsitePlaceHolderView(Context context) {
        super(context);
        setBackgroundColor(ContextCompat.getColor(context, R.color.fresh_tab_placeholder_color));
        if (sSize < 0) {
            measurePlaceholder(context);
        }
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(sSize, sSize);
    }

    private static void measurePlaceholder(Context context) {
        final LayoutInflater inflater = LayoutInflater.from(context);
        @SuppressLint("InflateParams")
        final View regularIcon = inflater.inflate(R.layout.topsites_layout, null);
        final int measureSpec = MeasureSpec.makeMeasureSpec(MAX_SIZE, MeasureSpec.AT_MOST);
        regularIcon.measure(measureSpec, measureSpec);
        sSize = regularIcon.getMeasuredWidth();
    }
}

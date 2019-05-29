package com.cliqz.browser.test;

import android.graphics.Point;
import android.graphics.Rect;
import androidx.annotation.IntDef;
import androidx.test.espresso.UiController;
import androidx.test.espresso.ViewAction;
import androidx.test.espresso.matcher.BoundedMatcher;
import android.view.MotionEvent;
import android.view.View;
import android.widget.TextView;

import org.hamcrest.Description;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static org.hamcrest.core.AllOf.allOf;


/**
 * @author Kiiza Joseph Bazaare
 */
public class ClickDrawableAction implements ViewAction {
    public static final int Left = 0;
    public static final int Top = 1;
    public static final int Right = 2;
    public static final int Bottom = 3;

    @Location
    private final int drawableLocation;

    public ClickDrawableAction(@Location int drawableLocation){
        this.drawableLocation =drawableLocation;
    }

    @Override
    public org.hamcrest.Matcher<View> getConstraints(){
        return allOf(isAssignableFrom(TextView.class), new BoundedMatcher<View, TextView>(TextView.class) {
            @Override
            protected boolean matchesSafely(final TextView textView) {
                return textView.requestFocusFromTouch() && textView.getCompoundDrawables()[drawableLocation] !=null;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("has drawable");
            }
        });
    }
    @Override
    public String getDescription(){
        return "click drawable";
    }

    @Override
    public void perform(final UiController uiController, final View view){
        TextView textView = (TextView)view;
        if(textView != null && textView.requestFocusFromTouch()){
            Rect drawableBounds = textView.getCompoundDrawables()[drawableLocation].getBounds();

            final Point[] clickPoint = new Point[4];
            clickPoint[Left] = new Point(textView.getLeft() + (drawableBounds.width()/2), (int)(textView.getPivotY() + (drawableBounds.height() / 2)));
            clickPoint[Top] = new Point((int)(textView.getPivotX() + (drawableBounds.width()/2)), textView.getTop() + (drawableBounds.height() / 2));
            clickPoint[Right] = new Point(textView.getRight() + (drawableBounds.width()/2), (int)(textView.getPivotY() + (drawableBounds.height() / 2)));
            clickPoint[Bottom] = new Point((int)(textView.getPivotX() + (drawableBounds.width()/2)), textView.getBottom() + (drawableBounds.height() / 2));

            if(textView.dispatchTouchEvent(MotionEvent.obtain(android.os.SystemClock.uptimeMillis(), android.os.SystemClock.uptimeMillis(),MotionEvent.ACTION_DOWN,clickPoint[drawableLocation].x,clickPoint[drawableLocation].y,0))){
                textView.dispatchTouchEvent(MotionEvent.obtain(android.os.SystemClock.uptimeMillis(), android.os.SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,clickPoint[drawableLocation].x,clickPoint[drawableLocation].y,0));
            }
        }
    }
    @IntDef({Left,Top,Right,Bottom})
    @Retention(RetentionPolicy.SOURCE)
    public @interface Location {}
}

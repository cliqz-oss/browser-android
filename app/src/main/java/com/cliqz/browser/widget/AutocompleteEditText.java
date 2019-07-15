package com.cliqz.browser.widget;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.PorterDuff;
import android.graphics.drawable.Drawable;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.AttributeSet;
import android.util.Log;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.inputmethod.EditorInfo;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.appcompat.widget.AppCompatEditText;
import androidx.core.content.ContextCompat;
import androidx.vectordrawable.graphics.drawable.VectorDrawableCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import java.lang.reflect.Field;
import java.util.ArrayList;

import javax.inject.Inject;

/**
 * Custom EditText widget with autocompletion
 *
 * @author Stefano Pacifici
 */
public class AutocompleteEditText extends AppCompatEditText {

    static {
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);
    }

    private static final String TAG = AutocompleteEditText.class.getSimpleName();
    private final Drawable clearIcon;
    private final Drawable backIcon;

    @Inject
    Telemetry mTelemetry;

    @Inject
    Bus bus;

    private final ArrayList<TextWatcher> mListeners = new ArrayList<>();
    private volatile boolean mIsAutocompleting;
    private volatile boolean mDeleting = false;

    // private AutocompleteService mAutocompleteService;

    private boolean mIsAutocompleted;
    private volatile boolean mIsTyping = false;
    private boolean mIsAutocompletionEnabled = true;

    private AutocompleteRunnable autocompleteRunnable = null;
    private String mQuery = "";

    public AutocompleteEditText(Context context) {
        this(context, null);
    }

    public AutocompleteEditText(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public AutocompleteEditText(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        super.addTextChangedListener(new DefaultTextWatcher());
        final int imeOptions = getImeOptions() | EditorInfo.IME_FLAG_NO_EXTRACT_UI;
        setImeOptions(imeOptions);
        mIsAutocompleting = false;
        mIsAutocompleted = false;
        BrowserApp.getAppComponent().inject(this);
        setInputType(InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS | InputType.TYPE_TEXT_VARIATION_URI);
        setSelectHandDrawable();
        clearIcon = VectorDrawableCompat.create(
                context.getResources(), R.drawable.ic_clear, null);
        backIcon = AutocompleteBackIcon.create(context);
        setDrawable(false);
    }

    private void setDrawable(boolean showClearDrawable){
        if (showClearDrawable) {
            setCompoundDrawablesWithIntrinsicBounds(backIcon, null, clearIcon, null);
        } else {
            setCompoundDrawablesWithIntrinsicBounds(backIcon, null, null, null);
        }
    }

    @SuppressWarnings("JavaReflectionMemberAccess")
    private void setSelectHandDrawable() {
        try {
            final Field fEditor = TextView.class.getDeclaredField("mEditor");
            fEditor.setAccessible(true);
            final Object editor = fEditor.get(this);

            final Field fSelectHandleLeft = editor.getClass().getDeclaredField("mSelectHandleLeft");
            final Field fSelectHandleRight =
                    editor.getClass().getDeclaredField("mSelectHandleRight");
            final Field fSelectHandleCenter =
                    editor.getClass().getDeclaredField("mSelectHandleCenter");

            fSelectHandleLeft.setAccessible(true);
            fSelectHandleRight.setAccessible(true);
            fSelectHandleCenter.setAccessible(true);

            fSelectHandleLeft.set(editor, setDrawableColorFilter(R.drawable.text_select_handle_left_material));
            fSelectHandleRight.set(editor, setDrawableColorFilter(R.drawable.text_select_handle_right_material));
            fSelectHandleCenter.set(editor, setDrawableColorFilter(R.drawable.text_select_handle_middle_material));
        } catch (final Exception ignored) {
        }
    }

    private Drawable setDrawableColorFilter(int drawableId){
        final Drawable drawable =  AppCompatResources.getDrawable(getContext(),drawableId);
        if (drawable != null) {
            drawable.setColorFilter(ContextCompat.getColor(getContext(), R.color.primary_color), PorterDuff.Mode.SRC_ATOP);
        }
        return drawable;
    }

    public boolean isAutocompleted() {
        return mIsAutocompleted;
    }

    public void setIsAutocompletionEnabled(boolean value) {
        mIsAutocompletionEnabled = value;
    }

    @Override
    public void addTextChangedListener(TextWatcher watcher) {
        final int index = mListeners.indexOf(watcher);
        if (index < 0) {
            mListeners.add(watcher);
        }
    }

    @Override
    public void removeTextChangedListener(TextWatcher watcher) {
        final int index = mListeners.indexOf(watcher);
        if (index >= 0) {
            mListeners.remove(index);
        }
    }

    @Override
    public boolean onKeyPreIme(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_UP && event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            bus.post(new Messages.KeyBoardClosed());
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @NonNull
    public String getQuery() {
        return mQuery;
    }

    public void setAutocompleteText(CharSequence text) {
        if (!mIsAutocompletionEnabled) {
            return;
        }
        final String autocompletion = text.toString();
        if (autocompleteRunnable != null) {
            autocompleteRunnable.cancel();
        }
        autocompleteRunnable = new AutocompleteRunnable(autocompletion);
        postDelayed(autocompleteRunnable, 200);
    }

    private class DefaultTextWatcher implements TextWatcher {

        private String mBefore = "";

        @Override
        public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            if (mIsAutocompleting) {
                return;
            }
            if (autocompleteRunnable != null) {
                autocompleteRunnable.cancel();
            }

            mIsTyping = true;

            for (TextWatcher watcher: mListeners) {
                watcher.beforeTextChanged(s, start, count, after);
            }
        }

        @Override
        public void onTextChanged(CharSequence s, int start, int before, int count) {
            if (mIsAutocompleting) {
                return;
            }
            for (TextWatcher watcher: mListeners) {
                watcher.onTextChanged(s, start, before, count);
            }

            final String str = s.toString();
            mDeleting = mBefore.startsWith(str) && mBefore.length() >= str.length();
            mBefore = str;

            if (mDeleting) {
                mTelemetry.sendTypingSignal(TelemetryKeys.KEYSTROKE_DEL, s.length());
            }
        }

        @Override
        public void afterTextChanged(Editable s) {
            if (mIsAutocompleting) {
                return;
            }
            mIsAutocompleted = false;
            for (TextWatcher watcher: mListeners) {
                watcher.afterTextChanged(s);
            }
            mQuery = s.toString();
            setDrawable(!mQuery.isEmpty());
            mIsTyping = false;
        }
    }

    @Override
    public boolean onTextContextMenuItem(int id) {
        ClipboardManager clipboard = (ClipboardManager) getContext()
                .getSystemService(Context.CLIPBOARD_SERVICE);
        if (id == android.R.id.paste) {
            final ClipData primaryClip = clipboard.getPrimaryClip();
            final ClipData.Item item =
                    (primaryClip != null && primaryClip.getItemCount() > 0) ?
                            primaryClip.getItemAt(0) : null;
            final CharSequence text = item != null ? item.getText() : null;
            final int textLength = text != null ? text.length() : 0;
            mTelemetry.sendPasteSignal(textLength);
        }
        return super.onTextContextMenuItem(id);
    }

    @Override
    protected void onSelectionChanged(int selStart, int selEnd) {
        final Editable editable = getText();
        final String text = editable != null ? editable.toString() : "";
        if(selStart == 0 && selEnd == 0 && text.length() != 0) {
            boolean isUserTouch = false;
            final StackTraceElement[] stackTraceElements = Thread.currentThread().getStackTrace();

            for (StackTraceElement stackTraceElement : stackTraceElements) {
                if ("onTouchEvent".equals(stackTraceElement.getMethodName())) {
                    isUserTouch = true;
                    break;
                }
            }

            if(!isUserTouch)
                setSelection(0, getText().length());
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (getVisibility() != VISIBLE) {
            return false;
        }
        if (event.getAction() == MotionEvent.ACTION_UP) {
            final boolean isBackIconClicked = event.getX() < getPaddingLeft() + backIcon.getIntrinsicWidth();
            final boolean isClearIconClicked = event.getX() > getWidth() - getPaddingRight() - clearIcon.getIntrinsicWidth();
            if (isBackIconClicked) {
                bus.post(new Messages.SearchBarBackPressed());
                return true;
            } else if (isClearIconClicked) {
                setText("");
                bus.post(new Messages.SearchBarClearPressed());
                return true;
            } else {
                return super.onTouchEvent(event);
            }
        } else {
            return super.onTouchEvent(event);
        }
    }

    @Override
    public boolean performClick() {
        return super.performClick();
    }

    private class AutocompleteRunnable implements Runnable {

        private boolean mCancelled = false;

        private final String completion;

        AutocompleteRunnable(String completion) {
            this.completion = completion;
        }

        public void cancel() {
            mCancelled = true;
        }

        @Override
        public void run() {
            if (mDeleting || mIsTyping || mCancelled) {
                return;
            }
            mIsAutocompleting = true;
            if (completion.startsWith(mQuery)) {
                mIsAutocompleted = true;
                final int selectionBegin = mQuery.length();
                final int selectionEnd = completion.length();
                try {
                    setTextKeepState(completion);
                    setSelection(selectionBegin, selectionEnd);
                } catch (IndexOutOfBoundsException e) {
                    Log.i(TAG, "Can't select part of the url bar", e);
                }
            }
            mIsAutocompleting = false;
        }
    }
}

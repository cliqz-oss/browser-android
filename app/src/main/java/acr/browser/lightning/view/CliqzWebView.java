package acr.browser.lightning.view;

import android.app.Activity;
import android.os.Build;
import android.util.AttributeSet;
import android.webkit.WebView;

import com.cliqz.browser.main.MainActivity;
import com.squareup.otto.Bus;

import javax.inject.Inject;

/**
 * General workaround container for old phones
 *
 * @author Stefano Pacifici
 * @date 2016/03/14
 */
public class CliqzWebView extends WebView {

    @Inject
    Bus bus;

    public CliqzWebView(Activity activity) {
        this(activity, null);
    }

    public CliqzWebView(Activity activity, AttributeSet attrs) {
        this(activity, attrs, 0);
    }

    public CliqzWebView(Activity activity, AttributeSet attrs, int defStyleAttr) {
        super(activity, attrs, defStyleAttr);
        ((MainActivity)activity).mActivityComponent.inject(this);
    }

    @Override
    public void bringToFront() {
        super.bringToFront();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            requestLayout();
        }
    }

    protected final void executeJS(final String js) {
        if (js != null && !js.isEmpty()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                this.evaluateJavascript(js, null);
            } else {
                this.loadUrl("javascript:" + js);
            }
        }
    }
}

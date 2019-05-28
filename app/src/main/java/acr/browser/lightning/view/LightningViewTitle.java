package acr.browser.lightning.view;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.annotation.NonNull;

import com.cliqz.browser.R;

import acr.browser.lightning.utils.Utils;

/**
 * TODO: Remove this class
 * @author Stefano Pacifici base on Anthony C. Restaino's code
 * @date 2015/09/21
 */
@Deprecated
class LightningViewTitle {

    public static Bitmap DEFAULT_ICON = null;

    private Bitmap mFavicon;
    private String mTitle;

    public LightningViewTitle(Context context, boolean darkTheme) {
        if (DEFAULT_ICON == null) {
            DEFAULT_ICON = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_webpage);
        }
        mFavicon = DEFAULT_ICON;
        mTitle = "";
    }

    public void setFavicon(Bitmap favicon) {
        if (favicon == null) {
            mFavicon = DEFAULT_ICON;
        } else {
            mFavicon = Utils.padFavicon(favicon);
        }
    }

    public void setTitle(String title) {
        if (title == null) {
            mTitle = "";
        } else {
            mTitle = title;
        }
    }

    public void setTitleAndFavicon(String title, Bitmap favicon) {
        mTitle = title;

        if (favicon == null) {
            mFavicon = DEFAULT_ICON;
        } else {
            mFavicon = Utils.padFavicon(favicon);
        }
    }

    @NonNull
    public String getTitle() {
        return mTitle != null ? mTitle : "";
    }

    public Bitmap getFavicon() {
        return mFavicon;
    }

    public static Bitmap getDefaultIcon() {
        return DEFAULT_ICON;
    }
}

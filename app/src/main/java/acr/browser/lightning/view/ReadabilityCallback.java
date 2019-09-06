package acr.browser.lightning.view;

import android.webkit.ValueCallback;

import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.webview.CliqzMessages;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;

import timber.log.Timber;

class ReadabilityCallback implements ValueCallback<String> {

    private final LightningView lightningView;

    ReadabilityCallback(LightningView lightningView) {
        this.lightningView = lightningView;
    }

    @Override
    public void onReceiveValue(String s) {
        if (s == null) {
            return;
        }
        try {
            final String decodedResponse = URLDecoder.decode(s, "UTF-8");
            //removing extra quotation marks at the start
            final String jsonString = decodedResponse.substring(1,decodedResponse.length()-1);
            final JSONObject jsonObject = new JSONObject(jsonString);
            final String readerModeText = jsonObject.optString("content", "");
            final String readerModeTitle = jsonObject.optString("title", "");
            if (readerModeText != null && !readerModeText.isEmpty()) {
                lightningView.setReaderModeHTML(
                        getFormattedHtml(readerModeTitle, readerModeText));
                lightningView.eventBus.post(new CliqzMessages.OnReadableVersionAvailable());
            }
        } catch (JSONException e) {
            Timber.i(e,"error reading the json object");
        } catch (UnsupportedEncodingException e) {
            Timber.e(e,"error decoding the response from readability.js");
        }
    }

    //This function adds the title to the page content and resizes the images to fit the screen
    private String getFormattedHtml(String title, String bodyHTML) {
        final String head = "<head><style>img{max-width: 100%; height: auto;}</style></head>";
        final String titleHTML = "<h2>" + title + "</h2>";
        return "<html>" + head + "<body>" +
                titleHTML + bodyHTML + "</body></html>";
    }

}

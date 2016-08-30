package com.cliqz.browser.main;

import android.app.Activity;
import android.content.DialogInterface;
import android.net.Uri;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ListAdapter;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.Utils;

/**
 * @author Stefano Pacifici
 * @date 2016/06/01
 */
class YTDownloadDialog {
    private static final String TAG = YTDownloadDialog.class.getSimpleName();

    private final Activity activity;
    private final JSONArray urls;
    private final ListAdapter adapter;
    private final DialogInterface.OnClickListener clickListener;

    private YTDownloadDialog(Activity activity, JSONArray urls) {
        this.activity = activity;
        this.urls = urls;
        this.adapter = new UrlsAdapter();
        this.clickListener = new UrlsOnClickListener();
    }

    public static void show(Activity activity, JSONArray urls) {
        final YTDownloadDialog ytdialog = new YTDownloadDialog(activity, urls);
        final AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setAdapter(ytdialog.adapter, ytdialog.clickListener).show();
    }

    private class UrlsAdapter extends BaseAdapter {

        private LayoutInflater inflater = LayoutInflater.from(activity);

        @Override
        public int getCount() {
            return urls.length();
        }

        @Override
        public Object getItem(int position) {
            try {
                return urls.get(position);
            } catch (JSONException e) {
                Log.w(TAG, "Returning the default JSONObject", e);
                return new JSONObject();
            }
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = inflater.inflate(android.R.layout.simple_list_item_1, parent, false);
            }
            final JSONObject obj = (JSONObject) getItem(position);
            final String label = obj.optString("label", "NO LABEL");
            ((TextView) convertView).setText(label);
            return convertView;
        }
    }

    private class UrlsOnClickListener implements DialogInterface.OnClickListener {

        @Override
        public void onClick(DialogInterface dialog, int which) {
            JSONObject obj;
            try {
                obj = urls.getJSONObject(which);
            } catch (JSONException e) {
                obj = new JSONObject();
                Log.e(TAG, "Can't get the url at position " + which, e);
            }

            dialog.dismiss();
            String urlStr = obj.optString("url", "");
            urlStr = Uri.decode(urlStr);
            final URI uri;
            try {
                final URL url = new URL(urlStr);
                uri = new URI(url.getProtocol(), url.getUserInfo(), url.getHost(), url.getPort(), url.getPath(), url.getQuery(), url.getRef());
                if (!uri.toString().isEmpty()) {
                    Utils.downloadFile(activity, uri.toString(),
                            Constants.DESKTOP_USER_AGENT, "attachment", true);
                }
            } catch (MalformedURLException e) {
                e.printStackTrace();
            } catch (URISyntaxException e) {
                e.printStackTrace();
            }
        }
    }
}

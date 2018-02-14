package com.cliqz.browser.main;

import android.content.DialogInterface;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ListAdapter;
import android.widget.TextView;

import com.cliqz.browser.utils.DownloadHelper;
import com.cliqz.browser.telemetry.Telemetry;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;


/**
 * @author Stefano Pacifici
 */
class YTDownloadDialog {
    private static final String TAG = YTDownloadDialog.class.getSimpleName();

    private final MainActivity activity;
    private final JSONArray urls;
    private final ListAdapter adapter;
    private final DialogInterface.OnClickListener clickListener;
    private final Telemetry telemetry;

    private YTDownloadDialog(MainActivity activity, JSONArray urls, Telemetry telemetry) {
        this.activity = activity;
        this.urls = filterOutVideoOnly(urls);
        this.adapter = new UrlsAdapter();
        this.clickListener = new UrlsOnClickListener();
        this.telemetry = telemetry;
    }

    private JSONArray filterOutVideoOnly(JSONArray urls) {
        final JSONArray filtered = new JSONArray();
        for (int i = 0; i < urls.length(); i++) {
            try {
                final JSONObject url = urls.getJSONObject(i);
                final String name = url.getString("name");
                if (name != null && !name.isEmpty() && !name.toLowerCase().contains("video only")) {
                    filtered.put(url);
                }
            } catch (JSONException e) {
                Log.i(TAG, "Can't get video url in position " + i);
            }
        }
        if (filtered.length() == 0) {
            return urls;
        } else {
            return filtered;
        }
    }

    public static void show(MainActivity activity, JSONArray urls, Telemetry telemetry) {
        final YTDownloadDialog ytdialog = new YTDownloadDialog(activity, urls, telemetry);
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
            final String name = obj.optString("name", "UNKOWN");
            ((TextView) convertView).setText(name);
            return convertView;
        }
    }

    private class UrlsOnClickListener implements DialogInterface.OnClickListener {

        @Override
        public void onClick(DialogInterface dialog, int which) {
            JSONObject obj;
            String url;
            String name;
            try {
                obj = urls.getJSONObject(which);
                url = obj.getString("url");
                name = obj.getString("name");
            } catch (JSONException e) {
                Log.e(TAG, "Can't get the url at position " + which, e);
                return;
            }
            final String[] nameParts = name.split("\\s");
            final String title = obj.optString("title", "video");
            final String ext;
            if (nameParts.length > 0) {
                ext = nameParts[0].toLowerCase();
            } else {
                ext = "vid";
            }
            final String filename = title + "." + ext;
            telemetry.sendVideoDialogSignal(obj.optString("name", "Unknown").toLowerCase().replaceAll(" ","_"));
            dialog.dismiss();

            final DownloadHelper.DownloaderListener listener =
                    new MainActivityDownloadListner(activity, url, filename);
            DownloadHelper.download(activity, url, filename, null, listener);
        }
    }
}

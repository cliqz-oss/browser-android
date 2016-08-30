package com.cliqz.antitracking.test;

import android.app.Activity;
import android.app.ProgressDialog;
import android.os.AsyncTask;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

/**
 * @author Stefano Pacifici
 * @date 2016/07/14
 */
abstract class StatsWriter extends AsyncTask<Iterable<Record>, Void, Void> {

    private final Activity activity;
    private final File path;
    private ProgressDialog mProgress;

    public StatsWriter(Activity activity, File path) {
        this.activity = activity;
        this.path = path;
    }

    @Override
    protected void onPreExecute() {
        mProgress = new ProgressDialog(activity);
        mProgress.setProgressStyle(ProgressDialog.STYLE_SPINNER);
        mProgress.setMessage(activity.getString(R.string.writing_stats_message));
        mProgress.setIndeterminate(true);
        mProgress.setCancelable(false);
        mProgress.show();
    }

    @Override
    protected Void doInBackground(Iterable<Record>... iterables) {
        path.delete();

        BufferedWriter writer = null;
        try {
            writer = new BufferedWriter(new FileWriter(path));
            writer.write("#url,start(ms),end(ms),#req,#oreq");
            writer.newLine();
            for (Record record: iterables[0]) {
                writer.write(record.toString());
                writer.newLine();
            }
            writer.close();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            safeClose(writer);
        }
        return null;
    }

    private void safeClose(BufferedWriter writer) {
        if (writer == null) return;
        try {
            writer.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onPostExecute(Void aVoid) {
        mProgress.dismiss();
        done();
    }

    abstract void done();
}

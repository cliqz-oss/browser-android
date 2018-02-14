/**
 * Copyright 2016 CLIQZ GmbH
 *
 * Based on the original work of Roger Keays
 *
 * https://rogerkeays.com/simple-android-file-chooser
 *
 */
package com.cliqz.browser.filechooser;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.graphics.drawable.Drawable;
import android.os.Environment;
import android.support.annotation.NonNull;
import android.support.v4.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager.LayoutParams;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class FileChooserDialog implements View.OnClickListener {
    private static final String PARENT_DIR = "..";

    private final Activity activity;
    private ListView list;
    private TextView title;

    private Dialog dialog;
    private File currentPath = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);

    private static Drawable sFolderDrawable;

    @Override
    public void onClick(View view) {
        switch (view.getId()) {
            case android.R.id.button2:
                if (fileListener != null) {
                    fileListener.fileSelected(currentPath);
                }
            default:
                dialog.dismiss();
                break;
        }
    }

    // file selection event handling
    public interface FileSelectedListener {
        void fileSelected(File file);
    }

    public FileChooserDialog setFileListener(FileSelectedListener fileListener) {
        this.fileListener = fileListener;
        return this;
    }

    private FileSelectedListener fileListener;

    public FileChooserDialog(Activity activity, File path) {
        this.activity = activity;
        this.currentPath = path.getAbsoluteFile();
        dialog = new Dialog(activity);
        @SuppressLint("InflateParams") final View content =
                LayoutInflater.from(activity).inflate(R.layout.file_chooser_layout, null);
        list = (ListView) content.findViewById(android.R.id.list);
        title = (TextView) content.findViewById(android.R.id.title);
        final Button cancelButton = (Button) content.findViewById(android.R.id.button1);
        final Button okButton = (Button) content.findViewById(android.R.id.button2);

        okButton.setOnClickListener(this);
        cancelButton.setOnClickListener(this);
        list.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int which, long id) {
                final FileListEntry entry = (FileListEntry) list.getItemAtPosition(which);
                if (entry.isDirectory()) {
                    refresh(entry.file);
                } else {
                    if (fileListener != null) {
                        fileListener.fileSelected(entry.file);
                    }
                    dialog.dismiss();
                }
            }
        });
        dialog.setContentView(content);
        final Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        }

        if (sFolderDrawable == null) {
                sFolderDrawable = ContextCompat.getDrawable(activity, R.drawable.ic_folder);
            // This is due the fact that activity.getDrawable(...) can either throw an exception or
            if (sFolderDrawable != null) {
                sFolderDrawable.setBounds(0, 0, sFolderDrawable.getIntrinsicWidth(), sFolderDrawable.getIntrinsicHeight());
            }
        }
    }

    public void showDialog() {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity,
                new PermissionsResultAction() {
                    @Override
                    public void onGranted() {
                        refresh(currentPath);
                        dialog.show();
                    }

                    @Override
                    public void onDenied(String permission) {

                    }
                }, Manifest.permission.READ_EXTERNAL_STORAGE);
    }


    /**
     * Sort, filter and display the files for the given path.
     */
    private void refresh(File path) {
        this.currentPath = path;
        final File parent = path.getParentFile();
        title.setText(parent != null ? currentPath.getName() : "/");
        final ArrayList<FileListEntry> directories = new ArrayList<>();
        if (path.exists()) {
            final File[] allFiles = path.listFiles();
            if (allFiles != null) {
                for (File f : path.listFiles()) {
                    if (!f.isHidden() && f.isDirectory()) {
                        directories.add(new FileListEntry(f));
                    }
                }
            }
            Collections.sort(directories);
        }
        // Even if the file doesn't exist we want to show the parent directory to give the user the
        // chance to navigate to something meaningful
        if (parent != null) {
            directories.add(0, new ParentFolder(parent));
        }
        // refresh the user interface
        list.setAdapter(new Adapter(directories));
    }

    private static class FileListEntry implements Comparable<FileListEntry> {
        final String label;
        final File file;

        FileListEntry(File file) {
            this(file, file.getName());
        }

        protected FileListEntry(File file, String label) {
            this.label = label;
            this.file = file;
        }

        @Override
        public String toString() {
            return label;
        }

        @Override
        public int compareTo(FileListEntry fileListEntry) {
            return label.compareTo(fileListEntry.label);
        }

        boolean isDirectory() {
            return file.isDirectory();
        }
    }

    private static class ParentFolder extends FileListEntry {

        ParentFolder(File parent) {
            super(parent, PARENT_DIR);
        }

        @Override
        boolean isDirectory() {
            return true;
        }
    }

    private class Adapter extends ArrayAdapter<FileListEntry> {

        public Adapter(List<FileListEntry> entries) {
            super(activity, android.R.layout.simple_list_item_1, entries);
        }

        @NonNull
        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            final TextView textView = (TextView) super.getView(position, convertView, parent);
            textView.setSingleLine(true);
            final FileListEntry entry = getItem(position);
            if (entry.isDirectory()) {
                textView.setCompoundDrawables(sFolderDrawable, null, null, null);
            } else {
                textView.setCompoundDrawables(null, null, null, null);
            }
            return textView;
        }
    }
}
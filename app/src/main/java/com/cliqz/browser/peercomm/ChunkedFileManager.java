package com.cliqz.browser.peercomm;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * @author Stefano Pacifici
 */
public class ChunkedFileManager {
    private static final int MAX_OPENED_FILES = 10;

    private final Map<String, ChunkedFile> openFiles;
    private final File path;

    @SuppressLint("ObsoleteSdkInt")
    public ChunkedFileManager(Context context) {
        openFiles = new HashMap<>();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            path = context.getFilesDir();
        } else {
            path = context.getNoBackupFilesDir();
        }
    }

    public ChunkedFile open(String name) throws IOException {
        if (openFiles.size() >= MAX_OPENED_FILES) {
            throw new IOException("Too many opened ChunkedFiles");
        }
        final ChunkedFile file = new ChunkedFile(this, name);
        openFiles.put(name, file);
        return file;
    }

    ChunkedFile getOpenedFile(String name) throws IOException {
        final ChunkedFile file = openFiles.get(name);
        if (file == null) {
            throw new IOException("File was not open");
        }
        return file;
    }

    public void close(String name) throws IOException {
        final ChunkedFile file = openFiles.get(name);
        if (file == null) {
            throw new IOException("File was not open");
        }
        file.close();
        openFiles.remove(name);
    }

    public void delete(String name) throws IOException {
        ChunkedFile.delete(this, name);
    }

    File getPath() {
        return path;
    }
}

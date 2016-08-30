package com.cliqz.antitracking.test;

import android.content.Context;
import android.content.ContextWrapper;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;

/**
 * @author Stefano Pacifici
 * @date 2016/07/21
 */
public class TestContext extends ContextWrapper {

    final File outputDirectory;
    final File cacheDirectory;
    final File filesDirectory;
    private final String identifier;

    public TestContext(Context base) {
        this(base, "" + System.currentTimeMillis());
    }

    private TestContext(Context base, String id) {
        super(base);
        identifier = id;
        final File contextsDirectory = new File(base.getExternalFilesDir(null), "contexts");
        outputDirectory = new File(contextsDirectory, identifier);
        cacheDirectory = new File(outputDirectory, "cache");
        filesDirectory = new File(outputDirectory, "files");

        createIfNeeded(cacheDirectory);
        createIfNeeded(filesDirectory);
    }

    private void createIfNeeded(File directory) {
        if (!directory.isDirectory() && !directory.mkdirs()) {
            throw new RuntimeException("Can't create TestContext");
        }
    }

    @Override
    public File getCacheDir() {
        return cacheDirectory;
    }

    @Override
    public File getExternalFilesDir(String type) {
        return filesDirectory;
    }

    @Override
    public File getFilesDir() {
        return filesDirectory;
    }

    @Override
    public FileOutputStream openFileOutput(String name, int mode) throws FileNotFoundException {
        final File file = new File(filesDirectory, name);
        final FileOutputStream outStream = new FileOutputStream(file, mode == MODE_APPEND);
        return outStream;
    }

    @Override
    public FileInputStream openFileInput(String name) throws FileNotFoundException {
        final File file = new File(filesDirectory, name);
        final FileInputStream inputStream = new FileInputStream(file);
        return inputStream;
    }

    @Override
    public Context getApplicationContext() {
        return new TestContext(super.getApplicationContext(), identifier);
    }
}
package com.cliqz.browser.utils;

import android.content.Context;
import android.os.Bundle;
import android.os.Parcel;
import android.webkit.WebView;

import androidx.annotation.AnyThread;
import androidx.annotation.MainThread;
import androidx.annotation.NonNull;

import com.cliqz.browser.main.BackgroundThreadHandler;
import com.cliqz.browser.main.MainThreadHandler;
import com.cliqz.browser.main.TabBundleKeys;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;

import javax.inject.Inject;
import javax.inject.Singleton;

import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.TrampolineConstants;
import timber.log.Timber;

/**
 * Asynchronous web view state persister
 *
 * @author Stefano Pacifici
 */
@Singleton
public class WebViewPersister {

    private static final String META_FILE_EXTENSION = "tabmeta";
    private static final String META_FILE_NAME_FORMAT = String.format(Locale.US, "%%s.%s", META_FILE_EXTENSION);
    private static final String DATA_FILE_NAME_FORMAT = "%s.dat";

    private final MainThreadHandler mainThreadHandler;
    private final BackgroundThreadHandler backgroundThreadHandler;
    private final File destDirectory;

    @Inject
    public WebViewPersister(@NonNull Context context,
                            @NonNull MainThreadHandler mainThreadHandler,
                            @NonNull BackgroundThreadHandler backgroundThreadHandler) {
        this.destDirectory = new File(context.getFilesDir(), "tabs");
        this.mainThreadHandler = mainThreadHandler;
        this.backgroundThreadHandler = backgroundThreadHandler;
    }

    @MainThread
    public void persist(@NonNull String identifier, @NonNull String title,
                        @NonNull String url, @NonNull WebView webView) {

        // Do not persist any tab that has the trampoline close command in the url
        if (url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_CLOSE_FORMAT)) {
            return;
        }
        backgroundThreadHandler.post(new PersistTabOperation(identifier, url, title, webView));
    }

    @MainThread
    public void remove(@NonNull String identifier) {
        backgroundThreadHandler.post(new DeleteTabOperation(identifier));
    }

    @MainThread
    public void visit(@NonNull String identifier) {
        backgroundThreadHandler.post(new VisitTabOperation(identifier));
    }

    @MainThread
    public void restore(@NonNull String id, @NonNull WebView view) {
        backgroundThreadHandler.post(new RestoreTabOperation(id, view));
    }

    @AnyThread
    @NonNull
    public List<Bundle> loadTabsMetaData() {
        final List<Bundle> metadata = new LinkedList<>();
        final MutableInt maxFileSize = new MutableInt(0);
        final File[] metafiles = destDirectory.listFiles(pathname -> {
            final boolean isMetaFile = pathname.getName().endsWith(META_FILE_EXTENSION);
            if (isMetaFile) {
                maxFileSize.value = Math.max(maxFileSize.value, (int) pathname.length());
            }
            return isMetaFile;
        });
        if (metafiles == null || metafiles.length == 0) {
            return metadata;
        }
        Arrays.sort(metafiles, (o1, o2) -> o1.getName().compareTo(o2.getName()));
        final byte[] byteBuffer = new byte[maxFileSize.value];
        for (final File metafile: metafiles) {
            try {
                final Bundle bundle = readMetadataBundle(metafile, byteBuffer);
                bundle.putLong(TabBundleKeys.LAST_VISIT, metafile.lastModified());
                metadata.add(bundle);
            } catch (Exception e) {
                Timber.e(e, "Invalid metadata from " + metafile + ". We'll remove it.");
                if (!metafile.delete()) {
                    Timber.e("Can't delete %s", metafile);
                }
            }
        }
        return metadata;
    }

    // the byteBuffer is reused over multiple calls and is already as big as the biggest
    // metadatafile
    private Bundle readMetadataBundle(File file, byte[] byteBuffer) throws IOException {
        InputStream in = null;
        final Parcel parcel = Parcel.obtain();
        try {
            in = new FileInputStream(file);
            final int read = in.read(byteBuffer);
            parcel.unmarshall(byteBuffer, 0, read);
            parcel.setDataPosition(0);
            final Bundle metadata = new Bundle();
            metadata.readFromParcel(parcel);
            return metadata;
        } finally {
            parcel.recycle();
            Utils.close(in);
        }
    }

    public void clearTabsData() {
        final File[] files = destDirectory.listFiles();
        if (files == null || files.length == 0) {
            return;
        }
        for (File file: files) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
    }

    abstract class Operation implements Runnable {
        abstract String id();
        abstract String name();

        abstract void execute() throws Exception;

        @Override
        public void run() {
            try {
                execute();
            } catch (Exception e) {
                Timber.e(e, "%s operation failed for tab %s", name(), id());
            }
        }
    }

    private class PersistTabOperation extends Operation {
        private final String id;
        private final String title;
        private final String url;
        private final Bundle state;

        PersistTabOperation(String id, String url, String title, WebView webView) {
            this.id = id;
            this.url = url;
            this.title = title;

            state = new Bundle();
            webView.saveState(state);
        }

        @Override
        public String id() {
            return id;
        }

        @Override
        public String name() {
            return "PERSIST";
        }

        @Override
        public void execute() throws Exception {
            if (!destDirectory.exists() && !destDirectory.mkdirs()) {
                throw new IOException("Can't create " + destDirectory + " folder");
            }
            final File metaFile = new File(destDirectory,
                    String.format(Locale.US, META_FILE_NAME_FORMAT, id));
            final File dataFile = new File(destDirectory,
                    String.format(Locale.US, DATA_FILE_NAME_FORMAT, id));

            // Store the metadata first
            final Bundle metaBundle = new Bundle();
            metaBundle.putString(TabBundleKeys.ID, id);
            metaBundle.putString(TabBundleKeys.TITLE, title);
            metaBundle.putString(TabBundleKeys.URL, url);
            writeBundleOut(metaFile, metaBundle);

            try {
                writeBundleOut(dataFile, state);
            } catch (Exception e) {
                // Remove the metadata file if something went wrong with the data files
                //noinspection ResultOfMethodCallIgnored
                metaFile.delete();
                throw e;
            }
        }

        private void writeBundleOut(File outFile, Bundle bundle) throws IOException {
            final File tmpFile = File.createTempFile(outFile.getName(), null);
            final Parcel parcel = Parcel.obtain();
            bundle.writeToParcel(parcel, 0);
            OutputStream out = null;
            try {
                out = new FileOutputStream(tmpFile);
                out.write(parcel.marshall());
                out.flush();
            } finally {
                Utils.close(out);
                parcel.recycle();
            }

            if (!tmpFile.renameTo(outFile)) {
                //noinspection ResultOfMethodCallIgnored
                tmpFile.delete();
                throw new IOException("Can't create data file");
            }
        }
    }

    private class DeleteTabOperation extends Operation {
        private final String id;

        DeleteTabOperation(String id) {
            this.id = id;
        }

        @Override
        public String id() {
            return id;
        }

        @Override
        public String name() {
            return "DELETE";
        }

        @Override
        public void execute() throws Exception {
            final File metaFile = new File(destDirectory,
                    String.format(Locale.US, META_FILE_NAME_FORMAT, id));
            final File dataFile = new File(destDirectory,
                    String.format(Locale.US, DATA_FILE_NAME_FORMAT, id));
            final boolean metaDeleted = metaFile.delete();
            final boolean dataDeleted = dataFile.delete();
            if (!metaDeleted) {
                throw new IOException("Can't delete " + metaFile);
            }
            if (!dataDeleted) {
                throw new IOException("Can't delete " + dataFile);
            }
        }
    }

    private class VisitTabOperation extends Operation {
        private final String id;

        VisitTabOperation(String identifier) {
            this.id = identifier;
        }

        @Override
        public String id() {
            return id;
        }

        @Override
        public String name() {
            return "VISIT";
        }

        @Override
        public void execute() throws Exception {
            final File metaFile = new File(destDirectory,
                    String.format(Locale.US, META_FILE_NAME_FORMAT, id));
            if (metaFile.exists() && !metaFile.setLastModified(System.currentTimeMillis())) {
                throw new IOException("Can't set acceess time to file " + metaFile);
            }
        }
    }

    private class RestoreTabOperation extends Operation {

        private final String id;
        private final WebView webView;

        RestoreTabOperation(@NonNull String id, @NonNull WebView view) {
            this.id = id;
            this.webView = view;
        }

        @Override
        String id() {
            return null;
        }

        @Override
        String name() {
            return "RESTORE";
        }

        @Override
        void execute() throws Exception {
            final File dataFile = new File(destDirectory,
                    String.format(Locale.US, DATA_FILE_NAME_FORMAT, id));
            if (dataFile.exists()) {
                final Parcel parcel = Parcel.obtain();
                final byte[] buffer = new byte[(int) dataFile.length()];
                InputStream in = null;
                Bundle state;
                try {
                    in = new FileInputStream(dataFile);
                    final int read = in.read(buffer);
                    if (read < buffer.length) {
                        throw new IOException("Can't read state file fully");
                    }
                    parcel.unmarshall(buffer, 0, buffer.length);
                    parcel.setDataPosition(0);
                    state = parcel.readBundle(getClass().getClassLoader());
                } finally {
                    Utils.close(in);
                    parcel.recycle();
                    // If the file is corrupted restoreState(...) will crash the app asynchronously:
                    // in order to be sure to not be caught in a crash loop let's remove the data file
                    //noinspection ResultOfMethodCallIgnored
                    dataFile.delete();
                }

                if (state != null) {
                    final Bundle finalState = state;
                    mainThreadHandler.post(() -> webView.restoreState(finalState));
                }
            }
        }
    }
}

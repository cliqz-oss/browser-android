package com.cliqz.browser.utils;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.Parcel;
import android.webkit.WebView;

import androidx.annotation.AnyThread;
import androidx.annotation.MainThread;
import androidx.annotation.NonNull;

import com.cliqz.browser.main.TabBundleKeys;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.ListIterator;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;

import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.TrampolineConstants;
import timber.log.Timber;

/**
 * Asynchronous web view state persister
 *
 * @author Stefano Pacifici
 */
public class WebViewPersister {

    private static final int QUEUE_OPERATION_MESSAGE_CODE = 1;
    private static final int PERFORM_OPERATIONS_CODE = 2;
    private static final int WORK_FINISHED_CODE = 3;
    private static final String META_FILE_EXTENSION = "tabmeta";
    private static final String META_FILE_NAME_FORMAT = String.format(Locale.US, "%%s.%s", META_FILE_EXTENSION);
    private static final String DATA_FILE_NAME_FORMAT = "%s.dat";

    private final CountDownLatch initCountDownLatch = new CountDownLatch(1);
    private Handler mHandler;
    private final File destDirectory;

    public WebViewPersister(@NonNull Context context) {
        this.destDirectory = new File(context.getFilesDir(), "tabs");
        Thread loopThread = new Loop();
        loopThread.start();
    }

    @MainThread
    public void persist(@NonNull String identifier, @NonNull String title,
                        @NonNull String url, @NonNull WebView webView) {

        // Do not persist any tab that has the trampoline close command in the url
        if (url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_CLOSE_FORMAT)) {
            return;
        }
        try {
            initCountDownLatch.await();
            final Message msg = mHandler.obtainMessage();
            msg.what = QUEUE_OPERATION_MESSAGE_CODE;
            msg.obj = new PersistTabOperation(identifier, url, title, webView);
            mHandler.sendMessage(msg);
        } catch (InterruptedException e) {
            Timber.e(e, "Can't init the persistence handler");
        }
    }

    @MainThread
    public void remove(@NonNull String identifier) {
        try {
            initCountDownLatch.await();
            final Message msg = mHandler.obtainMessage();
            msg.what = QUEUE_OPERATION_MESSAGE_CODE;
            msg.obj = new DeleteTabOperation(identifier);
            mHandler.sendMessage(msg);
        } catch (InterruptedException e) {
            Timber.e(e, "Can't init the persistence handler");
        }
    }

    @MainThread
    public void visit(@NonNull String identifier) {
        try {
            initCountDownLatch.await();
            final Message msg = mHandler.obtainMessage();
            msg.what = QUEUE_OPERATION_MESSAGE_CODE;
            msg.obj = new VisitTabOperation(identifier);
            mHandler.sendMessage(msg);
        } catch (InterruptedException e) {
            Timber.e(e, "Can't init the persistence handler");
        }
    }

    @MainThread
    public void restore(@NonNull String id, @NonNull WebView view) {
        final File dataFile = new File(destDirectory,
                String.format(Locale.US, DATA_FILE_NAME_FORMAT, id));
        if (dataFile.exists()) {
            final Parcel parcel = Parcel.obtain();
            final byte[] buffer = new byte[(int) dataFile.length()];
            InputStream in = null;
            Bundle state = null;
            try {
                in = new FileInputStream(dataFile);
                final int read = in.read(buffer);
                if (read < buffer.length) {
                    throw new IOException("Can't read state file fully");
                }
                parcel.unmarshall(buffer, 0, buffer.length);
                parcel.setDataPosition(0);
                state = parcel.readBundle(getClass().getClassLoader());
            } catch (Throwable e) {
                Timber.e(e, "Can't read state from %s", dataFile);
            } finally {
                Utils.close(in);
                parcel.recycle();
                // If the file is corrupted restoreState(...) will crash the app asynchronously:
                // in order to be sure to not be caught in a crash loop let's remove the data file
                //noinspection ResultOfMethodCallIgnored
                dataFile.delete();
            }

            if (state != null) {
                view.restoreState(state);
            }
        }
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

    private class Loop extends Thread {

        @Override
        public void run() {
            Looper.prepare();
            mHandler = new Scheduler();
            initCountDownLatch.countDown();
            Looper.loop();
        }
    }

    @SuppressLint("HandlerLeak")
    private class Scheduler extends Handler {
        private Map<String, List<Operation>> ops = new HashMap<>();
        private boolean mWorking = false;

        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case QUEUE_OPERATION_MESSAGE_CODE:
                    // Add an on operation to the queue and schedule a mass persist operation
                    final Operation operation = (Operation) msg.obj;
                    enqueueOperarion(operation.id(), operation);
                    if (!mWorking) {
                        sendEmptyMessage(PERFORM_OPERATIONS_CODE);
                    }
                    break;
                case PERFORM_OPERATIONS_CODE:
                    mWorking = true;
                    // We remove all others persist messages until now
                    removeMessages(PERFORM_OPERATIONS_CODE);
                    new Worker(ops).start();
                    // We start again to enqueue new persist operations
                    ops = new HashMap<>();
                    break;
                case WORK_FINISHED_CODE:
                    // We finished the persit process
                    mWorking = false;
                    if (!ops.isEmpty()) {
                        // We have new stuff to do, do it quickly
                        sendEmptyMessage(PERFORM_OPERATIONS_CODE);
                    }
                    break;
                default:
                    break;
            }
        }

        private void enqueueOperarion(String id, Operation operation) {
            if (ops.containsKey(id)) {
                Objects.requireNonNull(ops.get(id)).add(operation);
            } else {
                final List<Operation> list = new LinkedList<>();
                list.add(operation);
                ops.put(id, list);
            }
        }
    }

    interface Operation {
        String id();
        String name();
        void execute() throws Exception;
    }

    private class PersistTabOperation implements Operation {
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

    private class DeleteTabOperation implements Operation {
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
    private class Worker extends Thread {
        final Map<String, List<Operation>> ops;

        Worker(@NonNull Map<String, List<Operation>> ops) {
            this.ops = ops;
        }

        @Override
        public void run() {
            final List<Operation> cleanOpsList = new LinkedList<>();
            for (final List<Operation> operations: ops.values()) {
                final ListIterator<Operation> it = operations.listIterator(operations.size());
                while (it.hasPrevious()) {
                    final Operation op = it.previous();
                    cleanOpsList.add(op);
                    if (op instanceof DeleteTabOperation ||
                            op instanceof PersistTabOperation) {
                        break;
                    } else {
                        cleanOpsList.add(op);
                    }
                }
            }
            for (Operation operation : cleanOpsList) {
                try {
                    operation.execute();
                } catch (Exception e) {
                    Timber.e(e);
                }
            }
            mHandler.sendEmptyMessage(WORK_FINISHED_CODE);
        }
    }

    private class VisitTabOperation implements Operation {
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
}

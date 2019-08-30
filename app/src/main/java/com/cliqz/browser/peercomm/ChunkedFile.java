package com.cliqz.browser.peercomm;

import android.util.Base64;

import java.io.Closeable;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Locale;

import timber.log.Timber;

/**
 * @author Stefano Pacifici
 */
class ChunkedFile {

    // The number of the previous read chunk
    private int mReadChunk = -1;

    // The number of the previous written chunk
    private int mWriteChunk = -1;

    private final String name;
    private final File path;

    ChunkedFile(ChunkedFileManager manager, String name) {
        this.path = manager.getPath();
        this.name = Base64.encodeToString(name.getBytes(), Base64.DEFAULT);
        mWriteChunk = getCurrentChunkNumber();
    }

    private int getCurrentChunkNumber() {
        return path.list(new ChunkFilesFilter(name)).length - 1;
    }

    public void write(String chunk) throws IOException {
        final int chunkNo = mWriteChunk + 1;
        final File chunkFile = new File(path, String.format(Locale.US, "%s_%d.chunk", name, chunkNo));
        if (chunkFile.exists()) {
            if (!chunkFile.delete()) {
                throw new IOException("Can't delete " + chunkFile.getName());
            }
        }

        FileOutputStream os = null;
        try {
            os = new FileOutputStream(chunkFile);
            os.write(chunk.getBytes());
            mWriteChunk++;
        } finally {
            safeClose(os);
        }
    }

    String readNextChunk() throws IOException {
        final int chunkNo = mReadChunk + 1;
        final File chunkFile = new File(path, String.format(Locale.US, "%s_%d.chunk", name, chunkNo));
        if (!chunkFile.exists()) {
            return null;
        }

        FileInputStream is = null;
        try {
            is = new FileInputStream(chunkFile);
            final StringBuilder builder = new StringBuilder();
            final byte[] buffer = new byte[1024];
            int read;
            while ((read = is.read(buffer)) != 0) {
                builder.append(new String(buffer, 0, read));
            }
            mReadChunk++;
            return builder.toString();
        } finally {
            safeClose(is);
        }
    }

    private void safeClose(Closeable is) {
        if (is != null) {
            try {
                is.close();
            } catch (IOException e) {
                Timber.d(e, "Can't close file");
            }
        }
    }

    public void close() {
    }

    public void reset() {
        mReadChunk = -1;
        mWriteChunk = -1;
    }

    public static void delete(ChunkedFileManager manager, String name) throws IOException {
        final File path = manager.getPath();
        final String name64 = Base64.encodeToString(name.getBytes(), Base64.DEFAULT);
        final String[] files = path.list(new ChunkFilesFilter(name64));
        for (String fileName: files) {
            final File file = new File(path, fileName);
            if (!file.delete()) {
                throw new IOException("Can't delete " + fileName);
            }
        }
    }

    private static class ChunkFilesFilter  implements FilenameFilter {

        private final String prefix;

        ChunkFilesFilter(String name) {
            prefix = name + "_";
        }

        @Override
        public boolean accept(File dir, String filename) {
            return filename.startsWith(prefix) && filename.endsWith(".chunk");
        }
    }
}
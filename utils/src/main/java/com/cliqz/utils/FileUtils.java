package com.cliqz.utils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Deque;
import java.util.LinkedList;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("TryFinallyCanBeTryWithResources")
public class FileUtils {

    private FileUtils() {}

    public static String readTextFromFile(final File input) throws IOException {
        if (input == null) {
            return "";
        }

        try {
            final FileInputStream is = new FileInputStream(input);
            final String result = StreamUtils.readTextStream(is);
            is.close();
            return result;
        } catch (FileNotFoundException|SecurityException e) {
            throw new IOException(e);
        }
    }

    public static void writeTextToFile(File output, String str) throws IOException {
        if (output == null || str == null || str.isEmpty()) {
            return;
        }

        final FileOutputStream os = new FileOutputStream(output);
        try {
            os.write(str.getBytes());
        } finally {
            os.close();
        }
    }

    /**
     * Delete recursively a directory or a file. This method is used only by the tests, <b>do not
     * use it the app</b>.
     *
     * @param inFile the directory or the file you want to delete
     * @return true if no error occurred, false otherwise
     */
    public static boolean deleteRecursively(File inFile) {
        if (inFile == null || !inFile.exists()) {
            return false;
        }
        boolean result = true;
        final Deque<File> filesStack = new LinkedList<>();
        filesStack.push(inFile);
        while (!filesStack.isEmpty()) {
            final File file = filesStack.peek();
            if (file.isFile()) {
                result &= file.delete();
                filesStack.pop();
                continue;
            }
            final File[] children = file.listFiles();
            if (children == null || children.length == 0) {
                result &= file.delete();
                filesStack.pop();
                continue;
            }
            for (File child: children) {
                filesStack.push(child);
            }
        }
        return result;
    }
}

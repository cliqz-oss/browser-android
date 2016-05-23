package com.cliqz.browser.widget;

import android.content.Context;
import android.util.Log;

import com.cliqz.browser.R;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;

/**
 * @author Stefano Pacifici
 * @date 2015/10/14
 */
public class AutocompleteService {
    private static final String EXTRA_COMPLETION_FILE_NAME = "completion.dat";
    private static File sExtraCompletionFile = null;

    private final static String TAG = AutocompleteService.class.getSimpleName();

    private AutocompletionTrie mAutoCompletionIndex = null;
    private ArrayList<String> mAutocompletions = null;

    /**
     * Create an instance of the {@link AutocompleteService} and asynchronously load the completion
     * string pool
     *
     * @param context a {@link Context} needed to load the completion pool
     *
     * @return a {@link AutocompleteService} instance
     */
    public static AutocompleteService createInstance(Context context) {
        final AutocompleteService service = new AutocompleteService();
        if (sExtraCompletionFile == null) {
            sExtraCompletionFile = new File(context.getFilesDir(), EXTRA_COMPLETION_FILE_NAME);
        }
        new DictionaryLoader(context, service).start();
        return service;
    }

    private AutocompleteService() {
        mAutoCompletionIndex = null;
    }

    /**
     * @return true if the completion pool was loaded, false otherwise
     */
    public boolean isReady() {
        return mAutoCompletionIndex != null;
    }

    /**
     * Complete the given prefix
     *
     * @param prefix a string to complete
     * @return a possible completion
     */
    public synchronized String autocomplete(String prefix) {
        if (!isReady() || prefix == null || prefix.length() == 0) {
            return null;
        }

        final int ref = mAutoCompletionIndex.findRef(prefix);
        return ref >= 0 && ref < mAutocompletions.size() ? mAutocompletions.get(ref) : null;
    }

    /**
     * Add the given string to the completion pool
     *
     * @param completion the string to add
     */
    public synchronized void improveAutocomplete(String completion) {
        if (!isReady() || completion == null || completion.length() < 2) {
            return;
        }

        if (!mAutocompletions.contains(completion)) {
            mAutocompletions.add(completion);
            mAutoCompletionIndex.update(completion, mAutocompletions.size() - 1);
            new DictionaryStorer(completion).start();
        }
    }

    private static class DictionaryLoader extends Thread {
        final AutocompleteService service;
        final Context context;

        DictionaryLoader(Context context, AutocompleteService service) {
            this.service = service;
            this.context = context;
        }

        @Override
        public void run() {
            final AutocompletionTrie trie = new AutocompletionTrie();
            final ArrayList<String> completions = new ArrayList<>();

            final InputStream defaultIs = context.getResources().openRawResource(R.raw.default_completion);
            readFrom(defaultIs, trie, completions);
            InputStream updatesIs = null;
            try {
                updatesIs = new FileInputStream(sExtraCompletionFile);
                readFrom(updatesIs, trie, completions);
            } catch (FileNotFoundException e) {
                Log.i(TAG, "Can't read updates for completion", e);
            }

            close(defaultIs);
            close(updatesIs);
            service.mAutoCompletionIndex = trie;
            service.mAutocompletions = completions;
        }

        private void close(InputStream is) {
            try {
                if (is != null) {
                    is.close();
                }
            } catch (IOException e) {
                Log.e(TAG, "Can't close the given InputStream", e);
            }

        }

        private void readFrom(final InputStream is, final AutocompletionTrie trie,
                              final ArrayList<String> completions) {
            final BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            try {
                String line = reader.readLine();
                while (line != null) {
                    if (line.length() == 0) {
                        continue;
                    }
                    completions.add(line);
                    trie.update(line, completions.size() - 1);
                    line = reader.readLine();
                }
            } catch (IOException e) {
                Log.e(TAG, "Error reading default autocompletion", e);
            } finally {
                try {
                    reader.close();
                } catch (IOException e) {
                    Log.e(TAG, "Error closing the autocompletion file", e);
                }
            }
        }
    }

    private static class DictionaryStorer extends Thread {

        private final String completion;

        DictionaryStorer(String completion) {
            this.completion = completion;
        }

        @Override
        public void run() {
            try {
                BufferedWriter writer =
                        new BufferedWriter(new FileWriter(sExtraCompletionFile, true));
                writer.write(completion);
                writer.newLine();
                writer.close();
            } catch (FileNotFoundException e) {
                Log.e(TAG, "Can't find the completion file", e);
            } catch (IOException e) {
                Log.e(TAG, "Error writing the completion file", e);
            }
        }
    }
}

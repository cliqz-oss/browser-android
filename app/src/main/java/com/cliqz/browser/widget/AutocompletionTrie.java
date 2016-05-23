package com.cliqz.browser.widget;

import java.util.ArrayList;

/**
 * A trie (not a tree) implementation tha store String prefixes and an integer (reference) as value.
 * It is used to implement fast auto completion for urls in {@link AutocompleteEditText}
 *
 * @author Stefano Pacifici
 * @date 2015/10/15
 */
public class AutocompletionTrie {

    static class Node {
        char key;
        int ref; // Reference inside the autocompletion list
        ArrayList<Node> continuations;

        Node(char key, int ref) {
            this.key = key;
            this.ref = ref;
            this.continuations = new ArrayList<>();
        }

        @Override
        public String toString() {
            return "Key: " + key + " Ref: " + ref + "Cont: " + continuations.toString();
        }
    }

    private final Node root = new Node('*', -1);

    /**
     * Update the backing data structure with the given string and reference.
     * <pre>
     *     root -> (s, 0) -> (p, 0) -> (i, 0) -> (e, 0) -> (., 0) -> (o, 0) -> (r, 0) -> (g, 0)
     *
     *     update("spiegel.de", 1)
     *
     *     root -> (s, 1) -> (p, 1) -> (i, 1) -> (e, 1) -> (., 0) -> (o, 0) -> (r, 0) -> (g, 0)
     *                                                  \
     *                                                   -> (g, 1) -> (e, 1) -> (l, 1) -> ...
     *
     * </pre>
     * @param string    the string to be associated with the ref
     * @param ref       the value associated with the string
     */
    public void update(String string, int ref) {
        if (string == null || string.isEmpty()) {
            return;
        }

        String suffix = string;
        Node currentNode = root;
        while (!suffix.isEmpty()) {
            final char leadChar = suffix.charAt(0);
            suffix = suffix.substring(1);
            boolean found = false;
            for (Node continuation: currentNode.continuations) {
                if (continuation.key == leadChar) {
                    continuation.ref = ref;
                    currentNode = continuation;
                    found = true;
                    break;
                }
            }
            if (!found) {
                final Node node = new Node(leadChar, ref);
                currentNode.continuations.add(node);
                currentNode = node;
            }
        }
    }

    /**
     * Find the most likely reference (value) for the given prefix
     *
     * @param prefix
     * @return the reference most likely associated to the prefix
     */
    public int findRef(String prefix) {
        if (prefix == null || prefix.isEmpty()) {
            return -1;
        }
        String currentPrefix = prefix;
        Node currentNode = root;
        while (!currentPrefix.isEmpty() && currentNode != null) {
            final char leadChar = currentPrefix.charAt(0);
            Node nextNode = null;
            currentPrefix = currentPrefix.substring(1);
            for (Node continuation: currentNode.continuations) {
                if (continuation.key == leadChar) {
                    nextNode = continuation;
                    break;
                }
            }
            currentNode = nextNode;
        }
        return currentPrefix.isEmpty() && currentNode != null ? currentNode.ref : -1;
    }
}

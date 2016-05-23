package acr.browser.lightning.view;

/**
 * @author Stefano Pacifici
 * @date 2016/02/25
 */
public final class TrampolineConstants {
    private TrampolineConstants() {} // No instances

    public static final String CLIQZ_SCHEME = "cliqz";
    public static final String CLIQZ_TRAMPOLINE_AUTHORITY = "trampoline";
    public static final String CLIQZ_TRAMPOLINE_GOTO_PATH = "/goto.html";
    public static final String CLIQZ_TRAMPOLINE_SEARCH_PATH = "/search.html";
    public static final String CLIQZ_TRAMPOLINE_CLOSE_PATH = "/close.html";
    public static final String CLIQZ_TRAMPOLINE_HISTORY_PATH = "/history.html";

    public static final String CLIQZ_TRAMPOLINE_PREFIX = String.format("%s://%s", CLIQZ_SCHEME, CLIQZ_TRAMPOLINE_AUTHORITY);
    public static final String CLIQZ_TRAMPOLINE_GOTO = String.format("%s%s", CLIQZ_TRAMPOLINE_PREFIX, CLIQZ_TRAMPOLINE_GOTO_PATH);
}

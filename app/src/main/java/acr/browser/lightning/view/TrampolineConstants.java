package acr.browser.lightning.view;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public final class TrampolineConstants {
    public static final String TRAMPOLINE_COMMAND_PARAM_NAME = "cliqz_cmd";
    public static final String TRAMPOLINE_COMMAND_CLOSE = "close";
    public static final String TRAMPOLINE_COMMAND_GOTO = "goto";
    public static final String TRAMPOLINE_COMMAND_SEARCH="search";
    public static final String TRAMPOLINE_QUERY_PARAM_NAME = "cliqz_q";
    public static final String TRAMPOLINE_RESET_PARAM_NAME = "cliqz_r";
    public static final String TRAMPOLINE_FROM_HISTORY_PARAM_NAME = "cliqz_h";
    public static final String TRAMPOLINE_COMMAND_HISTORY = "history";
    public static final String TRAMPOLINE_PAGE_TITLE = "trampoline";

    public static final String TRAMPOLINE_COMMAND_CLOSE_FORMAT = TRAMPOLINE_COMMAND_PARAM_NAME +
            "=" + TRAMPOLINE_COMMAND_CLOSE;

    private TrampolineConstants() {} // No instances
}

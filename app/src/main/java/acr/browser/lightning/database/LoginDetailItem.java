package acr.browser.lightning.database;

import androidx.annotation.NonNull;

/**
 * @author Stefano Pacifici
 */
public class LoginDetailItem {

    public final String domain;
    public final String loginId;
    public final String password;

    public LoginDetailItem(@NonNull String domain,
                           @NonNull String loginId,
                           @NonNull String password) {
        this.domain = domain;
        this.loginId = loginId;
        this.password = password;
    }
}

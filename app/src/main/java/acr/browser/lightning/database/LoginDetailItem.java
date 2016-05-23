package acr.browser.lightning.database;

/**
 * Created by Ravjit on 19/02/16.
 */
public class LoginDetailItem {

    private String mDomain;
    private String mLoginId;
    private String mPassword;

    public LoginDetailItem(String domain, String loginId, String password) {
        this.mDomain = domain;
        this.mLoginId = loginId;
        this.mPassword = password;
    }

    public String getDomain() {
        return mDomain;
    }

    public String getLoginId() {
        return mLoginId;
    }

    public String getPassword() {
        return mPassword;
    }
}

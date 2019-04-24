package acr.browser.lightning.view

import acr.browser.lightning.bus.BrowserEvents
import acr.browser.lightning.utils.UrlUtils
import android.Manifest
import android.app.Activity
import android.support.v7.app.AlertDialog
import com.anthonycr.grant.PermissionsManager
import com.anthonycr.grant.PermissionsResultAction
import com.cliqz.browser.R
import com.cliqz.browser.main.Messages
import org.mozilla.geckoview.*

class CliqzChromeClient(private val activity: Activity,
                        private val lightningView: LightningView):
        GeckoSession.ContentDelegate,
        GeckoSession.MediaDelegate,
        GeckoSession.NavigationDelegate,
        GeckoSession.PermissionDelegate,
        GeckoSession.ProgressDelegate,
        GeckoSession.PromptDelegate {

    private val eventBus = lightningView.eventBus
    private var mLastUrl: String? = null
    private var mLastTitle: String? = null

    override fun onButtonPrompt(session: GeckoSession?, title: String?, msg: String?, btnMsg: Array<out String>?, callback: GeckoSession.PromptDelegate.ButtonCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onDateTimePrompt(session: GeckoSession?, title: String?, type: Int, value: String?, min: String?, max: String?, callback: GeckoSession.PromptDelegate.TextCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onFilePrompt(session: GeckoSession?, title: String?, type: Int, mimeTypes: Array<out String>?, callback: GeckoSession.PromptDelegate.FileCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onColorPrompt(session: GeckoSession?, title: String?, value: String?, callback: GeckoSession.PromptDelegate.TextCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onAuthPrompt(session: GeckoSession?, title: String?, msg: String?, options: GeckoSession.PromptDelegate.AuthOptions?, callback: GeckoSession.PromptDelegate.AuthCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onChoicePrompt(session: GeckoSession?, title: String?, msg: String?, type: Int, choices: Array<out GeckoSession.PromptDelegate.Choice>?, callback: GeckoSession.PromptDelegate.ChoiceCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onAlert(session: GeckoSession?, title: String?, msg: String?, callback: GeckoSession.PromptDelegate.AlertCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onTextPrompt(session: GeckoSession?, title: String?, msg: String?, value: String?, callback: GeckoSession.PromptDelegate.TextCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onPopupRequest(session: GeckoSession?, targetUri: String?): GeckoResult<AllowOrDeny> {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
        return GeckoResult.ALLOW
    }

    override fun onPageStop(session: GeckoSession?, success: Boolean) {
        // Nothing to do?
    }

    override fun onSecurityChange(session: GeckoSession?, securityInfo: GeckoSession.ProgressDelegate.SecurityInformation?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onPageStart(session: GeckoSession?, url: String?) {
        // Nothing to do?
    }

    /* WebChromeClient.onProgressChanged(WebView view, int newProgress); */
    override fun onProgressChange(session: GeckoSession?, progress: Int) {
        if (lightningView.isShown) {
            eventBus.post(BrowserEvents.UpdateProgress(progress))
        }
    }

    /* WebChromeClient.onGeolocationPermissionsSHowPrompt(); */
    override fun onContentPermissionRequest(
            session: GeckoSession?,
            uri: String?,
            type: Int,
            callback: GeckoSession.PermissionDelegate.Callback?) {
        if (type == GeckoSession.PermissionDelegate.PERMISSION_GEOLOCATION) {
            val origin = uri ?: ""
            PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(
                    activity,
                    object : PermissionsResultAction() {
                override fun onGranted() {
                    val builder = AlertDialog.Builder(activity)
                    builder.setTitle(activity.getString(R.string.location))
                    val org: String = if (origin.length > 50) {
                        "${origin.subSequence(0, 50)}..."
                    } else {
                        origin
                    }
                    builder.setMessage(org + activity.getString(R.string.message_location))
                            .setCancelable(true)
                            .setPositiveButton(activity.getString(R.string.action_allow))
                                { _, _ -> callback?.grant() }
                            .setNegativeButton(activity.getString(R.string.action_dont_allow))
                                { _, _ -> callback?.reject() }
                    val alert = builder.create()
                    alert.show()
                }

                override fun onDenied(permission: String) {
                    //TODO show message and/or turn off setting
                }
            }, Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    override fun onAndroidPermissionsRequest(session: GeckoSession?, permissions: Array<out String>?, callback: GeckoSession.PermissionDelegate.Callback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onMediaPermissionRequest(session: GeckoSession?, uri: String?, video: Array<out GeckoSession.PermissionDelegate.MediaSource>?, audio: Array<out GeckoSession.PermissionDelegate.MediaSource>?, callback: GeckoSession.PermissionDelegate.MediaCallback?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onLoadRequest(session: GeckoSession, request: GeckoSession.NavigationDelegate.LoadRequest): GeckoResult<AllowOrDeny>? {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
        return GeckoResult.ALLOW
    }

    override fun onLocationChange(session: GeckoSession?, url: String?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onCanGoForward(session: GeckoSession?, canGoForward: Boolean) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onCanGoBack(session: GeckoSession?, canGoBack: Boolean) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    /* WebChromeClient.onCreateWindow(); */
    override fun onNewSession(session: GeckoSession, uri: String): GeckoResult<GeckoSession>? {
        eventBus.post(BrowserEvents.CreateWindow(lightningView, null))
        return GeckoResult.fromValue(null)
    }

    override fun onLoadError(session: GeckoSession?, uri: String?, error: WebRequestError?): GeckoResult<String> {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
        return GeckoResult.fromValue("Load Error")
    }

    override fun onMediaAdd(session: GeckoSession, element: MediaElement) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onMediaRemove(session: GeckoSession, element: MediaElement) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    /* WebChromeClient.onShowCustomView() WebChromeClient.onHideCustomView() */
    override fun onFullScreen(session: GeckoSession?, fullScreen: Boolean) {
        if (fullScreen) {
            eventBus.post(BrowserEvents.ShowCustomView(null, null))
        } else {
            eventBus.post(BrowserEvents.HideCustomView())
        }
    }

    override fun onExternalResponse(session: GeckoSession?, response: GeckoSession.WebResponseInfo?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    /* WebChromeClient.onCloseWindow(WebView window) */
    override fun onCloseRequest(session: GeckoSession?) {
        eventBus.post(BrowserEvents.CloseWindow(lightningView))
    }

    /* WebChromeClient.onReceivedTitle(WebView view, String title); */
    override fun onTitleChange(session: GeckoSession?, title: String?) {
        val url = lightningView.url
        if (title != null && !title.isEmpty() &&
                !url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME) &&
                !lightningView.isUrlSSLError) {
            lightningView.mTitle.title = title
            eventBus.post(Messages.UpdateTitle())
        }
        if (!url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME) && !lightningView.isIncognitoTab) {
            if (url != mLastUrl) {
                lightningView.addItemToHistory(title, url)
                mLastUrl = url
                mLastTitle = title
            } else if (title != null && !title.isEmpty() && title != mLastTitle) {
                // urlView is the same but the titleView changed
                lightningView.updateHistoryItemTitle(title)
                mLastTitle = title
            }
        }
        lightningView.isHistoryItemCreationEnabled = true
        if (UrlUtils.isYoutubeVideo(url)) {
            eventBus.post(Messages.FetchYoutubeVideoUrls())
        } else {
            eventBus.post(Messages.SetVideoUrls(null))
        }
        lightningView.isUrlSSLError = false
    }

    override fun onFocusRequest(session: GeckoSession?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onFirstComposite(session: GeckoSession?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onCrash(session: GeckoSession?) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun onContextMenu(session: GeckoSession, screenX: Int, screenY: Int, element: GeckoSession.ContentDelegate.ContextElement) {
        // TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    // Favicon handling(?)
    // WebChromeClient.getDefaultVideoPoster()
    // WebChromeClient.getVideoLoadingProgressView()

    // Console log support(?)
    // WebChromeClient.onConsoleMessage()

}
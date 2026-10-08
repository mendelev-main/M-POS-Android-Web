package com.mendelev.mpos.web

import android.content.Intent
import android.net.Uri
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.mendelev.mpos.MainActivity
import com.mendelev.mpos.media.ProductImageStore

class LocalContentWebViewClient(
    private val activity: MainActivity,
    private val assetLoader: WebViewAssetLoader,
    private val images: ProductImageStore,
) : WebViewClientCompat() {
    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        val uri = request.url
        if (uri.scheme == "mpos-image") return uri.host?.let(images::response)
        return assetLoader.shouldInterceptRequest(uri)
    }

    @Suppress("DEPRECATION")
    override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
        val uri = Uri.parse(url)
        if (uri.scheme == "mpos-image") return uri.host?.let(images::response)
        return assetLoader.shouldInterceptRequest(uri)
    }

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url
        if (uri.host == MainActivity.APP_HOST) return false
        runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        return true
    }

    override fun onPageFinished(view: WebView, url: String) {
        super.onPageFinished(view,url)
        if (Uri.parse(url).host == MainActivity.APP_HOST) {
            val version=org.json.JSONObject.quote(com.mendelev.mpos.BuildConfig.VERSION_NAME)
            activity.callJavaScript("window.__MPOS_VERSION__=$version;document.querySelectorAll('.settings-version').forEach(n=>n.textContent='Версия '+$version);")
        }
    }

    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        activity.recreateAfterRendererExit()
        return true
    }
}

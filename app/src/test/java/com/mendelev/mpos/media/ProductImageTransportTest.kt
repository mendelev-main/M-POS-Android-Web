package com.mendelev.mpos.media

import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import com.mendelev.mpos.MainActivity
import com.mendelev.mpos.web.LocalContentWebViewClient
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class ProductImageTransportTest {
    @Suppress("DEPRECATION")
    @Test fun restoredLocalImageIsServedOverTrustedHttpsWithoutNetwork() {
        val context = RuntimeEnvironment.getApplication()
        val images = ProductImageStore(context)
        val bytes = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 1, 2, 0xFF.toByte(), 0xD9.toByte())
        val id = images.save(bytes)
        val activity = Robolectric.buildActivity(MainActivity::class.java).get()
        val loader = WebViewAssetLoader.Builder().setDomain(MainActivity.APP_HOST).build()
        val client = LocalContentWebViewClient(activity, loader, images)
        val view = WebView(context)
        try {
            val restored = client.shouldInterceptRequest(view, "https://${MainActivity.APP_HOST}/product-images/$id")
            assertNotNull(restored)
            assertArrayEquals(bytes, restored!!.data.use { it.readBytes() })
            assertNull(client.shouldInterceptRequest(view, "https://other.test/product-images/$id"))
            assertNull(client.shouldInterceptRequest(view, "https://${MainActivity.APP_HOST}/product-images/../../secret"))
            assertNull(client.shouldInterceptRequest(view, "https://${MainActivity.APP_HOST}/product-images/not-an-id"))
            assertArrayEquals(bytes, images.read(id))
        } finally {
            images.remove(id)
            view.destroy()
        }
    }
}

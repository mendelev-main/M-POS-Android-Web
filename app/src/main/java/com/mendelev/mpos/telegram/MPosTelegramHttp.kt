package com.mendelev.mpos.telegram

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Bounded HTTPS transport shared by text, PNG and PDF; no token URLs in errors. */
class MPosTelegramHttp(private val client: OkHttpClient = defaultClient()) {
    fun post(token: String, method: String, body: RequestBody) {
        require(method in setOf("sendMessage", "sendPhoto", "sendDocument"))
        val request = Request.Builder().url("https://api.telegram.org/bot$token/$method").post(body).build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful || !runCatching { JSONObject(raw).optBoolean("ok") }.getOrDefault(false))
                throw MPosTelegramFailure.fromResponse(response.code, raw)
        }
    }
    fun close() { client.dispatcher.cancelAll(); client.connectionPool.evictAll() }
    companion object {
        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .callTimeout(25, TimeUnit.SECONDS)
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(12, TimeUnit.SECONDS)
            .writeTimeout(12, TimeUnit.SECONDS)
            .followRedirects(false).followSslRedirects(false)
            .retryOnConnectionFailure(false).build()
    }
}

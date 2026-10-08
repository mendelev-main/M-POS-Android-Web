package com.mendelev.mpos.network

import androidx.lifecycle.LifecycleCoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/** Transport only: the original offline POS owns all commands, retries and persistence. */
class MPosWebNetwork(private val scope: LifecycleCoroutineScope, private val result: (JSONObject) -> Unit) {
    private val http = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS)
        .followRedirects(false).followSslRedirects(false).build()
    private val events = http.newBuilder().readTimeout(0, TimeUnit.SECONDS).build()
    private val calls = ConcurrentHashMap<String, Call>()
    private val jobs = ConcurrentHashMap<String, Job>()
    fun handle(payload: JSONObject) {
        val id = payload.optString("id")
        if (id.isBlank()) return
        when(payload.optString("action")) {
            "cancel" -> { jobs.remove(id)?.cancel(); calls.remove(id)?.cancel() }
            "fetch" -> fetch(id, payload)
            "events" -> stream(id, payload)
        }
    }
    private fun message(id: String, type: String) = JSONObject().put("id", id).put("type", type)
    private fun request(payload: JSONObject): Request {
        val url = payload.getString("url")
        val builder = Request.Builder().url(url)
        val parsed = builder.build().url
        require(parsed.isHttps && parsed.username.isEmpty() && parsed.password.isEmpty())
        val method = payload.optString("method", "GET").uppercase()
        require(method in setOf("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"))
        val headers = payload.optJSONObject("headers") ?: JSONObject()
        for(key in headers.keys()) builder.header(key, headers.getString(key))
        val body = if(method in setOf("GET", "HEAD")) null else payload.optString("body", "").toRequestBody()
        return builder.method(method, body).build()
    }
    private fun failure(id: String, error: Exception) {
        val description = when(error) {
            is java.net.UnknownHostException -> "Не найден адрес сервера. Проверьте адрес и DNS"
            is javax.net.ssl.SSLException -> "Не удалось проверить HTTPS сертификат сервера"
            is java.io.InterruptedIOException -> "Сервер не ответил вовремя"
            is IllegalArgumentException -> "Укажите корректный HTTPS адрес сервера"
            else -> "Нет связи с сервером. Проверьте интернет на планшете"
        }
        result(message(id,"error").put("message",description))
    }
    private fun fetch(id: String, payload: JSONObject) {
        val call = try { http.newCall(request(payload)) } catch(error: Exception) { failure(id,error);return }
        calls.put(id,call)?.cancel()
        scope.launch(Dispatchers.IO) {
            try {
                call.execute().use { response ->
                    val headers = JSONObject(); response.headers.names().forEach { headers.put(it,response.header(it)) }
                    result(message(id,"response").put("status",response.code).put("statusText",response.message)
                        .put("headers",headers).put("body",response.body?.string().orEmpty()))
                }
            } catch(error: Exception) { if(!call.isCanceled()) failure(id,error) }
            finally { calls.remove(id,call) }
        }
    }
    private fun stream(id: String, payload: JSONObject) {
        val initial = try { request(payload).newBuilder().header("Accept","text/event-stream").build() }
            catch(error: Exception) { failure(id,error);return }
        jobs.remove(id)?.cancel();calls.remove(id)?.cancel()
        val job = scope.launch(Dispatchers.IO, start=kotlinx.coroutines.CoroutineStart.LAZY) {
            var lastEventId = "";var retryMs=3000L
            while(isActive) {
                val builder=initial.newBuilder();if(lastEventId.isNotEmpty())builder.header("Last-Event-ID",lastEventId)
                val call=events.newCall(builder.build());calls[id]=call
                try {
                    call.execute().use { response ->
                        require(response.isSuccessful && response.header("Content-Type").orEmpty().startsWith("text/event-stream"))
                        result(message(id,"open"))
                        response.body!!.charStream().buffered().use { reader ->
                            val data=mutableListOf<String>();var event="message";var first=true
                            fun dispatch(){if(data.isNotEmpty())result(message(id,"event").put("event",event).put("data",data.joinToString("\n")).put("lastEventId",lastEventId));data.clear();event="message"}
                            while(isActive) {
                                var line=reader.readLine() ?: break
                                if(first){line=line.removePrefix("\uFEFF");first=false}
                                if(line.isEmpty()){dispatch();continue};if(line.startsWith(":"))continue
                                val split=line.indexOf(':');val field=if(split<0)line else line.substring(0,split)
                                val value=if(split<0)"" else line.substring(split+1).removePrefix(" ")
                                when(field){"data"->data+=value;"event"->event=value.ifEmpty{"message"};"id"->if(!value.contains('\u0000'))lastEventId=value;"retry"->value.toLongOrNull()?.let{retryMs=it.coerceIn(1000,60000)}}
                            }
                        }
                    }
                    if(isActive)result(message(id,"error").put("message","Поток заказов прерван; подключаемся повторно"))
                } catch(error: Exception){if(isActive && !call.isCanceled())failure(id,error)}
                finally { calls.remove(id,call);call.cancel() }
                if(isActive)delay(retryMs)
            }
        }
        jobs[id]=job;job.invokeOnCompletion{jobs.remove(id,job)};job.start()
    }
    fun close(){jobs.values.forEach{it.cancel()};jobs.clear();calls.values.forEach{it.cancel()};calls.clear()}
}

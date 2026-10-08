package com.mendelev.mpos.telegram

import org.json.JSONObject
import java.io.File
import okhttp3.FormBody
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.Executors

class TelegramClient(
    private val createWarehousePdf: (JSONObject) -> File,
    private val onResult: (Boolean, String) -> Unit,
    private val onMonthlyResult: (JSONObject) -> Unit,
    private val onShiftResult: (Boolean, String) -> Unit,
    private val onTestResult: ((JSONObject) -> Unit)? = null,
    private val onTestProgress: ((JSONObject) -> Unit)? = null,
    private val http: MPosTelegramHttp = MPosTelegramHttp(),
) {
    private val executor = Executors.newSingleThreadExecutor()
    private val testExecutor = Executors.newSingleThreadExecutor()

    fun close() { http.close(); testExecutor.shutdownNow(); executor.shutdownNow() }

    fun handle(payload: JSONObject) {
        val action = payload.optString("action")
        val requestId = payload.optString("requestId")
        val result: (Boolean, String) -> Unit = { ok, message ->
            if (action == "test" && requestId.isNotBlank() && onTestResult != null)
                onTestResult.invoke(JSONObject().put("requestId", requestId).put("ok", ok).put("message", message))
            else onResult(ok, message)
        }
        if (action == "test") onTestProgress?.invoke(JSONObject().put("requestId", requestId).put("message", "Android получил запрос проверки Telegram"))
        val token = payload.optString("botToken").trim()
        val chatId = payload.optString("chatId").trim()
        if (token.isBlank() || chatId.isBlank()) {
            if (action == "sendShiftCloseReport") onShiftResult(false, "Укажите токен бота и ID рабочей группы")
            else result(false, "Укажите токен бота и ID рабочей группы")
            return
        }
        if (action == "sendShiftCloseReport") {
            val report = payload.optJSONObject("report")
            if (report == null || report.length() == 0) return onShiftResult(false, "Не заполнен отчёт о закрытии смены")
            executor.execute {
                runCatching {
                    val png = MPosShiftReceiptImage.render(report)
                    sendPhoto(token, chatId, payload.optString("threadId"), png, MPosShiftReceipt.caption(report))
                }.onSuccess { onShiftResult(true, "Чек закрытия смены отправлен в Telegram") }
                    .onFailure { onShiftResult(false, MPosTelegramFailure.message(it)) }
            }
            return
        }
        if (action == "sendMonthlyWarehouseReport") {
            val periodKey = payload.optString("periodKey")
            val report = payload.optJSONObject("report")
            if (periodKey.isBlank() || report == null) return onMonthlyResult(JSONObject().put("ok", false).put("message", "Не заполнен складской отчёт").put("periodKey", periodKey))
            executor.execute {
                runCatching {
                    val file = createWarehousePdf(report)
                    sendDocument(token, chatId, payload.optString("threadId"), file,
                        "📊 <b>Ежемесячный складской отчёт</b>\nПериод: ${escape(report.optString("period", periodKey))}")
                }.onSuccess {
                    onMonthlyResult(JSONObject().put("ok", true).put("message", "Ежемесячный складской отчёт отправлен").put("periodKey", periodKey))
                }.onFailure {
                    onMonthlyResult(JSONObject().put("ok", false).put("message", MPosTelegramFailure.message(it)).put("periodKey", periodKey))
                }
            }
            return
        }
        val text = when (action) {
            "test" -> "🟢 <b>Telegram подключён</b>\nM POS Android успешно связался с рабочей группой."
            "send" -> payload.optString("text")
            else -> return result(false, "Эта Telegram-команда ещё не перенесена на Android")
        }
        (if (action == "test") testExecutor else executor).execute {
            if (action == "test") onTestProgress?.invoke(JSONObject().put("requestId", requestId).put("message", "Подключаемся к Telegram API…"))
            runCatching { send(token, chatId, payload.optString("threadId"), text) }
                .onSuccess { result(true, if (action == "test") "Telegram подключён" else "Отчёт отправлен") }
                .onFailure { result(false, MPosTelegramFailure.message(it)) }
        }
    }

    private fun send(token: String, chatId: String, threadId: String, text: String) {
        val body = FormBody.Builder().add("chat_id", chatId).add("text", text).add("parse_mode", "HTML")
        if (threadId.isNotBlank()) body.add("message_thread_id", threadId)
        http.post(token, "sendMessage", body.build())
    }

    private fun sendDocument(token: String, chatId: String, threadId: String, file: File, caption: String) {
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("chat_id", chatId).addFormDataPart("caption", caption).addFormDataPart("parse_mode", "HTML")
            .addFormDataPart("document", file.name, file.asRequestBody("application/pdf".toMediaType()))
        if (threadId.isNotBlank()) body.addFormDataPart("message_thread_id", threadId)
        http.post(token, "sendDocument", body.build())
    }

    private fun sendPhoto(token: String, chatId: String, threadId: String, png: ByteArray, caption: String) {
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("chat_id", chatId).addFormDataPart("caption", caption).addFormDataPart("parse_mode", "HTML")
            .addFormDataPart("photo", "shift-report.png", png.toRequestBody("image/png".toMediaType()))
        if (threadId.isNotBlank()) body.addFormDataPart("message_thread_id", threadId)
        http.post(token, "sendPhoto", body.build())
    }

    private fun escape(value: String) = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
}

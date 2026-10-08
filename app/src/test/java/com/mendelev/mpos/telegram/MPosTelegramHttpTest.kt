package com.mendelev.mpos.telegram

import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class MPosTelegramHttpTest {
    private fun client(status: Int = 200, raw: String = "{\"ok\":true}") = OkHttpClient.Builder()
        .addInterceptor { chain -> Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1)
            .code(status).message("fixture").body(raw.toResponseBody()).build() }.build()

    @Test fun allRequestPhasesHaveBoundedDeadlinesAndNoAutomaticDuplicateRetry() {
        val c = MPosTelegramHttp.defaultClient()
        assertEquals(25_000, c.callTimeoutMillis)
        assertEquals(8_000, c.connectTimeoutMillis)
        assertEquals(12_000, c.writeTimeoutMillis)
        assertEquals(12_000, c.readTimeoutMillis)
        assertFalse(c.followRedirects); assertFalse(c.followSslRedirects); assertFalse(c.retryOnConnectionFailure)
    }

    @Test fun telegramRejectionIsMappedWithoutEchoingTokensOrRawDescription() {
        val http = MPosTelegramHttp(client(400, "{\"ok\":false,\"description\":\"Bad Request: chat not found fixture-secret\"}"))
        try {
            http.post("fixture-token", "sendMessage", FormBody.Builder().add("chat_id", "-1001").build())
            fail("Expected rejection")
        } catch (e: MPosTelegramFailure) {
            assertTrue(e.safeMessage.contains("Не найден чат"))
            assertFalse(e.safeMessage.contains("fixture-secret"));assertFalse(e.safeMessage.contains("fixture-token"))
        } finally { http.close() }
        assertTrue(MPosTelegramFailure.message(java.io.InterruptedIOException("secret URL")).contains("не ответил вовремя"))
    }

    @Test fun http200WithTelegramOkFalseIsNotSuccess() {
        val http = MPosTelegramHttp(client(200, "{\"ok\":false}"))
        try { http.post("fixture-token", "sendMessage", FormBody.Builder().build()); fail("Expected rejection") }
        catch (_: MPosTelegramFailure) {} finally { http.close() }
    }

    @Test fun testAndNativeProgressCompleteWhileMonthlyDocumentIsBlocked() {
        val documentStarted=CountDownLatch(1);val releaseDocument=CountDownLatch(1)
        val testFinished=CountDownLatch(1);val documentFinished=CountDownLatch(1)
        val progress=java.util.Collections.synchronizedList(mutableListOf<String>())
        var testResult:JSONObject?=null;var monthlyResult:JSONObject?=null
        val c=OkHttpClient.Builder().addInterceptor { chain ->
            val request=chain.request();val bytes=Buffer();request.body!!.writeTo(bytes)
            if(request.url.encodedPath.endsWith("sendDocument")) {
                assertTrue(bytes.readUtf8().contains("name=\"document\""))
                documentStarted.countDown();assertTrue(releaseDocument.await(3,TimeUnit.SECONDS))
            } else {
                val fields=bytes.readUtf8();assertTrue(fields.contains("chat_id=-1001"));assertTrue(fields.contains("message_thread_id=42"))
            }
            Response.Builder().request(request).protocol(Protocol.HTTP_1_1).code(200).message("fixture").body("{\"ok\":true}".toResponseBody()).build()
        }.build()
        val file=File.createTempFile("telegram-fixture", ".pdf").apply { writeText("fixture PDF bytes") }
        val telegram=TelegramClient({file},{_,_->},{monthlyResult=it;documentFinished.countDown()},{_,_->},
            onTestResult={testResult=it;testFinished.countDown()},onTestProgress={progress.add(it.getString("requestId"))},http=MPosTelegramHttp(c))
        val config=JSONObject().put("botToken","fixture-token").put("chatId","-1001").put("threadId","42")
        try {
            telegram.handle(JSONObject(config.toString()).put("action","sendMonthlyWarehouseReport").put("periodKey","2026-09").put("report",JSONObject()))
            assertTrue(documentStarted.await(3,TimeUnit.SECONDS))
            telegram.handle(JSONObject(config.toString()).put("action","test").put("requestId","test-1"))
            assertTrue(testFinished.await(3,TimeUnit.SECONDS));assertEquals("test-1",testResult!!.getString("requestId"));assertTrue(testResult!!.getBoolean("ok"))
            assertEquals(listOf("test-1","test-1"),progress.toList())
            releaseDocument.countDown();assertTrue(documentFinished.await(3,TimeUnit.SECONDS));assertTrue(monthlyResult!!.getBoolean("ok"))
        } finally { releaseDocument.countDown();telegram.close();file.delete() }
    }
}

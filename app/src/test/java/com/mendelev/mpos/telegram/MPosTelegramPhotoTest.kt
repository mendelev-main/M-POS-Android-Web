package com.mendelev.mpos.telegram

import java.io.ByteArrayOutputStream
import org.junit.Assert.*
import org.junit.Test

class MPosTelegramPhotoTest {
    @Test fun multipartPreservesPngAndRoutesToConfiguredGroupAndTopic() {
        val png=byteArrayOf(0x89.toByte(),0x50,0x4e,0x47,0,0xff.toByte())
        val output=ByteArrayOutputStream()
        MPosTelegramPhoto.write(output,"fixture-boundary","-100123","42","Смена закрыта",png)
        val bytes=output.toByteArray();val text=String(bytes,Charsets.ISO_8859_1)
        assertTrue(text.contains("name=\"chat_id\"\r\n\r\n-100123"))
        assertTrue(text.contains("name=\"message_thread_id\"\r\n\r\n42"))
        assertTrue(text.contains("filename=\"shift-report.png\"\r\nContent-Type: image/png\r\n\r\n"))
        val suffix="\r\n--fixture-boundary--\r\n".toByteArray()
        assertArrayEquals(suffix,bytes.takeLast(suffix.size).toByteArray())
        assertArrayEquals(png,bytes.copyOfRange(bytes.size-suffix.size-png.size,bytes.size-suffix.size))
    }
    @Test fun invalidOrEmptyTopicDoesNotSendTelegramThreadField() {
        for(topic in listOf("","0","-1","invalid")) {
            val output=ByteArrayOutputStream()
            MPosTelegramPhoto.write(output,"b","-100123",topic,"Отчёт",byteArrayOf(1))
            assertFalse(output.toString("UTF-8").contains("name=\"message_thread_id\""))
        }
    }
}

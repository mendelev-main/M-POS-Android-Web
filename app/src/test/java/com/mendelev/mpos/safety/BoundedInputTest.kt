package com.mendelev.mpos.safety

import java.io.ByteArrayInputStream
import java.io.InputStream
import org.junit.Assert.*
import org.junit.Test

class BoundedInputTest {
    @Test fun exactLimitPreservesBytes() {
        val bytes = byteArrayOf(1,2,3,4)
        assertArrayEquals(bytes, BoundedInput.read(ByteArrayInputStream(bytes), 4, "oversize"))
    }
    @Test fun oversizedStreamStopsAfterLimitPlusOneWithoutReadingEntireFile() {
        var consumed = 0
        val stream = object : InputStream() {
            override fun read(): Int { consumed++; return 7 }
            override fun read(b: ByteArray, off: Int, len: Int): Int { for(i in 0 until len)b[off+i]=7;consumed+=len;return len }
        }
        try { BoundedInput.read(stream, 4, "oversize");fail("Should reject") }
        catch (e: IllegalArgumentException) { assertEquals("oversize", e.message) }
        assertEquals(5, consumed)
    }
}

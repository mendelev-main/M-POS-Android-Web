package com.mendelev.mpos.safety

import java.io.ByteArrayOutputStream
import java.io.InputStream

object BoundedInput {
    const val MAX_BACKUP_BYTES = 32 * 1024 * 1024
    const val MAX_PHOTO_BYTES = 32 * 1024 * 1024
    fun read(input: InputStream, limit: Int, message: String): ByteArray {
        require(limit > 0)
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        var total = 0
        while (true) {
            val count = input.read(buffer, 0, minOf(buffer.size, limit - total + 1))
            if (count < 0) break
            if (count == 0) continue
            total += count
            require(total <= limit) { message }
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }
}

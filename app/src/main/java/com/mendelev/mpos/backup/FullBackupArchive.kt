package com.mendelev.mpos.backup

import android.util.Base64
import com.mendelev.mpos.safety.BoundedInput
import org.json.JSONObject
import java.io.InputStream
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

/** Native envelope only. POS JSON remains unchanged; images are never aggregated in memory. */
object FullBackupArchive {
    private const val DOCUMENT = "mpos-backup-v1.json"
    const val MAX_IMAGE_BYTES = 2_000_000

    private fun imageIds(document: JSONObject): Set<String> {
        val products = document.optJSONArray("products") ?: error("Некорректный файл резервной копии")
        return buildSet {
            for (index in 0 until products.length()) {
                val id = products.getJSONObject(index).optString("localImageId")
                if (id.isNotBlank()) add(id)
            }
        }
    }

    fun write(document: JSONObject, output: OutputStream, readImage: (String) -> ByteArray?) {
        val ids = imageIds(document)
        val data = JSONObject(document.toString()).apply { remove("productImages"); put("imageCount", ids.size) }
        val json = data.toString().toByteArray(Charsets.UTF_8)
        require(json.size <= BoundedInput.MAX_BACKUP_BYTES) { "Данные без фотографий превышают 32 МБ; копия не создана" }
        ZipOutputStream(output).use { zip ->
            zip.putNextEntry(ZipEntry(DOCUMENT)); zip.write(json); zip.closeEntry()
            for (id in ids) {
                require(validId(id)) { "Некорректная ссылка на фотографию" }
                val bytes = readImage(id) ?: error("Локальная фотография отсутствует; неполная копия не создана")
                require(bytes.size <= MAX_IMAGE_BYTES) { "Фотография превышает допустимый размер" }
                zip.putNextEntry(ZipEntry("images/$id.jpg")); zip.write(bytes); zip.closeEntry()
            }
        }
    }

    fun read(input: InputStream, saveImage: (ByteArray) -> String): JSONObject {
        ZipInputStream(input).use { zip ->
            val first = zip.nextEntry ?: error("Пустой архив резервной копии")
            require(first.name == DOCUMENT && !first.isDirectory) { "Неизвестный формат резервной копии" }
            val document = JSONObject(BoundedInput.read(zip, BoundedInput.MAX_BACKUP_BYTES, "Данные копии превышают 32 МБ").toString(Charsets.UTF_8))
            require(!document.has("productImages")) { "Некорректный архив резервной копии" }
            val ids = imageIds(document)
            require(ids.all(::validId)) { "Некорректная ссылка на фотографию" }
            val replacements = mutableMapOf<String, String>()
            while (true) {
                val entry = zip.nextEntry ?: break
                val id = entry.name.removePrefix("images/").removeSuffix(".jpg")
                require(!entry.isDirectory && entry.name == "images/$id.jpg" && id in ids && id !in replacements) { "Некорректный раздел фотографий" }
                val bytes = BoundedInput.read(zip, MAX_IMAGE_BYTES, "Фотография превышает допустимый размер")
                // Read to EOF verifies entry CRC before staging it.
                replacements[id] = saveImage(bytes)
            }
            require(replacements.keys == ids) { "В резервной копии отсутствуют фотографии; восстановление отменено" }
            val products = document.getJSONArray("products")
            for (index in 0 until products.length()) {
                val product = products.getJSONObject(index)
                replacements[product.optString("localImageId")]?.let { product.put("localImageId", it) }
            }
            document.put("imageCount", ids.size)
            return document
        }
    }

    /** Backward-compatible reader for the original JSON/Base64 envelope. */
    fun readLegacy(input: InputStream, saveImage: (ByteArray) -> String): JSONObject {
        val document = JSONObject(BoundedInput.read(input, BoundedInput.MAX_BACKUP_BYTES, "Файл старой резервной копии больше 32 МБ").toString(Charsets.UTF_8))
        val products = document.optJSONArray("products") ?: error("Некорректный файл резервной копии")
        val encoded = document.optJSONObject("productImages") ?: JSONObject()
        document.remove("productImages")
        for (index in 0 until products.length()) {
            val product = products.getJSONObject(index)
            val oldId = product.optString("localImageId")
            if (oldId.isBlank() || !encoded.has(oldId)) {
                product.remove("localImageId"); product.remove("imageUploadPending"); continue
            }
            product.put("localImageId", saveImage(Base64.decode(encoded.getString(oldId), Base64.DEFAULT)))
        }
        return document
    }

    private fun validId(id: String) = runCatching { java.util.UUID.fromString(id).toString().equals(id, true) }.getOrDefault(false)
}

package com.mendelev.mpos.backup

import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.mendelev.mpos.MainActivity
import com.mendelev.mpos.media.ProductImageStore
import com.mendelev.mpos.safety.BoundedInput
import org.json.JSONArray
import org.json.JSONObject

class BackupManager(
    private val activity: MainActivity,
    private val images: ProductImageStore,
) {
    private var pendingExport: ByteArray? = null
    private var pendingExportName = "M-POS-backup.mposbackup"

    fun handle(payload: JSONObject) {
        when (payload.optString("action")) {
            "export" -> prepareExport(payload)
            "chooseImport" -> activity.chooseBackupFile()
            "cancelImport" -> payload.optJSONArray("imageIds").strings().forEach(images::remove)
            "finishImport" -> images.prune(payload.optJSONArray("activeImageIds").strings().toSet())
        }
    }

    fun writeExport(uri: Uri) {
        val data = pendingExport ?: return
        runCatching { activity.contentResolver.openOutputStream(uri, "w")!!.use { it.write(data) } }
            .onSuccess { result(true, "Резервная копия сохранена") }
            .onFailure { result(false, "Не удалось записать резервную копию") }
        pendingExport = null
    }

    fun import(uri: Uri) {
        val staged = mutableListOf<String>()
        runCatching {
            val raw = activity.contentResolver.openInputStream(uri)!!.use { input ->
                BoundedInput.read(input, BoundedInput.MAX_BACKUP_BYTES, "Файл резервной копии больше 32 МБ; восстановление не начато")
            }
            val document = JSONObject(raw.toString(Charsets.UTF_8))
            val products = document.optJSONArray("products") ?: error("Некорректный файл резервной копии")
            val encoded = document.optJSONObject("productImages") ?: JSONObject()
            document.remove("productImages")
            for (index in 0 until products.length()) {
                val product = products.getJSONObject(index)
                val oldId = product.optString("localImageId")
                if (oldId.isBlank() || !encoded.has(oldId)) {
                    product.remove("localImageId")
                    product.remove("imageUploadPending")
                    continue
                }
                val image = Base64.decode(encoded.getString(oldId), Base64.DEFAULT)
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(image, 0, image.size, bounds)
                require(image.size <= 2_000_000 && bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth.toLong() * bounds.outHeight <= 16_000_000) {
                    "Повреждена фотография товара в резервной копии"
                }
                val fresh = images.save(image)
                staged += fresh
                product.put("localImageId", fresh)
            }
            document.put("imageCount", staged.size)
            activity.callJavaScript(
                "window.handleNativeBackupImport&&window.handleNativeBackupImport(${document},${JSONArray(staged)});",
                onError = {
                    staged.forEach(images::remove)
                    result(false, "Не удалось открыть резервную копию")
                },
            )
        }.onFailure { error ->
            staged.forEach(images::remove)
            result(false, error.message ?: "Некорректный файл резервной копии")
        }
    }

    private fun prepareExport(payload: JSONObject) {
        runCatching {
            val document = JSONObject(payload.getJSONObject("data").toString())
            val productImages = JSONObject()
            val products = document.optJSONArray("products") ?: JSONArray()
            var photoBytes = 0L
            for (index in 0 until products.length()) {
                val id = products.optJSONObject(index)?.optString("localImageId").orEmpty()
                if (id.isNotBlank() && !productImages.has(id)) {
                    val bytes = images.read(id) ?: error("Локальная фотография отсутствует; неполная копия не создана")
                    photoBytes += bytes.size
                    require(photoBytes <= 20 * 1024 * 1024) { "Фотографии превышают безопасный размер копии; файл не создан" }
                    productImages.put(id, Base64.encodeToString(bytes, Base64.NO_WRAP))
                }
            }
            document.put("productImages", productImages)
            document.put("imageCount", productImages.length())
            val bytes = document.toString(2).toByteArray(Charsets.UTF_8)
            require(bytes.size <= BoundedInput.MAX_BACKUP_BYTES) { "Резервная копия больше 32 МБ; файл не создан" }
            pendingExport = bytes
            pendingExportName = payload.optString("fileName", pendingExportName).replace('/', '-')
            activity.createBackupFile(pendingExportName)
        }.onFailure { pendingExport = null; result(false, if (it is IllegalArgumentException || it is IllegalStateException) it.message ?: "Не удалось подготовить резервную копию" else "Не удалось подготовить резервную копию") }
    }

    private fun result(ok: Boolean, message: String) {
        activity.callJavaScript("window.handleNativeBackupResult&&window.handleNativeBackupResult({ok:$ok,message:${JSONObject.quote(message)}});")
    }

    private fun JSONArray?.strings(): List<String> {
        if (this == null) return emptyList()
        return buildList { for (index in 0 until length()) optString(index).takeIf(String::isNotBlank)?.let(::add) }
    }
}

package com.mendelev.mpos.backup

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.mendelev.mpos.MainActivity
import com.mendelev.mpos.media.ProductImageStore
import java.util.concurrent.atomic.AtomicBoolean
import java.io.File
import java.io.PushbackInputStream
import org.json.JSONArray
import org.json.JSONObject

class BackupManager(
    private val activity: MainActivity,
    private val images: ProductImageStore,
) {
    @Volatile private var pendingExport: File? = null
    private val exporting = AtomicBoolean(false)
    init {
        // Remove abandoned private snapshots after a process restart.
        activity.cacheDir.listFiles()?.filter { it.name.startsWith("mpos-backup-") && it.extension == "mposbackup" }?.forEach { it.delete() }
    }
    private var pendingExportName = "M-POS-backup.mposbackup"

    fun handle(payload: JSONObject) {
        when (payload.optString("action")) {
            "export" -> {
                if (exporting.compareAndSet(false, true)) activity.lifecycleScope.launch(Dispatchers.IO) { prepareExport(payload) }
                else result(false, "Создание резервной копии уже выполняется")
            }
            "chooseImport" -> activity.chooseBackupFile()
            "cancelImport" -> payload.optJSONArray("imageIds").strings().forEach(images::remove)
            "finishImport" -> images.prune(payload.optJSONArray("activeImageIds").strings().toSet())
        }
    }

    fun writeExport(uri: Uri) {
        val data = pendingExport ?: return
        runCatching {
            activity.contentResolver.openOutputStream(uri, "w")!!.use { output -> data.inputStream().use { it.copyTo(output) } }
        }
            .onSuccess { result(true, "Резервная копия сохранена") }
            .onFailure { result(false, "Не удалось записать резервную копию") }
        cancelExport()
    }

    fun cancelExport() { pendingExport?.delete(); pendingExport = null; exporting.set(false) }

    fun import(uri: Uri) {
        val staged = mutableListOf<String>()
        runCatching {
            fun saveImage(image: ByteArray): String {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(image, 0, image.size, bounds)
                require(image.size <= FullBackupArchive.MAX_IMAGE_BYTES && bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth.toLong() * bounds.outHeight <= 16_000_000) {
                    "Повреждена фотография товара в резервной копии"
                }
                return images.save(image).also { staged += it }
            }
            val document = activity.contentResolver.openInputStream(uri)!!.use { raw ->
                val input = PushbackInputStream(raw, 2)
                val prefix = ByteArray(2)
                var count = 0
                while (count < 2) { val byte = input.read(); if (byte < 0) break; prefix[count++] = byte.toByte() }
                input.unread(prefix, 0, count)
                if (count == 2 && prefix[0] == 0x50.toByte() && prefix[1] == 0x4b.toByte()) {
                    FullBackupArchive.read(input, ::saveImage)
                } else {
                    // Previously exported JSON/base64 backups remain readable.
                    FullBackupArchive.readLegacy(input, ::saveImage)
                }
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
        var temporary: File? = null
        runCatching {
            val document = payload.getJSONObject("data")
            // Build the entire archive privately before offering a destination. Never emit a partial snapshot.
            val file = File.createTempFile("mpos-backup-", ".mposbackup", activity.cacheDir)
            temporary = file
            file.outputStream().buffered().use { FullBackupArchive.write(document, it, images::read) }
            pendingExport = file
            pendingExportName = payload.optString("fileName", pendingExportName).replace('/', '-')
            activity.createBackupFile(pendingExportName)
        }.onFailure {
            temporary?.delete(); pendingExport = null; exporting.set(false)
            result(false, if (it is IllegalArgumentException || it is IllegalStateException) it.message ?: "Не удалось подготовить резервную копию" else "Не удалось подготовить резервную копию; проверьте свободное место")
        }
    }

    private fun result(ok: Boolean, message: String) {
        activity.callJavaScript("window.handleNativeBackupResult&&window.handleNativeBackupResult({ok:$ok,message:${JSONObject.quote(message)}});")
    }

    private fun JSONArray?.strings(): List<String> {
        if (this == null) return emptyList()
        return buildList { for (index in 0 until length()) optString(index).takeIf(String::isNotBlank)?.let(::add) }
    }
}

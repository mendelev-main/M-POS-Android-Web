package com.mendelev.mpos.backup

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28])
class FullBackupArchiveTest {
    private fun document(ids: List<String>) = JSONObject().put("products", JSONArray().apply {
        ids.forEach { put(JSONObject().put("id", "product-$it").put("localImageId", it).put("stock", -3)) }
    }).put("orders", JSONArray().put(JSONObject().put("id", "fixture-order").put("total", 12.5)))

    @Test fun completeRoundTripAboveOldPhotoAndBackupLimitsPreservesDataAndDeduplicatesPhotos() {
        val ids = List(36) { UUID.randomUUID().toString() }
        val original = document(ids + ids.first())
        val bytes = ByteArray(1_000_000) { (it % 251).toByte() }
        var reads = 0
        val output = ByteArrayOutputStream()
        FullBackupArchive.write(original, output) { reads++; bytes }
        assertEquals(36, reads)
        assertFalse(original.has("imageCount"))
        var restoredCount = 0
        val restored = FullBackupArchive.read(ByteArrayInputStream(output.toByteArray())) {
            assertArrayEquals(bytes, it); "restored-${restoredCount++}"
        }
        assertEquals(36, restoredCount)
        assertEquals(36, restored.getInt("imageCount"))
        assertEquals(original.getJSONArray("orders").toString(), restored.getJSONArray("orders").toString())
        assertEquals(37, restored.getJSONArray("products").length())
        assertEquals("restored-0", restored.getJSONArray("products").getJSONObject(36).getString("localImageId"))
        assertEquals(-3, restored.getJSONArray("products").getJSONObject(0).getInt("stock"))
    }

    @Test fun missingSourceImageFailsInsteadOfCreatingIncompleteBackup() {
        try { FullBackupArchive.write(document(listOf(UUID.randomUUID().toString())), ByteArrayOutputStream()) { null }; fail() }
        catch (expected: IllegalStateException) { assertTrue(expected.message!!.contains("отсутствует")) }
    }

    private fun archive(vararg entries: Pair<String, ByteArray>): ByteArray {
        val output = ByteArrayOutputStream()
        ZipOutputStream(output).use { zip -> entries.forEach { (name, bytes) ->
            zip.putNextEntry(ZipEntry(name));zip.write(bytes);zip.closeEntry()
        } }
        return output.toByteArray()
    }

    @Test fun missingArchivePhotoRejectsBeforeReturningAnyDocument() {
        val data = document(listOf(UUID.randomUUID().toString()))
        val bytes = archive("mpos-backup-v1.json" to data.toString().toByteArray())
        try { FullBackupArchive.read(ByteArrayInputStream(bytes)) { fail(); "unused" };fail() }
        catch (expected: IllegalArgumentException) { assertTrue(expected.message!!.contains("отсутствуют")) }
    }

    @Test fun oversizedPhotoAndUnexpectedPathAreRejected() {
        val id = UUID.randomUUID().toString()
        val data = document(listOf(id)).toString().toByteArray()
        for ((name, photo) in listOf("images/$id.jpg" to ByteArray(2_000_001), "../outside.jpg" to byteArrayOf(1))) {
            val bytes = archive("mpos-backup-v1.json" to data, name to photo)
            try { FullBackupArchive.read(ByteArrayInputStream(bytes)) { fail(); "unused" };fail() }
            catch (_: IllegalArgumentException) { /* bounded input and exact entry names */ }
        }
    }

    @Test fun noPhotoBackupRemainsCompleteAndUnsupportedFormatRejected() {
        val output = ByteArrayOutputStream()
        FullBackupArchive.write(document(emptyList()), output) { fail(); null }
        val restored = FullBackupArchive.read(ByteArrayInputStream(output.toByteArray())) { fail(); "unused" }
        assertEquals(0, restored.getInt("imageCount"))
        val bad = archive("unknown-v2.json" to "{}".toByteArray())
        try { FullBackupArchive.read(ByteArrayInputStream(bad)) { "unused" };fail() }
        catch (_: IllegalArgumentException) { }
    }
    @Test fun originalJsonBase64BackupStillRestoresPhotosAndData() {
        val id = UUID.randomUUID().toString()
        val bytes = byteArrayOf(1, 5, 8, 10)
        val original = document(listOf(id)).put("productImages", JSONObject().put(id, android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)))
        val restored = FullBackupArchive.readLegacy(ByteArrayInputStream(original.toString().toByteArray())) {
            assertArrayEquals(bytes, it); "new-photo-id"
        }
        assertFalse(restored.has("productImages"))
        assertEquals("new-photo-id", restored.getJSONArray("products").getJSONObject(0).getString("localImageId"))
        assertEquals(original.getJSONArray("orders").toString(), restored.getJSONArray("orders").toString())
    }

}

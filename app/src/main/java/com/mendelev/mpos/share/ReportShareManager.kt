package com.mendelev.mpos.share

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import androidx.core.content.FileProvider
import com.mendelev.mpos.BuildConfig
import com.mendelev.mpos.documents.MPosPurchasePdf
import com.mendelev.mpos.documents.MPosShiftPdf
import com.mendelev.mpos.documents.MPosWarehousePdf
import com.mendelev.mpos.documents.MPosWarehouseWorkbook
import com.mendelev.mpos.MainActivity
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ReportShareManager(private val activity: MainActivity) {
    private val directory = File(activity.cacheDir, "shared").apply { mkdirs() }

    fun warehousePdf(report: JSONObject) = runCatching {
        val file = createWarehousePdf(report)
        share(file, "application/pdf", report.optString("title", "Складской учёт"))
    }.onFailure { activity.nativeMessage("Не удалось сформировать PDF") }

    fun warehouseExcel(report: JSONObject) = runCatching {
        val file = File(directory, safeName(report.optString("title", "Складской-учёт")) + ".xlsx")
        createXlsx(report, file)
        share(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", report.optString("title", "Складской учёт"))
    }.onFailure { activity.nativeMessage("Не удалось сформировать Excel") }

    fun purchaseOrder(order: JSONObject) = runCatching {
        val file = File(directory, "Заказ-${safeName(order.optString("supplierName", "поставщику"))}.pdf")
        MPosPurchasePdf.write(order, file)
        share(file, "application/pdf", "Заказ поставщику")
    }.onFailure { activity.nativeMessage("Не удалось сформировать заказ") }

    fun createWarehousePdf(report: JSONObject): File {
        val file = File(directory, safeName(report.optString("title", "Складской-учёт")) + ".pdf")
        createPdf(report, file)
        return file
    }

    fun printShiftReport(report: JSONObject) = runCatching {
        val formatter = SimpleDateFormat("dd.MM.yyyy-HH-mm", Locale("ru", "RU"))
        val openedAt = report.optLong("openedAt").takeIf { it > 0 } ?: System.currentTimeMillis()
        val file = File(directory, "Смена-${formatter.format(Date(openedAt))}.pdf")
        createShiftPdf(report, file)
        val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
        printManager.print("Отчёт по смене", PdfFilePrintAdapter(file), PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
            .build())
    }.onFailure { activity.nativeMessage("Не удалось подготовить отчёт по смене") }

    private fun createShiftPdf(report: JSONObject, file: File) = MPosShiftPdf.write(report, file)
    private fun createPdf(report: JSONObject, file: File) = MPosWarehousePdf.write(report, file)
    private fun createXlsx(report: JSONObject, file: File) = MPosWarehouseWorkbook.write(report, file)

    private fun share(file: File, mime: String, title: String) {
        val uri = FileProvider.getUriForFile(activity, "${BuildConfig.APPLICATION_ID}.files", file)
        activity.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }, title))
    }

    private class PdfFilePrintAdapter(private val file: File) : PrintDocumentAdapter() {
        override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes, cancellationSignal: CancellationSignal, callback: LayoutResultCallback, extras: Bundle?) {
            if (cancellationSignal.isCanceled) return callback.onLayoutCancelled()
            callback.onLayoutFinished(PrintDocumentInfo.Builder(file.name)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build(), oldAttributes != newAttributes)
        }

        override fun onWrite(pages: Array<out android.print.PageRange>, destination: ParcelFileDescriptor, cancellationSignal: CancellationSignal, callback: WriteResultCallback) {
            if (cancellationSignal.isCanceled) return callback.onWriteCancelled()
            runCatching { file.inputStream().use { input -> FileOutputStream(destination.fileDescriptor).use(input::copyTo) } }
                .onSuccess { callback.onWriteFinished(arrayOf(android.print.PageRange.ALL_PAGES)) }
                .onFailure { callback.onWriteFailed(it.message) }
        }
    }

    private fun safeName(value: String) = value.replace(Regex("[^\\p{L}\\p{N}._-]+"), "-").trim('-').take(60).ifBlank { "M-POS" }
}

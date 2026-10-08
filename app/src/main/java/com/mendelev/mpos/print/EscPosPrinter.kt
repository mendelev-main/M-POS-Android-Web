package com.mendelev.mpos.print

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.media.AudioManager
import android.media.ToneGenerator
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.Executors
import kotlin.math.ceil

class EscPosPrinter(private val onEvent: (JSONObject) -> Unit) {
    private val executor = Executors.newCachedThreadPool()

    fun handle(payload: JSONObject) {
        val order = payload.optJSONObject("order") ?: return
        order.optString("__notificationSound").takeIf(String::isNotBlank)?.let {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 85).startTone(ToneGenerator.TONE_PROP_BEEP, 280)
            return
        }
        val ip = order.optString("__networkPrinterIp").trim()
        val port = order.optInt("__networkPrinterPort", 9100)
        if (!validIpv4(ip) || port !in 1..65535) return event("printError", "network_error", "Неверный IP-адрес принтера")
        executor.execute {
            runCatching {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress(ip, port), 10_000)
                    socket.soTimeout = 10_000
                    val bytes = if (order.optBoolean("__networkTest")) testPage() else EscPosRaster.encode(order)
                    socket.getOutputStream().use { output -> output.write(bytes); output.flush() }
                }
            }.onSuccess {
                event("printed", "network_printed", if (order.optBoolean("__networkTest")) "Пробная печать отправлена" else "Чек отправлен на принтер")
            }.onFailure { error -> event("printError", "network_error", "Ошибка печати: ${error.localizedMessage ?: "принтер недоступен"}") }
        }
    }

    fun ready() = event("status", "network_ready", "Сетевая печать готова")

    private fun event(type: String, status: String, message: String) = onEvent(JSONObject().put("type", type).put("status", status).put("message", message))
    private fun validIpv4(value: String) = value.split('.').let { parts -> parts.size == 4 && parts.all { part -> part.toIntOrNull()?.let { it in 0..255 } == true } }
    private fun testPage() = byteArrayOf(0x1b, 0x40) + "\nM POS\nTEST PRINT\nLAN TCP 9100 OK\n\n\n".toByteArray() + byteArrayOf(0x1d, 0x56, 0x42, 0)
}

internal object EscPosRaster {
    fun encode(order: JSONObject): ByteArray {
        val bitmap=render(order)
        return try { ByteArrayOutputStream().apply {write(byteArrayOf(0x1b,0x40));write(raster(bitmap));write(byteArrayOf(0x0a,0x1d,0x56,0x42,0))}.toByteArray() } finally { bitmap.recycle() }
    }
    fun render(order:JSONObject):Bitmap {
        val model=MPosReceiptLayout.build(order);val content=model.width-model.margin*2
        data class Measured(val row:MPosReceiptLayout.Row,val left:android.text.StaticLayout?,val right:android.text.StaticLayout?,val height:Float)
        val measured=model.rows.map{row->
            if(row.kind==MPosReceiptLayout.Kind.SEPARATOR)Measured(row,null,null,1f)
            else {
                val left=if(row.left.isEmpty())null else com.mendelev.mpos.documents.MPosDocumentCanvas.layout(row.left,if(row.kind==MPosReceiptLayout.Kind.PAIR)content*.55f else content,row.size,row.weight,align=if(row.centered)android.text.Layout.Alignment.ALIGN_CENTER else android.text.Layout.Alignment.ALIGN_NORMAL)
                val right=if(row.kind==MPosReceiptLayout.Kind.PAIR)com.mendelev.mpos.documents.MPosDocumentCanvas.layout(row.right,content*.43f,row.size,row.weight,align=android.text.Layout.Alignment.ALIGN_OPPOSITE) else null
                Measured(row,left,right,maxOf(left?.height?:0,right?.height?:0).toFloat()+2)
            }
        }
        val height=ceil(model.top+model.bottom+measured.sumOf{(it.height+it.row.gap).toDouble()}).toInt().coerceAtLeast(1)
        require(height<=65535){"Чек слишком длинный для ESC/POS raster"}
        return Bitmap.createBitmap(model.width,height,Bitmap.Config.ARGB_8888).also{bitmap->
            val canvas=Canvas(bitmap);canvas.drawColor(Color.WHITE);var y=model.top
            val rule=Paint().apply{color=Color.BLACK;strokeWidth=1f;pathEffect=android.graphics.DashPathEffect(floatArrayOf(3f,3f),0f)}
            for(m in measured){
                if(m.row.kind==MPosReceiptLayout.Kind.SEPARATOR)canvas.drawLine(model.margin,y,model.width-model.margin,y,rule)
                else {val save=canvas.save();canvas.translate(model.margin,y);m.left?.draw(canvas);canvas.restoreToCount(save);m.right?.let{right->val r=canvas.save();canvas.translate(model.margin+content*.57f,y);right.draw(canvas);canvas.restoreToCount(r)}}
                y+=m.height+m.row.gap
            }
        }
    }
    internal fun raster(bitmap:Bitmap):ByteArray {
        val widthBytes=(bitmap.width+7)/8
        return ByteArrayOutputStream().apply {
            write(byteArrayOf(0x1d,0x76,0x30,0,(widthBytes and 255).toByte(),(widthBytes shr 8).toByte(),(bitmap.height and 255).toByte(),(bitmap.height shr 8).toByte()))
            for(y in 0 until bitmap.height)for(xb in 0 until widthBytes){var value=0;for(bit in 0..7){val x=xb*8+bit;if(x<bitmap.width){val pixel=bitmap.getPixel(x,y);val gray=(Color.red(pixel)*.299+Color.green(pixel)*.587+Color.blue(pixel)*.114);if(gray<180)value=value or (128 shr bit)}};write(value)}
        }.toByteArray()
    }
}

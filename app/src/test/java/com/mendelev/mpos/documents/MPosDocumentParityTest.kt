package com.mendelev.mpos.documents

import android.graphics.Bitmap
import android.graphics.Canvas
import com.mendelev.mpos.print.EscPosRaster
import com.mendelev.mpos.print.MPosReceiptLayout
import com.mendelev.mpos.telegram.MPosShiftReceipt
import com.mendelev.mpos.telegram.MPosShiftReceiptImage
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MPosDocumentParityTest {
    private val directory = File("build/visual-parity").apply{mkdirs()}
    private fun order()=JSONObject("""{"timestamp":1791450000000,"receiptDisplayNumber":"#00124","employeeName":"Александр","orderType":"На месте","method":"cash","total":18,"cashGiven":20,"change":2,"productDiscountTotal":2,"subtotalBeforeDiscounts":20,"items":[{"name":"Капучино","qty":2,"price":10,"discountType":"percent","discountValue":10,"discountName":"Скидка 10%","comment":"Без сахара"}],"__printerConfig":{"paperWidth":80,"paymentReceiptTitle":"ПРИЛАВОК","registerLabel":"POS 1","receiptRandomPhrases":["Спасибо за покупку!"]}}""")
    private fun shift()=JSONObject("""{"id":"001","establishmentName":"ПРИЛАВОК","employeeName":"Александр","employeePhone":"+375000000000","openedAt":1791450000000,"closedAt":1791453600000,"orders":[{},{}],"count":2,"total":50,"cash":30,"card":20,"openingCash":100,"deposits":10,"withdrawals":5,"expectedCash":135,"countedCash":135,"difference":0,"currency":"Br","cashMovements":[{"type":"deposit","timestamp":1791451800000,"amount":10,"note":"Размен"}]}""")
    @Test fun receiptPreservesSourceContentAndOptions(){
        val original=order();val snapshot=original.toString()
        val model=MPosReceiptLayout.build(original,date={"08.10.26, 15:00"})
        assertEquals(576,model.width);assertEquals(24f,model.margin)
        assertTrue(model.rows.any{it.left=="Капучино"&&it.right=="18.00 BYN"&&it.weight==600})
        assertTrue(model.rows.any{it.left=="Внесено"&&it.right=="20.00 BYN"})
        assertTrue(model.rows.any{it.left=="Сдача"&&it.right=="2.00 BYN"})
        assertTrue(model.rows.any{it.left=="08.10.26, 15:00"&&it.right=="#00124"})
        assertEquals(snapshot,original.toString())
        original.getJSONObject("__printerConfig").put("printPaymentComments",false).put("paperWidth",58)
        val narrow=MPosReceiptLayout.build(original)
        assertEquals(384,narrow.width);assertEquals(14f,narrow.margin)
        assertFalse(narrow.rows.any{it.left.startsWith("Комментарий:")})
        original.put("__printDocumentType","kitchen")
        val kitchen=MPosReceiptLayout.build(original)
        assertTrue(kitchen.rows.any{it.left=="2 × Капучино"&&it.weight==700})
        assertTrue(kitchen.rows.any{it.left=="↳ Без сахара"})
        assertFalse(kitchen.rows.any{it.right.contains("BYN")})
    }
    @Test fun modifiersPrintUnderTheirItemWithoutChangingPriceOrSnapshot(){
        val data=order()
        data.getJSONArray("items").getJSONObject(0).put("selectedModifiers",JSONArray("""[{"name":"Овсяное молоко","qty":1,"priceDelta":2},{"name":"Сироп","qty":2,"priceDelta":0},{"name":"Без добавки","qty":1,"priceDelta":-1}]"""))
        data.getJSONObject("__printerConfig").put("printPaymentComments",false)
        val snapshot=data.toString()
        for(width in listOf(58,80)){
            data.getJSONObject("__printerConfig").put("paperWidth",width)
            val payment=MPosReceiptLayout.build(data).rows
            val product=payment.indexOfFirst{it.left=="Капучино"}
            val modifier=payment.indexOfFirst{it.left=="↳ Овсяное молоко (+2.00 BYN)"}
            assertTrue(modifier>product)
            assertTrue(payment.any{it.left=="↳ 2 × Сироп"})
            assertTrue(payment.any{it.left=="↳ Без добавки (-1.00 BYN)"})
            assertEquals("18.00 BYN",payment[product].right)
            data.put("__printDocumentType","kitchen")
            val kitchen=MPosReceiptLayout.build(data).rows
            assertTrue(kitchen.any{it.left=="↳ Овсяное молоко"})
            assertTrue(kitchen.any{it.left=="↳ 2 × Сироп"})
            assertFalse(kitchen.any{it.left.contains("BYN")||it.right.contains("BYN")})
            save(EscPosRaster.render(data),"kitchen-modifiers-$width.png")
            data.remove("__printDocumentType")
            save(EscPosRaster.render(data),"receipt-modifiers-$width.png")
        }
        data.getJSONObject("__printerConfig").put("paperWidth",80)
        assertEquals(snapshot,data.toString())
    }
    @Test fun splitPaymentsAndShiftTotalsKeepTheirOriginalOrder(){
        val data=order().put("payments",JSONArray("""[{"method":"cash","amount":8,"cashGiven":10,"change":2},{"method":"card","amount":10}]"""))
        val rows=MPosReceiptLayout.build(data).rows
        val first=rows.indexOfFirst{it.left=="Платёж 1 · Наличные"&&it.right=="8.00 BYN"}
        val second=rows.indexOfFirst{it.left=="Платёж 2 · Карта"&&it.right=="10.00 BYN"}
        assertTrue(first>=0&&second>first)
        assertTrue(rows.subList(first,second).any{it.left=="  Сдача"&&it.right=="2.00 BYN"})
        val shiftRows=MPosReceiptLayout.build(shift().put("__printDocumentType","shift-close")).rows
        assertTrue(shiftRows.any{it.left=="Расхождение"&&it.right=="0.00 BYN"&&it.weight==700})
        assertTrue(shiftRows.any{it.left=="Ожидается в кассе"&&it.right=="135.00 BYN"})
        assertTrue(shiftRows.last().left=="Смена закрыта")
    }
    @Test fun producesPreviewArtifactsAndCorrectRasterEnvelope(){
        for(width in listOf(58,80))for(kind in listOf("receipt","kitchen","shift-close")){
            val data=if(kind=="shift-close")shift()else order()
            data.put("__printDocumentType",kind).put("__printerConfig",order().getJSONObject("__printerConfig").put("paperWidth",width))
            val bitmap=EscPosRaster.render(data);save(bitmap,"$kind-$width.png")
            assertEquals(if(width==58)384 else 576,bitmap.width)
            val encoded=EscPosRaster.raster(bitmap)
            assertArrayEquals(byteArrayOf(0x1d,0x76,0x30,0),encoded.take(4).toByteArray())
            val byteWidth=(encoded[4].toInt()and 255)+((encoded[5].toInt()and 255)shl 8)
            val height=(encoded[6].toInt()and 255)+((encoded[7].toInt()and 255)shl 8)
            assertEquals(bitmap.width/8,byteWidth);assertEquals(bitmap.height,height);assertEquals(8+byteWidth*height,encoded.size);bitmap.recycle()
        }
        val report=shift();assertEquals(MPosShiftReceipt.rows(report).size,MPosShiftReceipt.tops(report).size)
        assertEquals(390f,MPosShiftReceipt.tops(report)[12]);assertEquals("ПРИЛАВОК",MPosShiftReceipt.rows(JSONObject()).first().label)
        File(directory,"telegram-shift.png").writeBytes(MPosShiftReceiptImage.render(report))
        val warehouse=JSONObject("""{"company":"ПРИЛАВОК","title":"Остатки","period":"08.10.2026","generatedAt":"08.10.2026 15:00","sections":[{"title":"Товары","headers":["Товар","Остаток"],"excelRows":[["Капучино",42.5]],"rows":[["Капучино","42,5 шт."]]}],"notes":["Остатки после продаж и списаний"]}""")
        val warehousePages=PreviewPages(842,595,"warehouse");MPosWarehousePdf.write(warehouse,File(directory,"warehouse.pdf"),warehousePages);assertEquals(2,warehousePages.number)
        val shiftPages=PreviewPages(595,842,"shift");MPosShiftPdf.write(report,File(directory,"shift.pdf"),shiftPages);assertEquals(1,shiftPages.number)
        val purchase=JSONObject("""{"supplierName":"Поставщик","timestamp":1791450000000,"company":{"legalName":"ООО Пример","deliveryAddress":"Минск, улица Примерная, 1"},"items":[{"productName":"Кофе в зёрнах","quantityText":"2 кг"}]}""")
        val purchasePages=PreviewPages(595,842,"purchase");MPosPurchasePdf.write(purchase,File(directory,"purchase.pdf"),purchasePages);assertEquals(1,purchasePages.number)
        val files=MPosWarehouseWorkbook.files(warehouse)
        val factory=DocumentBuilderFactory.newInstance().apply{isNamespaceAware=true}
        files.values.forEach{factory.newDocumentBuilder().parse(it.byteInputStream())}
        assertTrue(files.getValue("xl/workbook.xml").contains("Пояснения"));assertTrue(files.getValue("xl/worksheets/sheet1.xml").contains("<v>42.5</v>"));assertTrue(files.getValue("xl/worksheets/sheet1.xml").contains("state=\"frozen\""))
        MPosWarehouseWorkbook.write(warehouse,File(directory,"warehouse.xlsx"))
    }
    @Test fun longWarehouseRowsAndNotesArePaginatedWithoutDroppingDocuments(){
        val rows=JSONArray().apply{repeat(85){put(JSONArray().put("Длинное название товара ".repeat(20)).put(it))}}
        val report=JSONObject().put("company","ПРИЛАВОК").put("sections",JSONArray().put(JSONObject().put("title","Товары").put("headers",JSONArray(listOf("Товар","Остаток"))).put("rows",rows))).put("notes",JSONArray(listOf("Пояснение ".repeat(350))))
        val pages=PreviewPages(842,595,"warehouse-long");MPosWarehousePdf.write(report,File(directory,"warehouse-long.pdf"),pages);assertTrue(pages.number>2)
    }
    private fun save(bitmap:Bitmap,name:String){File(directory,name).outputStream().use{assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))}}
    /** Same layout/Canvas calls as PdfDocument; Robolectric 4.14 has no PDF native bridge. */
    private inner class PreviewPages(private val width:Int,private val height:Int,private val name:String):MPosDocumentPages {
        override var number=0;private set
        private var bitmap:Bitmap?=null
        override val canvas:Canvas get()=Canvas(bitmap!!).apply{scale(2f,2f)}
        private fun finish(){bitmap?.let{assertEquals(width*2,it.width);assertEquals(height*2,it.height);save(it,"$name-page-$number.png");it.recycle()};bitmap=null}
        override fun next(){finish();number++;bitmap=Bitmap.createBitmap(width*2,height*2,Bitmap.Config.ARGB_8888).apply{eraseColor(android.graphics.Color.WHITE)}}
        override fun save(file:File){finish()}
        override fun close(){finish()}
    }
}

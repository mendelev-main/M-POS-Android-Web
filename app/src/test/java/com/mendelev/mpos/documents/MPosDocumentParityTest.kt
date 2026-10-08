package com.mendelev.mpos.documents

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
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
        val pdf=File(directory,"warehouse.pdf");MPosWarehousePdf.write(warehouse,pdf);preview(pdf,842,595)
        val shiftPdf=File(directory,"shift.pdf");MPosShiftPdf.write(report,shiftPdf);preview(shiftPdf,595,842)
        val purchase=JSONObject("""{"supplierName":"Поставщик","timestamp":1791450000000,"company":{"legalName":"ООО Пример","deliveryAddress":"Минск, улица Примерная, 1"},"items":[{"productName":"Кофе в зёрнах","quantityText":"2 кг"}]}""")
        val purchasePdf=File(directory,"purchase.pdf");MPosPurchasePdf.write(purchase,purchasePdf);preview(purchasePdf,595,842)
        val files=MPosWarehouseWorkbook.files(warehouse)
        val factory=DocumentBuilderFactory.newInstance().apply{isNamespaceAware=true}
        files.values.forEach{factory.newDocumentBuilder().parse(it.byteInputStream())}
        assertTrue(files.getValue("xl/workbook.xml").contains("Пояснения"));assertTrue(files.getValue("xl/worksheets/sheet1.xml").contains("<v>42.5</v>"));assertTrue(files.getValue("xl/worksheets/sheet1.xml").contains("state=\"frozen\""))
        MPosWarehouseWorkbook.write(warehouse,File(directory,"warehouse.xlsx"))
    }
    @Test fun longWarehouseRowsAndNotesArePaginatedWithoutDroppingDocuments(){
        val rows=JSONArray().apply{repeat(85){put(JSONArray().put("Длинное название товара ".repeat(20)).put(it))}}
        val report=JSONObject().put("company","ПРИЛАВОК").put("sections",JSONArray().put(JSONObject().put("title","Товары").put("headers",JSONArray(listOf("Товар","Остаток"))).put("rows",rows))).put("notes",JSONArray(listOf("Пояснение ".repeat(350))))
        val file=File(directory,"warehouse-long.pdf");MPosWarehousePdf.write(report,file)
        ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY).use{descriptor->PdfRenderer(descriptor).use{assertTrue(it.pageCount>2)}}
    }
    private fun save(bitmap:Bitmap,name:String){File(directory,name).outputStream().use{assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))}}
    private fun preview(file:File,width:Int,height:Int){
        ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY).use{descriptor->PdfRenderer(descriptor).use{renderer->
            assertTrue(renderer.pageCount>0);renderer.openPage(0).use{page->assertEquals(width,page.width);assertEquals(height,page.height);val bitmap=Bitmap.createBitmap(width*2,height*2,Bitmap.Config.ARGB_8888);bitmap.eraseColor(android.graphics.Color.WHITE);page.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);save(bitmap,file.nameWithoutExtension+".png");bitmap.recycle()}
        }}
    }
}

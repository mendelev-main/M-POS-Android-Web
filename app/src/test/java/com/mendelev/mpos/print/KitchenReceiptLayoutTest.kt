package com.mendelev.mpos.print

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class KitchenReceiptLayoutTest {
    private fun order(width:Int=80)=JSONObject("""{"__printDocumentType":"kitchen","orderLabel":"  Стол 4 · Иван  ","receiptDisplayNumber":"#124","timestamp":1792497600000,"orderType":"На месте","items":[{"name":"Пицца","qty":2,"price":10,"comment":"Без лука","selectedModifiers":[{"name":"Сыр","qty":2,"priceDelta":1}]}],"__printerConfig":{"paperWidth":$width}}""")

    @Test fun kitchenTitleUsesReceiptNameInsteadOfNumberWithoutMutatingOrder() {
        val data=order();val before=data.toString()
        val rows=MPosReceiptLayout.build(data,date={"20.10.26 15:00"}).rows
        assertEquals("Стол 4 · Иван",rows.first().left)
        assertTrue(rows.first().centered)
        assertTrue(rows.none{it.left=="#124"})
        assertEquals(before,data.toString())
    }

    @Test fun unnamedKitchenOrderUsesNumberAndThenGenericTitle() {
        for(label in listOf("", "   ")) {
            val data=order().put("orderLabel",label)
            assertEquals("#124",MPosReceiptLayout.build(data).rows.first().left)
            data.remove("receiptDisplayNumber")
            assertEquals("Заказ",MPosReceiptLayout.build(data).rows.first().left)
        }
        val missing=order().apply{remove("orderLabel")}
        assertEquals("#124",MPosReceiptLayout.build(missing).rows.first().left)
    }

    @Test fun kitchenTextIsLargerForBothPaperWidthsAndKeepsModifiersAndComments() {
        for(width in listOf(58,80)) {
            val doc=MPosReceiptLayout.build(order(width),date={"Дата"})
            assertEquals(if(width==58)384 else 576,doc.width)
            assertTrue(doc.rows.first().size>33f)
            assertTrue(doc.rows.single{it.left=="Дата"}.size>20f)
            assertTrue(doc.rows.single{it.left=="На месте"}.size>24f)
            assertTrue(doc.rows.single{it.left=="2 × Пицца"}.size>32f)
            assertTrue(doc.rows.single{it.left=="↳ 2 × Сыр"}.size>23f)
            assertTrue(doc.rows.single{it.left=="↳ Без лука"}.size>23f)
            assertTrue(doc.rows.none{it.left.contains("BYN")||it.right.contains("BYN")})
        }
    }

    @Test fun paymentReceiptRetainsItsTitleAndOriginalFontSizes() {
        val data=order().put("__printDocumentType","receipt")
        val rows=MPosReceiptLayout.build(data).rows
        assertEquals("ПРИЛАВОК",rows.first().left)
        assertEquals(33f,rows.first().size)
        assertEquals(20f,rows.single{it.left=="↳ 2 × Сыр (+1.00 BYN)"}.size)
        assertTrue(rows.any{it.right=="#124"})
    }
}

package com.mendelev.mpos.print

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class LoyaltyReceiptLayoutTest {
    private fun order()=JSONObject("""{"customer":{"id":"customer"},"loyaltySync":{"status":"synced"},"loyaltyReceiptProgress":[{"name":"Пицца","goal":6,"filled":4}],"items":[],"total":10}""")
    @Test fun paidReceiptShowsOnlyNameAndDotsOnBothPaperWidths() {
        for(width in listOf(58,80)) {
            val data=order().put("__printerConfig",JSONObject().put("paperWidth",width))
            val rows=MPosReceiptLayout.build(data).rows
            assertTrue(rows.any{it.left=="Акция · Пицца"})
            assertTrue(rows.any{it.left=="● ● ● ● ○ ○"})
            assertFalse(rows.any{it.left.startsWith("Прогресс:")||it.left.startsWith("До подарка")})
        }
    }
    @Test fun noProgressOnKitchenBillGuestPendingOrRefund() {
        for(kind in listOf("kitchen","bill","shift-close"))assertFalse(MPosReceiptLayout.build(order().put("__printDocumentType",kind)).rows.any{it.left.contains("●")})
        for(data in listOf(order().put("customer",JSONObject()),order().put("loyaltySync",JSONObject().put("status","pending")),order().put("returnedAt",123)))assertFalse(MPosReceiptLayout.build(data).rows.any{it.left.contains("●")})
    }
    @Test fun longProgressWrapsIntoRowsAndInvalidGoalsAreIgnored() {
        val data=order();data.getJSONArray("loyaltyReceiptProgress").getJSONObject(0).put("goal",14).put("filled",13)
        val rows=MPosReceiptLayout.build(data).rows
        assertTrue(rows.any{it.left==List(12){"●"}.joinToString(" ")})
        assertTrue(rows.any{it.left=="● ○"})
        data.getJSONArray("loyaltyReceiptProgress").getJSONObject(0).put("goal",0)
        assertFalse(MPosReceiptLayout.build(data).rows.any{it.left.startsWith("Акция")})
    }
}

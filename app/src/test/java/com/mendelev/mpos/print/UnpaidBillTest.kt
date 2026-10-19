package com.mendelev.mpos.print

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class UnpaidBillTest {
    @Test fun unpaidBillShowsTotalWithoutClaimingPayment() {
        val document=MPosReceiptLayout.build(JSONObject("""{"__printDocumentType":"bill","total":10,"items":[{"name":"Товар","qty":2,"price":5}]}"""))
        assertTrue(document.rows.any{it.left=="СЧЁТ · НЕ ОПЛАЧЕН"})
        assertTrue(document.rows.any{it.left=="Итого"&&it.right=="10.00 BYN"})
        assertFalse(document.rows.any{it.left in listOf("Карта","Наличные","Внесено","Сдача")})
    }
    @Test fun paidReceiptStillShowsPayment() {
        val document=MPosReceiptLayout.build(JSONObject("""{"total":10,"method":"cash","items":[]}"""))
        assertTrue(document.rows.any{it.left=="Наличные"})
        assertFalse(document.rows.any{it.left=="СЧЁТ · НЕ ОПЛАЧЕН"})
    }
}

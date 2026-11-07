package com.mendelev.mpos.administration

import android.webkit.JavascriptInterface
import java.security.MessageDigest

/** Only a digest is packaged; successful passwords remain runtime-only. */
class AdministrationPasswordVerifier(private val expected: String = "6e432d8eb4c5f4f3ccc87e6ed491de6bb330a304671f9d174429903e6f5d6b20") {
    fun matches(value: String): Boolean {
        if(value.length !in 1..256)return false
        val actual=MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        val wanted=expected.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        return MessageDigest.isEqual(actual,wanted)
    }
}
class AdministrationPasswordBridge(private val verifier: AdministrationPasswordVerifier,private val token:String) {
    @JavascriptInterface fun verify(credential:String,value:String):Boolean {
        if(!MessageDigest.isEqual(token.toByteArray(Charsets.UTF_8),credential.toByteArray(Charsets.UTF_8)))return false
        return verifier.matches(value)
    }
}

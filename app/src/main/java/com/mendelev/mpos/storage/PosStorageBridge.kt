package com.mendelev.mpos.storage

import android.database.sqlite.SQLiteFullException
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/** One authenticated command; no file paths, SQL or business operations cross this boundary. */
class PosStorageBridge(private val store: PosKeyValueStore, private val token: String) {
    @JavascriptInterface
    @Synchronized fun call(credential: String, raw: String): String {
        if (!MessageDigest.isEqual(token.toByteArray(Charsets.UTF_8), credential.toByteArray(Charsets.UTF_8)))
            return JSONObject().put("ok", false).put("name", "SecurityError").toString()
        return try {
            val request=JSONObject(raw)
            val response=JSONObject().put("ok",true)
            when (request.getString("action")) {
                "status" -> { val keys=store.status();response.put("ready",keys!=null);response.put("keys",JSONArray(keys ?: emptyList<String>())) }
                "initialize" -> {
                    val entries=request.getJSONObject("entries")
                    val legacy=buildMap<String,String> { entries.keys().forEach { key -> put(key, entries.getString(key)) } }
                    response.put("keys",JSONArray(store.initialize(legacy)))
                }
                "get" -> response.put("value",store.get(request.getString("key")) ?: JSONObject.NULL)
                "set" -> store.set(request.getString("key"),request.getString("value"))
                "remove" -> store.remove(request.getString("key"))
                else -> error("Unknown storage operation")
            }
            response.toString()
        } catch (error: Exception) {
            JSONObject().put("ok",false).put("name",if(error is SQLiteFullException) "QuotaExceededError" else "InvalidStateError").toString()
        }
    }
}

package com.mendelev.mpos.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/** Persistence only. JSON and transaction recovery remain owned by the POS JavaScript. */
class PosKeyValueStore(context: Context) : SQLiteOpenHelper(context, "pos-storage.db", null, 1,
    android.database.DatabaseErrorHandler { throw android.database.sqlite.SQLiteDatabaseCorruptException("POS database unreadable; original file preserved") }
) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE chunks (name TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(name,part))")
        db.execSQL("CREATE TABLE metadata (name TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        error("Unsupported storage schema")
    }
    private fun valid(key: String) { require((key.startsWith("prilavok_") || key=="printers" || key=="posNotificationSettings") && key.length in 1..512 && !key.contains('\u0000')) }
    private fun initialized(db: SQLiteDatabase): Boolean = db.rawQuery("SELECT value FROM metadata WHERE name='imported'", null).use { it.moveToFirst() && it.getString(0) == "1" }
    private fun read(db: SQLiteDatabase, key: String): String? {
        var found = false
        val value = StringBuilder()
        db.rawQuery("SELECT value FROM chunks WHERE name=? ORDER BY part", arrayOf(key)).use { cursor ->
            while (cursor.moveToNext()) { found = true; value.append(cursor.getString(0)) }
        }
        return if (found) value.toString() else null
    }
    private fun write(db: SQLiteDatabase, key: String, value: String) {
        db.delete("chunks", "name=?", arrayOf(key))
        var start = 0
        var part = 0
        do {
            var end = minOf(start + 65536, value.length)
            if (end < value.length && end > start && Character.isHighSurrogate(value[end - 1])) end--
            val row = ContentValues().apply { put("name", key); put("part", part++); put("value", value.substring(start, end)) }
            check(db.insertOrThrow("chunks", null, row) != -1L)
            start = end
        } while (start < value.length)
    }
    private fun keys(db: SQLiteDatabase): List<String> = db.rawQuery("SELECT DISTINCT name FROM chunks ORDER BY name", null).use { cursor ->
        buildList { while (cursor.moveToNext()) add(cursor.getString(0)) }
    }
    @Synchronized fun status(): List<String>? { val db=readableDatabase;return if(initialized(db)) keys(db) else null }
    @Synchronized fun initialize(legacy: Map<String, String>): List<String> {
        val db = writableDatabase
        if (!initialized(db)) {
            legacy.keys.forEach(::valid)
            db.beginTransaction()
            try {
                check(!db.rawQuery("SELECT 1 FROM chunks LIMIT 1", null).use { it.moveToFirst() })
                legacy.forEach { (key, value) -> write(db, key, value) }
                legacy.forEach { (key, value) -> check(read(db, key) == value) { "Storage migration verification failed" } }
                db.execSQL("INSERT INTO metadata(name,value) VALUES('imported','1')")
                db.setTransactionSuccessful()
            } finally { db.endTransaction() }
        }
        return keys(db)
    }
    @Synchronized fun get(key: String): String? { valid(key); val db=readableDatabase;check(initialized(db));return read(db,key) }
    @Synchronized fun set(key: String, value: String) {
        valid(key);val db=writableDatabase;check(initialized(db));db.beginTransaction()
        try { write(db,key,value);db.setTransactionSuccessful() } finally { db.endTransaction() }
    }
    @Synchronized fun remove(key: String) {
        valid(key);val db=writableDatabase;check(initialized(db));db.beginTransaction()
        try { db.delete("chunks","name=?",arrayOf(key));db.setTransactionSuccessful() } finally { db.endTransaction() }
    }
}

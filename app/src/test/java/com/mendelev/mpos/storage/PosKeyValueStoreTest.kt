package com.mendelev.mpos.storage

import androidx.test.core.app.ApplicationProvider
import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28])
class PosKeyValueStoreTest {
    private fun context(): Context = ApplicationProvider.getApplicationContext<Context>().also { it.deleteDatabase("pos-storage.db") }
    @Test fun importsLargeHistoryAndJournalWithoutCursorWindowLimit() {
        val context=context()
        val orders="[\""+"Тестовый чек 🧾 ".repeat(220000)+"\"]"
        val journal=JSONObject().put("version",1).put("writes",orders).toString()
        PosKeyValueStore(context).use { store ->
            assertNull(store.status())
            store.initialize(mapOf("prilavok_orders" to orders,"prilavok_criticalStorageJournal" to journal))
            assertEquals(orders,store.get("prilavok_orders"));assertEquals(journal,store.get("prilavok_criticalStorageJournal"))
            store.set("prilavok_orders",orders+" ")
        }
        PosKeyValueStore(context).use { store ->
            store.initialize(mapOf("prilavok_orders" to "stale legacy must not overwrite"))
            assertEquals(orders+" ",store.get("prilavok_orders"));assertEquals(journal,store.get("prilavok_criticalStorageJournal"))
            store.remove("prilavok_criticalStorageJournal");assertNull(store.get("prilavok_criticalStorageJournal"))
        }
    }
    @Test fun unicodeAndEmptyStringsRoundTripAcrossChunkBoundaries() {
        PosKeyValueStore(context()).use { store ->
            val value="x".repeat(65535)+"🧾"+"ё".repeat(80000)
            store.initialize(mapOf("prilavok_orders" to value,"prilavok_empty" to ""))
            assertEquals(value,store.get("prilavok_orders"));assertEquals("",store.get("prilavok_empty"))
        }
    }
    @Test fun interruptedReplacementRollsBackAllChunks() {
        PosKeyValueStore(context()).use { store ->
            store.initialize(mapOf("prilavok_orders" to "original"))
            store.writableDatabase.execSQL("CREATE TRIGGER injected_abort BEFORE INSERT ON chunks WHEN NEW.name='prilavok_orders' AND NEW.part=1 BEGIN SELECT RAISE(ABORT,'injected failure'); END")
            assertThrows(Exception::class.java) { store.set("prilavok_orders","x".repeat(150000)) }
            assertEquals("original",store.get("prilavok_orders"))
        }
    }
    @Test fun interruptedMigrationIsRetriableWithoutCommittedMarkerOrPartialRows() {
        PosKeyValueStore(context()).use { store ->
            store.writableDatabase.execSQL("CREATE TRIGGER injected_abort BEFORE INSERT ON chunks WHEN NEW.name='prilavok_orders' BEGIN SELECT RAISE(ABORT,'injected failure'); END")
            val legacy=linkedMapOf("prilavok_products" to "products","prilavok_orders" to "orders")
            assertThrows(Exception::class.java) { store.initialize(legacy) };assertNull(store.status())
            store.writableDatabase.rawQuery("SELECT count(*) FROM chunks",null).use { assertTrue(it.moveToFirst());assertEquals(0,it.getInt(0)) }
            store.writableDatabase.execSQL("DROP TRIGGER injected_abort")
            store.initialize(legacy);assertEquals("products",store.get("prilavok_products"));assertEquals("orders",store.get("prilavok_orders"))
        }
    }
    @Test fun bridgeRejectsUnauthenticatedOrOutOfNamespaceRequests() {
        PosKeyValueStore(context()).use { store ->
            val bridge=PosStorageBridge(store,"test-ephemeral-token")
            assertFalse(JSONObject(bridge.call("wrong","{\"action\":\"initialize\",\"entries\":{}}")).getBoolean("ok"));assertNull(store.status())
            assertTrue(JSONObject(bridge.call("test-ephemeral-token","{\"action\":\"initialize\",\"entries\":{\"prilavok_orders\":\"[]\"}}")).getBoolean("ok"))
            assertFalse(JSONObject(bridge.call("test-ephemeral-token","{\"action\":\"set\",\"key\":\"../orders\",\"value\":\"bad\"}")).getBoolean("ok"))
            assertEquals("[]",store.get("prilavok_orders"))
        }
    }
}

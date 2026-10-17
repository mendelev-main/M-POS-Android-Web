package com.mendelev.mpos.print

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.InetAddress
import java.net.ServerSocket
import java.net.SocketTimeoutException
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class CashDrawerTransportTest {
    private fun payload(port: Int, id: String, command: String = CashDrawerCommand.DEFAULT) = JSONObject()
        .put("action", "openDrawer")
        .put("order", JSONObject().put("__networkPrinterIp", "127.0.0.1").put("__networkPrinterPort", port)
            .put("__drawerRequestId", id).put("__drawerReason", "sale")
            .put("__printerConfig", JSONObject().put("drawerCommand", command)))

    @Test fun socketReceivesExactlyOnePulseForDuplicateEvent() {
        ServerSocket(0, 4, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 3000
            val events = Collections.synchronizedList(mutableListOf<JSONObject>())
            val sent = CountDownLatch(1)
            val printer = EscPosPrinter { events.add(it); sent.countDown() }
            try {
                val request = payload(server.localPort, "sale:receipt-1")
                printer.openDrawer(request); printer.openDrawer(request)
                val bytes = server.accept().use { socket -> socket.soTimeout = 3000; socket.getInputStream().readBytes() }
                assertArrayEquals(CashDrawerCommand.encode(CashDrawerCommand.DEFAULT), bytes)
                assertTrue(sent.await(3, TimeUnit.SECONDS))
                assertEquals("drawerSent", events.single().optString("type"))
                server.soTimeout = 250
                assertThrows(SocketTimeoutException::class.java) { server.accept().close() }
            } finally { printer.close() }
        }
    }

    @Test fun invalidCommandIsRejectedBeforeAnySocketConnection() {
        ServerSocket(0, 4, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 250
            val events = mutableListOf<JSONObject>()
            val printer = EscPosPrinter { events.add(it) }
            try {
                printer.openDrawer(payload(server.localPort, "sale:bad", "1D,56,42,00"))
                assertEquals("drawer_error", events.single().optString("status"))
                assertThrows(SocketTimeoutException::class.java) { server.accept().close() }
            } finally { printer.close() }
        }
    }
}

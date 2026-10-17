package com.mendelev.mpos.print

import org.junit.Assert.*
import org.junit.Test

class CashDrawerCommandTest {
    @Test fun encodesExactPulseWithoutPrintingOrCutting() {
        assertArrayEquals(byteArrayOf(0x1b, 0x70, 0, 0x19, 0xfa.toByte()), CashDrawerCommand.encode(CashDrawerCommand.DEFAULT))
        assertArrayEquals(byteArrayOf(0x1b, 0x70, 1, 0x19, 0xfa.toByte()), CashDrawerCommand.encode("1b 70 01 19 fa"))
    }

    @Test fun rejectsOtherCommandsInvalidPinsAndUnsafePulse() {
        for (command in listOf("", "1B,40", "1D,56,42,00", "1B,70,02,19,FA", "1B,70,00,00,FA", "1B,70,00,FA,19", "1B,70,00,19,FA,1B,40", "1B,70,00,19,1FF")) {
            assertThrows(IllegalArgumentException::class.java) { CashDrawerCommand.encode(command) }
        }
    }

    @Test fun duplicateAndAmbiguousRetryKeepOneDispatchButManualRequestCanDiffer() {
        val gate = DrawerRequestGate()
        assertTrue(gate.accept("sale:receipt-1"))
        assertFalse(gate.accept("sale:receipt-1"))
        assertTrue(gate.accept("manual:request-2"))
        assertThrows(IllegalArgumentException::class.java) { gate.accept("") }
        assertThrows(IllegalArgumentException::class.java) { gate.accept("bad request") }
    }

    @Test fun boundedGateRetainsMostRecentEvents() {
        val gate = DrawerRequestGate(2)
        assertTrue(gate.accept("a")); assertTrue(gate.accept("b")); assertTrue(gate.accept("c"))
        assertFalse(gate.accept("b")); assertFalse(gate.accept("c")); assertTrue(gate.accept("a"))
    }
}

package com.mendelev.mpos.print

/** Hardware-only ESC/POS pulse encoding. Payment decisions remain in shared POS. */
internal object CashDrawerCommand {
    const val DEFAULT = "1B,70,00,19,FA"

    fun encode(command: String): ByteArray {
        val tokens = command.trim().split(Regex("[,\\s]+"))
        require(tokens.size == 5 && tokens.all { it.matches(Regex("[0-9a-fA-F]{2}")) }) { "Некорректная команда кассового ящика" }
        val bytes = tokens.map { it.toInt(16) }
        require(bytes[0] == 0x1b && bytes[1] == 0x70 && bytes[2] in listOf(0, 1, 48, 49)) { "Разрешена только команда открытия ящика ESC p" }
        require(bytes[3] > 0 && bytes[4] >= bytes[3]) { "Некорректная длительность импульса кассового ящика" }
        return bytes.map(Int::toByte).toByteArray()
    }
}

/** At-most-once dispatch within this activity; ambiguous network failures are not retried. */
internal class DrawerRequestGate(private val capacity: Int = 256) {
    private val requests = LinkedHashSet<String>()

    @Synchronized fun accept(id: String): Boolean {
        require(id.matches(Regex("[A-Za-z0-9_:.-]{1,160}"))) { "Некорректный идентификатор открытия ящика" }
        if (!requests.add(id)) return false
        if (requests.size > capacity) requests.remove(requests.first())
        return true
    }
}

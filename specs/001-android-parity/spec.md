# 001 — Android Web port

Сохранить весь reviewed iPad HTML/CSS/JS и бизнес-логику. Android заменяет только Swift platform boundaries: LAN socket, Telegram delivery, фото/files/report sharing и HTTPS/SSE. Offline localStorage и JSON/backup contracts остаются исходными. Не включать native migration owners.

Package com.mendelev.mpos.web позволяет сосуществовать с нативным треком. Новый независимый стабильный ключ Android Web; новая независимая последовательность versionCode. CI gates source parity/tests/lint before APK. Физическое принятие обязательно перед эксплуатацией; локальные tests/build не запускать без запроса пользователя.

Источник и текущий статус: ../../docs/ANDROID_WEB_PORT_RU.md.

Диагностика сетевых интеграций должна давать видимый результат/тайм-аут; проверка заказов не создаёт фиктивную продажу. Operational demand считается отправленным только после applied acknowledgement backend; revision/outbox сохраняются до HTTP, stale-200 не удаляет очередь, активное приложение повторяет отправку с bounded backoff. Telegram test использует saved config вне окна настройки и correlated native callback. Реализация и приёмка: ../../docs/INTEGRATIONS_ANDROID_RU.md.

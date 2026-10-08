# M POS Android Web

Рабочая ветка Android с исходным интерфейсом и бизнес-логикой [iPad POS](https://github.com/mendelev-main/prilavok-pos-ipad). Нативная миграция продолжается отдельно в [M-POS-Android](https://github.com/mendelev-main/M-POS-Android).

- Android 9+; локальный WebView с оригинальными HTML/CSS/JavaScript и Manrope.
- Каталог, корзина, оплата, остатки, склад, смены, лояльность и заказы сохраняют исходные обработчики и локальные ключи.
- Kotlin обслуживает LAN-принтер TCP/9100, HTTPS/SSE, Telegram, фото, резервные копии, PDF/XLSX и системный обмен файлами.
- Package `com.mendelev.mpos.web`: можно установить рядом с нативным приложением. Для переноса данных экспортируйте резервную копию и импортируйте её в новое приложение; настройки сети и печати проверьте отдельно.

## APK и обновления

Actions сначала выполняет тесты/проверку неизменности исходника и lint в отдельной job, затем выпускает подписанный release APK. Версия увеличивается по номеру запуска и попытке. Постоянный сертификат проверяется перед публикацией; временные ключи в CI не создаются.

В Settings → Secrets and variables → Actions настройте `MPOS_KEYSTORE_BASE64`, `MPOS_KEYSTORE_PASSWORD`, `MPOS_KEY_ALIAS`, `MPOS_KEY_PASSWORD` новым постоянным ключом Android Web из отдельной приватной папки. Без этих secrets signed-build завершится с понятной ошибкой и APK не будет опубликован. Ключи никогда не хранятся в Git. Ключ нативного проекта не менять.

## Источник и проверка

`web-source-manifest.json` содержит commit и SHA-256 всех 33 исходных файлов. `python3 scripts/sync-pos-assets.py /path/to/prilavok-pos-ipad` обновляет исходник; только вставки Android bridge/network/notification scripts разрешены в HTML. Перенесены JS-тесты iPad, кроме проверок Swift-принтера; Android bridge/transport проверяются отдельно.

Статус переноса и ожидаемые проверки: [docs/ANDROID_WEB_PORT_RU.md](docs/ANDROID_WEB_PORT_RU.md). Локальные tests/lint/APK не запускались по указанию пользователя. Готовность к эксплуатации подтверждается Actions и физическими проверками, а не одним наличием кода.

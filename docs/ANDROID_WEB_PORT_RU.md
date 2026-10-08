# Перенос iPad POS в Android Web — 08.10.2026

## Два независимых направления

M-POS-Android продолжает нативную миграцию. M-POS-Android-Web размещает оригинальный интерфейс WebView и оригинальную бизнес-логику без нативных cutover/Room authorities. Android shell взят из Android revision 8f4aac0 (до миграции); Telegram boundary обновлён для картинки закрытия смены и диагностики. iPad source: 67d039c3216a2f4422ca0616074653ccff586107.

## Реализовано

1. Перенесены все 33 web-файла: pos.html, storage, 27 feature-модулей, шрифт/лицензия, printer/notification adapters. SHA-256 фиксирует исходник. Интерфейс, порядок кнопок, динамические расчёты, storage keys и backup shapes не переписывались.
2. Android WebView работает с локальным HTTPS origin; file access и mixed content выключены. Bridge разрешён только главному фрейму приложения. Фото и резервные копии используют системные pickers; локальные фото и отчёты доступны через native boundary.
3. HTTPS fetch и SSE выполняются нативным транспортом. Исходные JS команды/триггеры и HTTP-коды сохранены. Abort отменяет запрос. Поток заказов поддерживает multiline data, event/id/retry, Last-Event-ID и переподключение; close/destroy отменяют соединение. Это транспорт, не новая бизнес-логика. TLS проверяется стандартно; redirects отключены, поэтому backend должен быть настроен на конечный HTTPS URL. Cookie-auth SSE не поддерживается: существующий backend использует deviceKey.
4. Печать LAN ESC/POS подключена через Android socket; Telegram тесты/сообщения/месячные PDF и изображение закрытия смены адаптированы. PDF/XLSX/закупки и системная печать отчётов используют Android реализации, их физический результат ещё требует сравнения.
5. Отдельный package com.mendelev.mpos.web, название M POS Web, новый независимый постоянный ключ подписи и возрастающая версия. Данные другого package не читаются автоматически; явный backup/import.
6. CI: отдельные tests/lint и signed APK jobs. Source parity и перенесённые iPad тесты; добавлены Android HTTPS/abort/SSE tests. Signing secrets необходимо установить в новом репозитории.

## Проверить перед эксплуатацией

- Actions: все JS suites, Kotlin compilation/lint, release signing/identity/version.
- Планшет: первый запуск offline, импорт backup, каталог и фотографии, корзина/остатки/скидки/оплата/возврат, склад/приёмка/закупки, открытие/закрытие смены, выход/перезапуск с сохранением данных.
- LAN-принтер: правильный IPv4/порт, пробная печать, чек, кухня, потеря Wi-Fi и ошибка без потери продажи. Bluetooth/USB принтеры не реализованы этим портом.
- Сайт: HTTPS endpoint и deviceKey, тест заказа, SSE входящий заказ, принятие/готовность, отсутствие сети и повторное подключение, ручной sync меню/фото, исходные availability triggers.
- Telegram: test/group/thread, shift PNG, monthly PDF; чувствительные настройки вводятся в приложении, не в Git.
- PDF/XLSX и backup на Android: экспорт/import/recovery и фото; сравнить содержимое с iPad.
- Обновление второго подписанного APK поверх первого, сохранность localStorage; соседняя нативная установка остаётся независимой.

Реализация переноса завершена в коде; CI, Actions secrets и физическое принятие pending. Это самостоятельный порт и не увеличивает 114/129 счётчик нативной миграции. Перенос всей web-логики не означает проверенного совпадения нативных форматов печати/отчётов или готовности конкретного оборудования.

## CI correction — 08.10.2026

Первый запуск 37822568602: 61 JS проверка прошла, один suite не загрузился из-за ссылок source-product-stock на Swift host/SceneDelegate. Android compilation/lint и signed APK были skipped; проверка secrets ещё не выполнялась. Две платформенные проверки адаптированы к Android Activity lifecycle и backup router/file pickers/image pruning; остальные исходные бизнес-проверки сохранены. Локальные tests/build не запускались, новый результат подтверждает Actions. Пользователь сообщил, что новые signing secrets добавлены.

Второй запуск 37823792263 выявил отсутствие queueMicrotask в synthetic VM suite, что вызывало общую ошибку загрузки feature-модулей. Fixture теперь изолирует автоматические startup microtasks, как уже изолирует loadAll; бизнес recovery вызывается тестами явно. Устаревшая проверка отсутствия foreground availability заменена проверкой текущего source behavior: только persisted availability snapshot, без menu sync. Runtime исходника не изменён; локальные tests/build не запускались.

## Комплексная проверка CI — 08.10.2026

Запуск 37824231552: 348/349 JS tests passed; единственный сбой — nondeterministic ожидание pending в уже отправляемой loyalty job. Тест теперь проверяет историю durable writes: pending до вызова API, sending перед сетевой отправкой, финансовые allocation поля исходной сохранённой продажи. Runtime не изменён.

Android compile/test/lint выполняется даже после JS failure, журналы JS и Android reports сохраняются в artifact. Независимая signing preflight job проверяет наличие secrets, base64/keystore/alias/password и SHA-256 нового Web сертификата, удаляет временный ключ и не печатает private values. APK остаётся gated на обе jobs; ошибочные проверки не обходятся. Статически сверены Gradle/SDK/dependencies, manifest/bridge callbacks, release identity/version/signature scripts. Локальные suites/lint/APK не запускались; итоговый полный запуск CI ещё должен подтвердить изменения.

Запуск 37824957537 подтвердил все 349/349 JS tests и новую signing preflight. Android compilation обнаружила отсутствующий MPosTelegramPhoto — multipart helper TelegramClient. Helper перенесён вместе с JVM тестами PNG bytes/group/topic, просмотрены остальные MPos ссылки платформенного кода. Compilation/lint/release ещё требуют повторного полного запуска; локальные tests не запускались.

## Полный CI подтверждён — 08.10.2026

Запуск https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/37825404083 для runtime commit e5d23c2cd78533eed3ee234b79333f9539f776d5 завершён успешно: 349/349 JS tests; Android compile, JVM multipart tests и lint; independent signing certificate/private-key preflight; release build; APK identity/version/certificate verification; upload artifact M-POS-Android-Web-1.0.5-1 (11570574903). Реальная установка и физические tablet/printer/backend/Telegram cases остаются pending. Все эти проверки выполнены GitHub Actions; локальных tests/build не было.

# Фотографии при переносе iPad → Android — 08.10.2026

Исходники: iPad 67d039c3216a2f4422ca0616074653ccff586107; Android Web до изменения 51b2e2b23693113df255a39f625215de257a58e2. Пользователь сообщил: окно импорта показывает 49 фотографий, но редактор товара не показывает изображения.

## Проверенный путь копирования

Web completeBackupData копирует products, включая localImageId и imageUrl. Swift exportBackup читает локальные файлы MPosProductImages по localImageId и добавляет productImages — объект ID → Base64, плюс imageCount. Это один JSON .mposbackup, не ZIP и не ссылки на iPad-файлы.

Android BackupManager читает тот же productImages, декодирует каждое связанное изображение, проверяет размер до 2 МБ и BitmapFactory decode, сохраняет байты в private product-images и заменяет localImageId новым UUID. Затем удаляет Base64 из передаваемых в JS данных. При ошибке удаляются staged файлы; отмена импорта также удаляет их, finishImport оставляет файлы активных товаров.

Число 49 в Android окне вычисляется из успешно сохранённых staged imageIds. Следовательно, в данной копии фотографии присутствуют и были импортированы; проблема проявляется при отображении. Если после обновления файлы всё же недоступны, отдельно проверить успешное подтверждение импорта и отсутствие последующей отмены/другого восстановления.

Экспорт в текущем iPad коде молча пропускает localImageId, чей файл отсутствует. Копия, созданная в браузере без native backup handler, содержит JSON товаров, но не упаковывает native изображения. Эти ограничения не объясняют текущие 49 импортированных фото. Фото только по удалённому imageUrl требуют доступности URL; native фотографии из productImages работают offline.

## Исправление отображения

Исходный product-editor формирует img src=mpos-image://UUID. iPad регистрирует WKURLSchemeHandler для этой схемы. Android сохранял такой же URL при HTTPS-origin приложения и MIXED_CONTENT_NEVER_ALLOW. Чтобы исключить зависимость WebView от нестандартной схемы, Android bridge переводит только корректные UUID img sources в https://appassets.androidplatform.net/product-images/UUID. Native WebViewClient выдаёт файл непосредственно из ProductImageStore до asset loader, без HTTP запроса на сервер.

DOM observer обрабатывает первое отображение, повторное открытие редактора и изменение src. Remote HTTPS/data sources остаются исходными; product JSON/localImageId/imageUrl и резервные копии не переписываются. Native route ограничен HTTPS и собственным APP_HOST; UUID проверяет существующее хранилище. Mixed-content/file-access ограничения сохраняются. Метод соответствует рекомендуемому Android подходу для локальных ресурсов: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content.

Переимпорт успешно подтверждённой копии не требуется: новые адреса читают уже восстановленные файлы. Повторный импорт заменяет текущие рабочие данные и не должен использоваться как первый шаг диагностики.

## Проверки и готовность

Добавлены JS регрессия DOM rewriting/reopen/src change и сохранение remote/data/invalid URLs, а также Robolectric regression реального сохранения и HTTPS выдачи байтов, запрета чужого origin/invalid ID/path traversal и сохранности файла. Локально только JS syntax и diff; tests/lint/APK выполняет Actions. Физическая приёмка pending.

После обновления APK открыть редактор товара с фото из перенесённой копии, закрыть и открыть другой товар, повторить offline и после перезапуска приложения. Фотографии должны отображаться без повторного восстановления. Если нет, сообщить, имеется ли фото в редакторе, виден ли пустой placeholder/сломанный img и сколько фотографий показывает экспорт текущего Android: это отделяет доставку img от отсутствия сохранённого файла.

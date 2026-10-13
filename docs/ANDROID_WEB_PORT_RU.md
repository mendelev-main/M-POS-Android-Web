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

## Диагностика интеграций и загрузка — 08.10.2026

Android adapter исправляет отсутствие видимого результата test buttons, несуществующий /api/orders/test, Telegram config/callback и потерю operational snapshots при HTTP 200 с ignoredAsStale. Добавлены epoch-based revision, upgrade старого outbox и foreground retry с сохранением перед отправкой. Полный разбор, источники, 4/4 реализации (100%) и обязательные физические проверки: [INTEGRATIONS_ANDROID_RU.md](INTEGRATIONS_ANDROID_RU.md). Actions и планшетная приёмка pending; local suites/build не запускались.

## Исправление CI для остатков — 08.10.2026

Run 37834064692: 356/361 JS tests passed; все 7 Android integration regressions прошли, Android compilation/JVM/lint и signing preflight успешны. APK корректно заблокирован пятью live-stock tests: synthetic simple products не имели stockUnit, поэтому исходный renderer показывал «ед. (не задана)», а assertions ожидали «шт». Добавлен отдельный liveStockFixture с stockUnit=piece; folder fixture получил такую же явную единицу. Проверки динамического уменьшения/восстановления, recipes/modifiers, склада и отсутствия двойного списания сохранены. Runtime и CI gates не изменены. Повторная проверка — только Actions; local tests/build не запускались.

## Фотографии после импорта iPad — 08.10.2026

Пользователь подтвердил 49 фотографий в Android окне восстановления: файл копии включает изображения, Android декодировал и сохранил их. Исправлен platform путь отображения: img mpos-image://UUID переводится в local HTTPS APP_HOST/product-images/UUID с выдачей native файла без сети. Source products/backup и 33 source hashes не меняются. JS DOM и Robolectric transport regressions добавлены для Actions; local suites не запускались, физическая проверка pending. Подробности: [BACKUP_PHOTOS_RU.md](BACKUP_PHOTOS_RU.md).

## Telegram deadlines и диагностика смен — 08.10.2026

Текст/PNG/PDF переведены на единый ограниченный HTTPS transport; test queue отделена от отчётов, добавлены correlated native progress и safe ошибки всех форматов, закрытие transport при уничтожении Activity. Исходные shift triggers, storage flags и формат отчётов сохранены. Backend/project_bot не менялись; физическая доставка не подтверждена. Tests только Actions. Разбор сохранения флагов/ID и приёмки: [INTEGRATIONS_ANDROID_RU.md](INTEGRATIONS_ANDROID_RU.md).

## Настройки и панель администратора — 08.10.2026

По явному запросу пользователя кнопка администратора скрыта для неадминистратора; обновлено представление пяти действий с монохромными SVG и равными отступами, сохранены original actions/guards. Светлая и тёмная темы просмотрены в browser preview; source hashes сохранены; 3 role/render regressions добавлены в Actions. Подробнее: [ADMIN_SETTINGS_RU.md](ADMIN_SETTINGS_RU.md). APK/CI приёмка pending.

## Готовность текущего WEB-заказа — 13.10.2026

Исправлена коллизия имён между отправкой статуса готовности открытого заказа и диалогом готовности отложенного заказа в Android UI. Android adapter разделяет маршруты и блокирует повторное нажатие во время запроса; исходные iPad-файлы и их manifest hashes не изменены. Добавлена регрессия маршрутизации текущего и отложенного заказа. [GitHub Actions run 38402510979](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38402510979) подтвердил JS/source parity/transport tests, Android compilation/JVM/lint, постоянный signing key, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.36-1`. Локальные tests/build не запускались согласно правилам репозитория. Физический сценарий на планшете остаётся pending.

## Компактный каталог товаров — 13.10.2026

В настройках товаров удалена кнопка импорта, поиск перенесён в одну строку с заголовком и действиями, а кнопка «Добавить товар» защищена от переноса текста. Под строкой добавлен горизонтальный фильтр по существующим категориям в стиле выбора ингредиентов составного товара. Поиск по названию и категории, сортировка таблицы, карточки товаров, CSV-функции и форматы локальных данных не изменены. Общий Web-интерфейс синхронизирован с iPad source revision `a16e4edb0332965a298c346b05e52f17f8fc24ee`. [GitHub Actions run 38405311366](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38405311366) успешно выполнил source parity, JS/transport regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.37-1`. Физическая проверка на планшете остаётся pending.

В следующей визуальной итерации поиск оформлен как системный контрол M POS с иконкой и акцентом фокуса, общий счётчик перенесён к заголовку, а категория под названием товара удалена как дублирующая отдельную колонку. Заголовки колонок больше не являются кнопками сортировки и не показывают стрелки. Общий интерфейс синхронизирован с iPad source revision `c3cb7de90f9cb88baa7da904f884529ce85f7e1d`. [GitHub Actions run 38407368226](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38407368226) успешно выполнил source parity, JS/transport regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.38-1`. Физическая проверка этой итерации остаётся pending.


Поиск товаров получил капсульный радиус и мягкую глубину в стиле современной iOS; счётчик лишён подложки и встроен в заголовок как «Товары · количество». Общий интерфейс синхронизирован с iPad source revision `f6c8e095677afafb0ad4c5a48dfcdfbeea037b77`. [GitHub Actions run 38410968783](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38410968783) успешно выполнил source parity, JS/transport regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.41-1`. Физическая проверка этой итерации остаётся pending.

Экспериментальное скруглённое оформление раздела «Основное» карточки товара отменено после визуальной проверки; прежняя разметка и оформление восстановлены без изменения данных и поведения формы. Общий интерфейс синхронизирован с iPad source revision `fa780e25f88ebb330cfacb831546453180efc63e`. [GitHub Actions run 38416078012](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38416078012) успешно выполнил source parity, JS/transport regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.43-1`. Физическая проверка отката остаётся pending.

## Компактный состав товара — 13.10.2026

Строки выбранных ингредиентов в разделе «Состав и остатки» уменьшены по вертикали. Количество и единица измерения объединены в один горизонтальный контрол с общим контуром и состоянием фокуса; имя, справочная строка, стоимость и удаление сохранены. Расчёты рецептуры, единицы хранения, списание остатков и формат локальных данных не менялись. Общий интерфейс синхронизирован с iPad source revision `b4222505b76d70cfc9774ade13be057b2ecb984a`. [GitHub Actions run 38420775336](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38420775336) успешно выполнил source parity, JavaScript regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.44-1`. Локальные tests/build не запускались согласно правилам репозитория; физическая проверка на планшете остаётся pending.

После проверки на устройстве усилен контраст количества и единицы в тёмной теме: оба сегмента используют фон поверхности и явный `--ink`, включая WebKit text fill, а внешний контур, разделитель и focus ring приведены к единой толщине и геометрии. Общий интерфейс синхронизирован с iPad source revision `751beb153f4ac73874780a939fb28b50942ee4d6`. [GitHub Actions run 38424228529](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38424228529) успешно выполнил source parity, JavaScript regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.46-1`. Повторная физическая приёмка остаётся pending.

Переключение единицы вложенного составного товара больше не показывает двоичные хвосты наподобие `249.999999…`: значение поля очищается до поддерживаемой интерфейсом точности `0,001`. Авторитетная доля выхода рецепта в `components[].qty` не округляется и не переписывается, поэтому себестоимость и списание сохраняют прежнюю точность. Общий интерфейс синхронизирован с iPad source revision `7396b425c63220ae17de7729341f028231fbfcc1`. [GitHub Actions run 38426949516](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38426949516) успешно выполнил новую регрессию `0,25 кг ↔ 250 г`, source parity, остальные JavaScript проверки, Android compilation/JVM/lint, проверку ключа и release build; создан артефакт `M-POS-Android-Web-1.0.47-1`. Физическая приёмка остаётся pending.

Верхняя панель раздела «Товары» исправлена для тёмной темы: введённый текст и placeholder используют явные системные цвета, включая WebKit text fill. У поиска удалены полупрозрачное смешивание фона и декоративная стеклянная тень; сохранены сплошная поверхность, контур и доступный focus ring. Кнопки «Категории» и «Добавить товар» получили общую высоту и капсульный радиус с поиском и фильтрами категорий. Поведение поиска, фильтрации и таблицы не менялось. Общий интерфейс синхронизирован с iPad source revision `023f7af019a70815741456376c93f835b9f3d17e`. [GitHub Actions run 38429485639](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38429485639) успешно выполнил source parity, JavaScript regressions, Android compilation/JVM/lint, проверку постоянного ключа, release build и проверку APK; создан артефакт `M-POS-Android-Web-1.0.49-1`. Физическая приёмка остаётся pending.

Кнопка «Категории» получила явный системный контур. Из обзорной таблицы товаров удалена колонка «Онлайн заказ», при этом оба канала публикации остаются доступны в карточке товара. Устаревшая семиколоночная сетка с `!important` и её мобильное исключение удалены; таблица использует единую адаптивную сетку из шести колонок: товар, категория, тип, цена, себестоимость и остаток. Общий интерфейс синхронизирован с iPad source revision `ba709187ef8f0728f25aa1d0d58ad482c2828f4e`. GitHub Actions runs 38433680716 и 38434068485 последовательно выявили три устаревших ожидания переключателя и семи колонок; проверки доступности каналов, безопасного ID строки и статических заголовков обновлены под фактическую шестиколоночную таблицу. [GitHub Actions run 38434456037](https://github.com/mendelev-main/M-POS-Android-Web/actions/runs/38434456037) успешно выполнил 454 JavaScript-регрессии, source parity, Android compilation/JVM/lint, проверку постоянного ключа и release build; создан артефакт `M-POS-Android-Web-1.0.52-1`. Физическая приёмка остаётся pending.

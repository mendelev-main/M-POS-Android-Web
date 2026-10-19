# Карта проекта

| Слой | Основные файлы | Граница ответственности |
| --- | --- | --- |
| Общий POS web runtime | `app/src/main/assets/pos/pos.html`, `Web/js/core/`, `Web/js/features/` | Авторитетный исходник: `mendelev-main/prilavok-pos-ipad`. UI и бизнес-логика меняются там, затем переносятся штатным sync-скриптом |
| Android web adapters | `app/src/main/assets/pos/android-*.js` | Связь общего runtime с Android, ввод и платформенные особенности |
| Native host | `app/src/main/java/com/mendelev/mpos/` | WebView, транспорт, принтер, Telegram, фото, документы и файлы |
| Проверки | `tests/*.test.cjs`, `app/src/test/` | Регрессии общего runtime и Android-интеграций |
| Происхождение исходника | `web-source-manifest.json`, `scripts/sync-pos-assets.py` | Commit upstream и SHA-256 перенесённых файлов |
| Выпуск | `.github/workflows/android.yml`, `scripts/ci/`, `config/android-release.json` | Tests → signing preflight → signed APK с проверкой identity |

Backend находится отдельно в `mendelev-main/M-Pos-Backend`. Его контракты затрагивать только в рамках текущей задачи. Изменение Android UI само по себе не требует развёртывания backend.

Локальное состояние POS использует ключи `prilavok_`; продажи, склад, деньги и восстановление должны сохранять существующие схемы. Kotlin не становится вторым владельцем расчётов. Административная сессия — runtime-only; её не сериализуют. Реквизиты доступа, рабочие клиентские данные и резервные копии не являются контекстом harness.

Для предметной задачи искать реализацию через `rg`, затем читать соответствующий документ в `docs/` и тесты. Не загружать весь архив документации и не открывать секретные значения ради ориентации.

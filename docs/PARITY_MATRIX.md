# Android Web parity

| Область | Реализация | Проверка |
|---|---|---|
| Весь web-интерфейс и бизнес-логика | Исходник iPad без изменений, manifest 33 files | Source hashes + перенесённые JS suites в CI |
| Локальные данные/backup | Исходный storage и Android файлы/фото | CI + физический import/restart pending |
| Backend/сайт/SSE | Исходные handlers через Android HTTPS transport | Abort/HTTP/SSE CI; реальный backend pending |
| Telegram | Android boundary | Реальные group/thread/PNG/PDF pending |
| LAN ESC/POS | Android socket/raster | Физический принтер pending |
| PDF/XLSX/системная печать | Android report boundary | Сравнение с iPad pending |
| Обновления APK | Постоянный key, отдельный package, version increment | Actions secrets/signature/update pending |

Подробности: [ANDROID_WEB_PORT_RU.md](ANDROID_WEB_PORT_RU.md). Никакие пройденные проверки из истории другого репозитория не засчитываются как пройденные здесь.

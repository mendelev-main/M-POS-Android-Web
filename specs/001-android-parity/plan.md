# Android Web architecture

Original local HTML/CSS/JS → origin-restricted WK-style message adapter → Android platform code. The web layer owns calculations and persistent business objects; Kotlin has no native domain database. HTTPS fetch/EventSource shims route requests through native TLS without changing source business handlers. Preserve offline-first behavior and source synchronisation policy.

CI checks source SHA manifest, source JS tests, transport tests and Android lint/compile before signed APK publication. Never create temporary release keys. Document and complete physical acceptance separately.

# M POS Android Web

1. This repository is the production-compatible Android WebView track. The separate M-POS-Android repository owns the gradual native migration.
2. Reviewed iPad HTML/CSS/JavaScript is authoritative. Use scripts/sync-pos-assets.py and web-source-manifest.json; never introduce Kotlin money, stock, sale, or warehouse authorities here.
3. Preserve offline-first localStorage keys `prilavok_`, original JSON and backup schema. Persist before network effects. Catalogue sync stays manual; availability triggers follow the reviewed source.
4. Android bridges own only secure WebView hosting, HTTPS/SSE transport, LAN ESC/POS, Telegram delivery, photos, backup files and report sharing.
5. Package com.mendelev.mpos.web and its independent permanent release certificate must remain stable. It coexists with com.mendelev.mpos; data does not transfer automatically. Use explicit backups.
6. Never commit keys, tokens, customer data or backup files. Do not print credentials or read admin verifier constants.
7. The user authorizes committing/pushing main. Preserve the native project and unrelated user changes. Never force push.
8. Write tests but do not run local JS/JVM tests, lint or APK assembly unless explicitly requested. Actions has separate tests and signed-build jobs. Report CI and physical checks as pending until actually verified.
9. Document source revision, platform changes, limitations and physical acceptance after each stage. Do not claim an APK or tablet acceptance without evidence.

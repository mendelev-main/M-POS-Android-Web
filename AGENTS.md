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

## Repository harness

10. Start each task with `harness/README.md`, `harness/architecture.md`, `harness/workflow.md` and the latest entry in `harness/build-log.md`. Run `python3 scripts/harness.py preflight` before implementation and after source synchronization. This is static inspection, not a local application test.
11. Use `python3 scripts/harness.py js` and `python3 scripts/harness.py android` in GitHub Actions. Do not pass `--allow-local-tests` without the user's explicit authorization for local tests. The harness does not override rule 8.
12. Record material decisions, observed verification evidence and remaining physical checks in `harness/build-log.md`; for a complex task keep its scoped plan in `harness/tasks/`. Preserve existing authorizations; do not introduce extra approval gates for routine authorized work.

#!/usr/bin/env python3
"""Repository harness: static preflight and the existing CI verification suites."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
PLATFORM_SCRIPTS = (
    'android-customer-input', 'android-loyalty-ui', 'android-loyalty-pricing',
    'android-inventory', 'android-purchase-validation', 'android-bookings-customers',
    'android-safety', 'android-admin', 'android-integrations', 'android-pos-stock',
    'android-bridge', 'android-network',
)


def preflight(root):
    """Read tracked source/configuration only; never execute app code or contact services."""
    issues = []
    required = ('AGENTS.md', 'harness/README.md', 'harness/architecture.md',
                'harness/workflow.md', 'harness/build-log.md',
                '.github/workflows/android.yml', 'config/android-release.json',
                'web-source-manifest.json')
    for name in required:
        if not (root / name).is_file():
            issues.append('Missing harness input: ' + name)
    try:
        manifest = json.loads((root / 'web-source-manifest.json').read_text())
        if manifest['sourceRepository'] != 'mendelev-main/prilavok-pos-ipad':
            issues.append('Unexpected authoritative source repository')
        if not re.fullmatch(r'[0-9a-f]{40}', manifest['sourceCommit']):
            issues.append('Invalid authoritative source commit')
        files = manifest['files']
        if not isinstance(files, dict) or not files or 'pos.html' not in files:
            raise ValueError('Manifest must include pos.html')
        assets = root / 'app/src/main/assets/pos'
        for name, expected in files.items():
            path = (assets / name).resolve()
            if Path(name).is_absolute() or not path.is_relative_to(assets.resolve()):
                issues.append('Manifest path escapes runtime directory')
                continue
            if not re.fullmatch(r'[0-9a-f]{64}', expected):
                issues.append('Invalid source digest: ' + name)
                continue
            content = path.read_bytes()
            if name == 'pos.html':
                text = content.decode()
                for script in PLATFORM_SCRIPTS:
                    text = text.replace('<script src="' + script + '.js"></script>\n', '', 1)
                text = text.replace('\n<script src="android-web-ready.js"></script>\n<script src="notification-native.js"></script>\n<script src="android-web-ready.js"></script>', '', 1)
                content = text.encode()
            if hashlib.sha256(content).hexdigest() != expected:
                issues.append('Runtime differs from pinned source: ' + name)
        release = json.loads((root / 'config/android-release.json').read_text())
        if release['applicationId'] != 'com.mendelev.mpos.web':
            issues.append('Unexpected Android application identity')
        if not re.fullmatch(r'[0-9a-f]{64}', release['certificateSha256']):
            issues.append('Invalid permanent certificate fingerprint')
        gradle = (root / 'app/build.gradle.kts').read_text()
        if 'applicationId = "' + release['applicationId'] + '"' not in gradle:
            issues.append('Gradle application identity differs from release configuration')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        # Do not include file contents, environment variables, or credential values.
        issues.append('Cannot validate repository inputs: ' + type(exc).__name__)
    return issues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('preflight', 'js', 'android'))
    parser.add_argument('--allow-local-tests', action='store_true',
                        help='Use only after explicit user authorization for local tests')
    args = parser.parse_args()
    if args.command != 'preflight' and os.environ.get('GITHUB_ACTIONS') != 'true' and not args.allow_local_tests:
        parser.error('Tests run in GitHub Actions. Local execution requires explicit user authorization and --allow-local-tests.')
    output = ROOT / 'build/harness'
    output.mkdir(parents=True, exist_ok=True)
    issues = preflight(ROOT)
    status = 1 if issues else 0
    if not status and args.command != 'preflight':
        command = (['node', '--test'] + [str(p.relative_to(ROOT)) for p in sorted((ROOT / 'tests').glob('*.test.cjs'))]
                   if args.command == 'js' else ['./gradlew', '--no-daemon', '--max-workers=4', 'testDebugUnitTest', 'lintDebug'])
        with (output / (args.command + '.log')).open('w') as log:
            process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in process.stdout:
                print(line, end='', flush=True)
                log.write(line)
            status = process.wait()
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report = {'command': args.command, 'commit': revision,
              'timeUtc': datetime.now(timezone.utc).isoformat(),
              'status': 'passed' if status == 0 else 'failed', 'issues': issues,
              'scope': 'Static source/configuration preflight' if args.command == 'preflight' else args.command}
    (output / (args.command + '.json')).write_text(json.dumps(report, indent=2) + '\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary and os.environ.get('GITHUB_ACTIONS') == 'true':
        with open(summary, 'a') as file:
            file.write('\n### Repository harness: ' + args.command + '\n\n')
            file.write('Result: **' + report['status'] + '**. Commit: `' + revision + '`.\n\n')
            file.write('Evidence: `build/harness/' + args.command + '.json` in the test reports artifact.\n')
    if status and os.environ.get('GITHUB_ACTIONS') == 'true':
        print('::error title=Repository harness failure::' + args.command + ' failed; see build/harness reports and the step log.')
    print(json.dumps(report, indent=2))
    return status if status >= 0 else 1


if __name__ == '__main__':
    sys.exit(main())

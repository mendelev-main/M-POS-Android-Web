"""Validate CI signing material independently of tests; never log private values."""
import base64
import hashlib
import json
import os
import subprocess
from pathlib import Path

names = ('MPOS_KEYSTORE_BASE64', 'MPOS_KEYSTORE_PASSWORD', 'MPOS_KEY_ALIAS', 'MPOS_KEY_PASSWORD')
missing = [name for name in names if not os.environ.get(name)]
if missing:
    raise SystemExit('Missing Actions secrets: ' + ', '.join(missing))
key = Path(os.environ['RUNNER_TEMP']) / 'mpos-web-preflight.keystore'
try:
    try:
        key.write_bytes(base64.b64decode(os.environ['MPOS_KEYSTORE_BASE64'].strip(), validate=True))
        key.chmod(0o600)
    except (ValueError, OSError):
        raise SystemExit('MPOS_KEYSTORE_BASE64 is not a valid complete keystore value')
    result = subprocess.run([
        'keytool', '-exportcert', '-keystore', str(key),
        '-alias', os.environ['MPOS_KEY_ALIAS'],
        '-storepass:env', 'MPOS_KEYSTORE_PASSWORD',
    ], capture_output=True)
    if result.returncode:
        raise SystemExit('Cannot open signing certificate; check keystore password and alias')
    expected = json.loads(Path('config/android-release.json').read_text())['certificateSha256']
    if hashlib.sha256(result.stdout).hexdigest() != expected:
        raise SystemExit('Wrong certificate: use the independent Android Web key, not the native app key')
    private = subprocess.run([
        'keytool', '-certreq', '-keystore', str(key),
        '-alias', os.environ['MPOS_KEY_ALIAS'],
        '-storepass:env', 'MPOS_KEYSTORE_PASSWORD',
        '-keypass:env', 'MPOS_KEY_PASSWORD',
    ], capture_output=True)
    if private.returncode:
        raise SystemExit('Cannot use signing private key; check MPOS_KEY_PASSWORD')
    print('Independent Android Web signing certificate and private-key access verified')
finally:
    key.unlink(missing_ok=True)

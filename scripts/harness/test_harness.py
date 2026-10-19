"""Harness regressions run in Actions; fixtures contain no production data."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

spec = importlib.util.spec_from_file_location('repository_harness', Path(__file__).resolve().parents[1] / 'harness.py')
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ('AGENTS.md', 'harness/README.md', 'harness/architecture.md',
                     'harness/workflow.md', 'harness/build-log.md', '.github/workflows/android.yml'):
            self.write(name, 'fixture\n')
        self.write('app/src/main/assets/pos/pos.html', '<html></html>')
        self.manifest = {'sourceRepository': 'mendelev-main/prilavok-pos-ipad', 'sourceCommit': 'a' * 40,
                         'files': {'pos.html': hashlib.sha256(b'<html></html>').hexdigest()}}
        self.save_manifest()
        self.write('config/android-release.json', json.dumps({'applicationId': 'com.mendelev.mpos.web', 'certificateSha256': 'b' * 64}))
        self.write('app/build.gradle.kts', 'applicationId = "com.mendelev.mpos.web"')

    def write(self, name, value):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(value)

    def save_manifest(self):
        self.write('web-source-manifest.json', json.dumps(self.manifest))

    def test_pinned_fixture_passes_without_application_execution(self):
        self.assertEqual(harness.preflight(self.root), [])

    def test_changed_runtime_fails(self):
        self.write('app/src/main/assets/pos/pos.html', '<html>changed</html>')
        self.assertIn('Runtime differs from pinned source: pos.html', harness.preflight(self.root))

    def test_platform_script_allowlist_does_not_hide_other_runtime_changes(self):
        self.write('app/src/main/assets/pos/pos.html', '<script src="android-bridge.js"></script>\n<html></html>')
        self.assertEqual(harness.preflight(self.root), [])
        self.write('app/src/main/assets/pos/pos.html', '<script src="unreviewed.js"></script>\n<html></html>')
        self.assertTrue(harness.preflight(self.root))

    def test_manifest_cannot_read_outside_runtime(self):
        self.manifest['files']['../../../../outside'] = '0' * 64
        self.save_manifest()
        self.assertIn('Manifest path escapes runtime directory', harness.preflight(self.root))

    def test_missing_context_and_wrong_package_fail(self):
        (self.root / 'harness/workflow.md').unlink()
        self.write('app/build.gradle.kts', 'applicationId = "wrong.package"')
        issues = harness.preflight(self.root)
        self.assertIn('Missing harness input: harness/workflow.md', issues)
        self.assertIn('Gradle application identity differs from release configuration', issues)

    def test_malformed_manifest_fails_closed(self):
        self.manifest['files'] = []
        self.save_manifest()
        self.assertTrue(harness.preflight(self.root))

    def test_failed_suite_preserves_exit_status_and_report(self):
        process = Mock(stdout=io.StringIO('fixture failure\n'))
        process.wait.return_value = 7
        with patch.object(harness, 'ROOT', self.root), patch('sys.argv', ['harness.py', 'js']), \
             patch.dict('os.environ', {'GITHUB_ACTIONS': 'true'}, clear=True), \
             patch.object(harness.subprocess, 'Popen', return_value=process), \
             patch.object(harness.subprocess, 'check_output', return_value='a' * 40), \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(harness.main(), 7)
        report = json.loads((self.root / 'build/harness/js.json').read_text())
        self.assertEqual(report['status'], 'failed')
        self.assertIn('fixture failure', (self.root / 'build/harness/js.log').read_text())

    def test_local_suite_requires_explicit_opt_in(self):
        with patch('sys.argv', ['harness.py', 'js']), patch.dict('os.environ', {}, clear=True), \
             contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as raised:
            harness.main()
        self.assertEqual(raised.exception.code, 2)


if __name__ == '__main__':
    unittest.main()

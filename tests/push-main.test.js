const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const PUSH_HELPER = path.resolve(__dirname, '../scripts/push-main.sh');

function findBash() {
  if (process.platform !== 'win32') return 'bash';

  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe')
  ];
  return candidates.find(candidate => fs.existsSync(candidate));
}

const bash = findBash();

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function configureGit(repo) {
  run('git', ['config', 'user.name', 'CI integration test'], repo);
  run('git', ['config', 'user.email', 'ci@example.invalid'], repo);
}

test('push helper rebases a concurrent, non-conflicting update before pushing', {
  skip: bash ? false : 'Git Bash is not installed'
}, () => {
  const prefix = 'codex-push-main-test-';
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const remote = path.join(root, 'remote.git');
  const seed = path.join(root, 'seed');
  const graphRun = path.join(root, 'graph-run');
  const guestbookRun = path.join(root, 'guestbook-run');

  try {
    fs.mkdirSync(seed);
    run('git', ['init', '--bare', remote], root);
    run('git', ['--git-dir', remote, 'symbolic-ref', 'HEAD', 'refs/heads/main'], root);
    run('git', ['init', seed], root);
    configureGit(seed);
    fs.writeFileSync(path.join(seed, 'base.txt'), 'base');
    run('git', ['add', 'base.txt'], seed);
    run('git', ['commit', '-m', 'initial'], seed);
    run('git', ['branch', '-M', 'main'], seed);
    run('git', ['remote', 'add', 'origin', remote], seed);
    run('git', ['push', '-u', 'origin', 'main'], seed);

    run('git', ['clone', remote, graphRun], root);
    run('git', ['clone', remote, guestbookRun], root);
    configureGit(graphRun);
    configureGit(guestbookRun);

    fs.writeFileSync(path.join(graphRun, 'graph.txt'), 'graph update');
    run('git', ['add', 'graph.txt'], graphRun);
    run('git', ['commit', '-m', 'graph update'], graphRun);
    run('git', ['push', 'origin', 'main'], graphRun);

    fs.writeFileSync(path.join(guestbookRun, 'guestbook.txt'), 'guestbook update');
    run('git', ['add', 'guestbook.txt'], guestbookRun);
    run('git', ['commit', '-m', 'guestbook update'], guestbookRun);

    const result = spawnSync(bash, [PUSH_HELPER], { cwd: guestbookRun, encoding: 'utf8' });
    assert.equal(result.status, 0, `push helper failed:\n${result.stdout}\n${result.stderr}`);

    const noChangeResult = spawnSync(bash, [PUSH_HELPER], { cwd: graphRun, encoding: 'utf8' });
    assert.equal(noChangeResult.status, 0, `no-change push helper failed:\n${noChangeResult.stdout}\n${noChangeResult.stderr}`);

    assert.equal(run('git', ['--git-dir', remote, 'show', 'main:graph.txt'], root), 'graph update');
    assert.equal(run('git', ['--git-dir', remote, 'show', 'main:guestbook.txt'], root), 'guestbook update');
  } finally {
    const resolvedRoot = path.resolve(root);
    const resolvedTemp = path.resolve(os.tmpdir());
    assert.equal(path.dirname(resolvedRoot), resolvedTemp);
    assert.ok(path.basename(resolvedRoot).startsWith(prefix));
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
});

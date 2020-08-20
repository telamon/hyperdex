const readline = require('readline')
const minimist = require('minimist')
const replicate = require('@hyperswarm/replicator')
const hyperdrive = require('hyperdrive')
const { readdirSync, lstatSync, readFileSync } = require('fs')
const { join, relative } = require('path')
const { createHash } = require('crypto')
const { machineId } = require('node-machine-id')
const { defer } = require('deferinfer')

const args = minimist(process.argv.slice(2), {
  string: 'secret',
  boolean: ['help', 'dry-run', 'break-lock'],
  alias: { h: 'help', sk: 'secret', n: 'dry-run', f: 'break-lock' },
  default: { lang: 'en' }
})
const root = args._.shift()

async function main () {
  if (!root) throw new Error('Positional argument "path" missing')
  const drive = hyperdrive('.hyper_dist/')
  await defer(d => drive.ready(d))
  replicate(drive)
  await syncFolder(drive, root)
  console.log(`hyper://${drive.key.hexSlice()}`, '@', drive.version)
  console.log('Seeding drive until stopped (Ctrl+C)')
}

async function syncFolder (drive, path) {
  const files = readdirSync(path)
  const tasks = []
  for (const file of files) {
    const src = join(path, file)
    const dst = relative(root, src)
    const stat = lstatSync(src)
    if (stat.isDirectory()) {
      await syncFolder(drive, join(path, file))
      continue
    } else if (!stat.isFile()) {
      console.error('Warning, skipped', join(path, file))
      continue
    }
    const content = readFileSync(src)
    const hash = createHash('md5')
      .update(content)
      .digest()

    const dstat = await defer(d => drive.lstat(dst, { wait: true }, d))
      .catch(err => { if (err.code !== 'ENOENT') throw err })
    let write = true
    if (dstat && dstat.metadata && dstat.metadata.checksum) {
      if (hash.equals(dstat.metadata.checksum)) write = false
    }
    if (write) tasks.push({ content, dst, hash, size: stat.size })
  }

  if (!tasks.length) {
    console.log('Nothing to do, drive already in sync')
    return
  }
  console.log('The Following files are about to be imported:')
  for (const { dst, hash, size } of tasks) {
    console.log(hash.hexSlice(), size, dst)
  }

  if (args.n) return // Dry-running

  await defer(done => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.question('Proceed with import? (y/N)', line => {
      if (line.match(/^y(es)?$/)) done()
      else {
        // done(new Error('Aborted by user'))
        console.log('Aborted by user')
        process.exit(0)
      }
    })
  })

  for (const { content, dst, hash } of tasks) {
    const metadata = { checksum: hash }
    await defer(done => drive.writeFile(dst, content, { metadata }, done))
  }
}

const LOCK_KEY = '.device.lock'
async function unlock (drive) {
  // There's no param to inject it during initialization.
  const secret = drive.metadata.secretKey.hexSlice()

  const deviceId = await machineId()
    .then(mid => createHash('sha256')
      .update(mid)
      .digest())

  /* Shared drives, easy peasy:
   * echo hwID > /drive/.hwlock
   * if .lock != hwID:
   *   lockreq = sign(secret, 'Plz gief lock to ${hwId} ${current.seq}`)
   * onLockRequest ()
   *  if this.hwId == .hwlock && seq == req.seq:
   *    echo req.hwid > .hwlock
   *
   * Functionality as a module api:
   *
   * drive = hyperdrive(path, { extensions: [hyperlock] })
   * const isMine = await hyperlock(drive, TIMEOUT = 30*1000)
   * if (mine) drive.write(....)
   */
}

main()
  // .then(() => process.exit(0))
  .catch(err => {
    console.log(err)
    process.exit(1)
  })

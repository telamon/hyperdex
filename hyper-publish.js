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
  boolean: [ 'help' ],
  alias: { h: 'help', sk: 'secret' },
  default: { lang: 'en' }
})
const root = args._.shift()

async function main () {
  const mid = await machineId()
  const hardwareIdentifier = createHash('sha256')
    .update(mid)
    .digest()
  /* Shared drives, easy peasy:
   * echo hwID > /drive/.hwlock
   * if .lock != hwID:
   *   lockreq = sign(secret, 'Plz gief lock to ${hwId} ${@seq}`)
   * onLockRequest ()
   *  if this.hwId == .hwlock && seq == req.seq:
   *    echo req.hwid > .hwlock
   *
   * Functionality as a module api:
   *
   * drive = hyperdrive(path, { extensions: [hyperlock] })
   * const mine = await hyperlock(drive, TIMEOUT = 30*1000)
   * if (mine) drive.write(....)
   */
  if (!root) throw new Error('Positional argument "path" missing')
  const drive = hyperdrive('.hyper_dist/')
  await defer(d => drive.ready(d))
  replicate(drive)
  // There's no param to inject it during initialization.
  const secret = drive.metadata.secretKey.hexSlice()
  await syncFolder(drive, root)
  console.log(`hyper://${drive.key.hexSlice()}`, '@', drive.version)
  console.log('Seeding drive until stopped (Ctrl+C)')
}
async function syncFolder (drive, path) {
  const files = readdirSync(path)
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
      .catch(err => { if(err.code !== 'ENOENT') throw err })
    let overwrite = true
    if (dstat && dstat.metadata && dstat.metadata.checksum) {
      if(hash.equals(dstat.metadata.checksum)) overwrite = false
    }

    if (overwrite) {
      const metadata = { checksum: hash }
      await defer(done => drive.writeFile(dst, content, { metadata }, done))
      console.log('Imported', hash.hexSlice(), dst)
    }
  }
}

main()
  // .then(() => process.exit(0))
  .catch(err => {
    console.log(err)
    process.exit(1)
  })

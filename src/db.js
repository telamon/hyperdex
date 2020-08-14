import dbnc from 'debounce'
import { writable, derived, readable, get } from 'svelte/store'

const log = console.log.bind(null, '[hyperdex]')
// import prettyHash from 'pretty-hash'
function prettyHash (str) { return str.replace(/^(.{3}).+(.{6})$/, '$1...$2') }
const safteyNet = fn => {
  return (...args) => {
    fn(...args)
      .catch(err => {
        debugger
        log('[errhandler] trapped', err)
        throw err
      })
  }
}
function previewPath (key, file, version = null) {
  if (typeof key !== 'string') throw new Error('Expected hexstring') // key = key.toString('hex')
  const k = `previews/${key.substr(0, 2)}/${key.substr(2, 2)}/${key.substring(4)}/${file}`
  if (version !== null) return `${k}_${version}`
  return k
}

class HyperdexDb {
  constructor (url) {
    this.url = url
    this._version = 0
    this._states = {
      news: 0,
      about: 0,
      results: 0
    }
    this._dynamicInfos = {}
    this.version = readable(this._version, set => { this._setVersion = set })
    this.drive = beaker.hyperdrive.drive(url)
    this.drive.watch(dbnc(this._processUpdates.bind(this), 5000))
    this.about = derived(this.version, this._aboutStore.bind(this), {})
    this._terms = writable([])
    this.searchResults = derived([this._terms, this.about], this._resultsStore.bind(this), [])
    this.newsPage = writable(0)
    this.news = derived([this.version, this.newsPage], safteyNet(this._newsStore.bind(this)), [])
    this._processUpdates()
  }

  search (terms) {
    dbnc(() => this._terms.set(terms), 500)
  }

  driveInfo (key) {
    if (!this._dynamicInfos[key]) {
      const state = { version: 0 }
      state.store = derived(this.version, async (version, set) => {
        if (!version) return set({})
        const stat = await this.drive.stat(`about/${key}`)
        const seq = stat.mtime.getTime() // TODO: there's no way to access the sequence number without diff(), using
        if (seq <= state.version) return
        const info = await this.__makeDriveInfo(key)
        set(info)
      }, {})
      this._dynamicInfos[key] = state
    }
    return this._dynamicInfos[key].store
  }

  async _processUpdates (...args) {
    this._info = await this.drive.getInfo()
    const { version } = this._info
    if (this._version !== version && typeof this._setVersion === 'function') {
      log(`new database version ${version}, previous was ${this._version}`)
      this._setVersion(version)
      this._version = version
    }
  }
  async __makeDriveInfo (key) {
    const body = await this.drive.readFile(`about/${key}`)
    let thumbnail = null
    try {
      const files = await this.drive.readdir(previewPath(key, ''), { includeStats: true })
      const entry = files.find(e => e.name.match(/thumb\.(png|jpe?g)$/))
      if (entry) thumbnail = `${this.url}/${entry.stat.linkname}`
    } catch (err) {
      if (err.message !== 'Uncaught NotFoundError: File not found') throw err
    }
    return {
      ...JSON.parse(body),
      key,
      thumbnail
    }
  }
  async _aboutStore (ver, set) {
    if (!ver) return {}
    const changes = await this.drive.diff(this._states.about, 'about/')
    if (!changes.length) return // No changes no change
    log(`about updated: ${this._states.about} => ${ver}`)
    const keys =  changes.map(n => n.name.substr('about/'.length))
    const drives = get(this.about) || {}
    for (const key of keys) {
      try {
        drives[key] = await this.__makeDriveInfo(key)
      } catch (err) {
        console.error('Failed loading drive-info: ', key, err)
      }
    }
    this._states.about = ver
    set(drives)
  }

  async _newsStore ([version, page], set) {
    const limit = 15
    if (!version) return set([])
    const changes = await this.drive.diff(this._states.news, 'updates/')
    if (!changes.length) return // No changes

    // news store is always rebuilt afresh from the lastest {limit} entries
    const entries = await this.drive.query({
      path: `updates/*`,
      type: 'file',
      limit,
      offset: limit * this.newsPage,
      sort: 'name',
      reverse: true
    })
    const articles = []
    for (const entry of entries) {
      const fname = entry.path.match(/.*\/([^\/]+)$/)[1]
      let tmp = fname.split('_')
      const date = parseInt(tmp.shift())
      const key = tmp.shift()
      const remotePath = tmp.join('_').replace(/\+/g, '/')
      const remoteVer = await this.drive.readFile(entry.path)

      // generate preview hints
      const ppath = previewPath(key, remotePath, remoteVer)
      const previewUrl = `${this.url}/${ppath}`
      let preview = null
      let previewType = null
      if (remotePath.match(/\.(md|txt)$/i)) {
        try {
          /*
          console.log('Attempt listing:', previewPath(key, ''))
          const linkStat = await this.drive.stat(ppath, { lstat: true })
          if (!linkStat) break
          preview = await this.drive.readFile(linkStat.linkname) */
          preview = await this.drive.readFile(ppath)
          previewType = 'text'
        } catch (err) {
          if (err.message !== 'Uncaught NotFoundError: File not found') throw err
        }
      } else if (remotePath.match(/\.(png|jpe?g)$/)) {
        previewType = 'image'
        preview = previewUrl
      }

      const info = {
        version: parseInt(remoteVer),
        path: remotePath,
        date,
        key,
        url: `hyper://${key}/${remotePath}`,
        prettyUrl: `hyper://${prettyHash(key)}/${remotePath}`,
        preview,
        previewType,
        previewUrl
      }
      articles.push(info)
    }

    log(`news updated: ${this._states.news} => ${version}`)
    this._states.news = version
    set(articles)
  }

  async _resultsStore ([version, terms, about], set) {
    return []
    const results = {}
    for (const term of $terms) {
      if (term.length < 3) continue
      const entries = await $db.query({
        path: `ngrams/${term.split('').join('/')}/*`,
        type: 'file'
      })

      for (const entry of entries) {
        const fname = entry.path.match(/.*\/([^\/]+)$/)[1]
        let tmp = fname.split('_')
        const key = tmp.shift()
        const remotePath = tmp.join('_').replace('+', '/')
        if (!results[fname]) {
          results[fname] = { _score: 0, hits: [] }
        }
        const result = results[fname]
        const _body = await $db.readFile(entry.path)
        const hit = JSON.parse(_body)
        hit.term = term
        let count = 0
        for (const _ of hit.match.matchAll(new RegExp(term, 'ig'))) count++
        hit.highlight = Purify.sanitize(marked(hit.match))
        hit.highlight = hit.highlight.replace(new RegExp(`(${term})`, 'ig'), '<em>$1</em>')
        const url = `hyper://${key}/${hit.file}`
        const prettyUrl = `hyper://${prettyHash(key)}/${hit.file}`
        Object.assign(result,  { url, key, prettyUrl })
        // TODO: double search weights if it's an exact match as opposite to partial
        result._score += 1 + count * 0.25 // add search hit weights
        const info = $about[key]
        if (info) {
          result._score += info.peers * 0.05 // add popularity weight
          result._title = info.title
          result._description = info.description
          result._peers = info.peers
        }
        result._score -= ((new Date().getTime() - hit.date) / 180000) * 0.0001 // age weight
        result.hits[term] = hit
      }
    }
    const out = Object.values(results)
      .map(r => { return {...r, hits: Object.values(r.hits) } })
    out.sort((a, b) => b._score - a._score)
    set(out)
  }
}

/*
const dbVersion = readable(-1, set => {
  console.log(drive)
  set(drive.version)
  const notifyDbUpdate = dbnc(() => {
    log('Database updated', drive.version)
    set(drive.version || new Date().getTime())
  }, 1000)
})
const db = derived(dbVersion, (v, set) => {
  set(drive)
})*/

export default HyperdexDb

// hyper://55df5ba86621c25ae07af7fae4cb940c730113423cdb9af09723b3b27a62933c/previews/86/fc/deb5ebb4a720f4e5b66fbab67a8051ddf09659cd2622cdeb0de8c4d41267/microblog/1596885401715.md

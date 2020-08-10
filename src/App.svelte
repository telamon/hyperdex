<script>
import { writable, derived, readable } from 'svelte/store'
import prettyBytes from 'pretty-bytes'
import moment from 'moment'
import marked from 'marked'
import Purify from 'dompurify'
import dbnc from 'debounce'

const DATABASE_URL = 'hyper://aa0a5457260e4769b33392a0c570d5280984a48f4d805256ff57a233a1e78ee5'

// import prettyHash from 'pretty-hash'
function prettyHash (str) { return str.replace(/^(.{3}).+(.{6})$/, '$1...$2') }
const log = console.log.bind(null, '[hyperdex]')
const doErr = fn => {
  return (...args) => {
    fn(...args)
      .catch(err => {
        log('[errhandler] trapped', err)
        throw err
      })
  }
}
const drive = beaker.hyperdrive.drive(DATABASE_URL)
const dbVersion = readable(-1, set => {
  console.log(drive)
  set(drive.version)
  const notifyDbUpdate = dbnc(() => {
    log('Database updated', drive.version)
    set(drive.version || new Date().getTime())
  }, 1000)
  drive.watch(notifyDbUpdate)
})
const db = derived(dbVersion, (v, set) => {
  set(drive)
  /*  .then(drive => set(drive))
    .catch(console.error.bind(null, 'Failed loading database'))*/
})

const searchInput = writable('')
const dbncSet = dbnc((set, val) => {
  $menuState = 'results'
  set(val), 500
})
const tokens = derived(searchInput, ($input, set) => {
  if (!$input.length) return set([])
  const t = []
  for (const match of $input.toLowerCase().matchAll(/\b([\w\d]+)/g)) t.push(match[1])
  dbncSet(set, t)
})

const aboutLut = derived(db, async (_db, set) => {
  const keys = await _db.readdir('/about')
  const drives = {}
  for (const key of keys) {
    try {
      const body = await _db.readFile(`/about/${key}`)
      drives[key] = ({...JSON.parse(body), key})
    } catch (err) {
      console.error('Failed loading drive-info: ', key, err)
    }
  }
  set(drives)
})
const idxAbout = derived(aboutLut, ($a, set) => {
  if (!$a) return set([])
  const drives = Object.values($a)
  drives.sort((a, b) => {
    return b.peers - a.peers
  })
  set(drives)
})
const _loc = window.location.hash.replace(/#/, '')
const menuState = writable(_loc.length ? _loc : 'results')

const results = derived([db, tokens, aboutLut], async ([$db, $terms, $about], set) => {
  const results = {}
  // TODO: dbnc
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
})
const showTab = (section, ev) => {
  $menuState = section
}
const newsPage = writable(0)
const news = derived([db, aboutLut, newsPage], async ([$db, $about, $page], set) => {
  if (!$db || !$about) return set([])
  const limit = 15
  const entries = await $db.query({
    path: `updates/*`,
    type: 'file',
    limit,
    offset: limit * $page,
    sort: 'name',
    reverse: true
  })
  const articles = []
  for (const entry of entries) {
    const fname = entry.path.match(/.*\/([^\/]+)$/)[1]
    let tmp = fname.split('_')
    const date = parseInt(tmp.shift())
    const key = tmp.shift()
    const remotePath = tmp.join('_').replace('+', '/')
    const record = await $db.readFile(entry.path)
    const info = {
      version: record, // TODO: contain remoteStat & ellipsis/excerpt as well.
      path: remotePath,
      date,
      key,
      url: `hyper://${key}/${remotePath}`,
      prettyUrl: `hyper://${prettyHash(key)}/${remotePath}`
    }
    const abt = $about[key]
    if (abt) {
      info.description = abt.description
      info.title = abt.title
    }
    articles.push(info)
  }
  set(articles)
})
</script>

<main>
  <header>
    db_url: <a href="{DATABASE_URL}">{DATABASE_URL}</a> @ version {$dbVersion}
  </header>
  <section class="logo">
    <h1>hypé<sub>®</sub>dex</h1>
    <div class="pic {!$searchInput || !$searchInput.length ? '' : ' hidden'}">
      <div><img src="/index.jpg" alt="thick heavy phonebook"/></div>
      <small>
        <i>¤oogle done right.</i>
      </small>
    </div>
  </section>

  <section class="search">
    <input type="text" placeholder="search" bind:value={$searchInput}/>
  </section>
  <nav>
    <a href="#results" on:click={showTab.bind(null, 'results')}>Results</a>
    <a href="#news" on:click={showTab.bind(null, 'news')}>Updates</a>
    <a href="#explore" on:click={showTab.bind(null, 'explore')}>Discover</a>
    <a href="#about" on:click={showTab.bind(null, 'about')}>About</a>
  </nav>
  {#if $menuState === 'results'}
  <section class="results mpad">
    {#if !$results || !$results.length }
      <h2>Results</h2>
      <i>No results available, type 🐈 into the search box!</i>
    {:else}
      <h2><strong>{$results.length}</strong> results for <strong>{$tokens.join(', ')}</strong></h2>
      {#each ($results || []) as res}
        <result>
        <sup title="ducks">🦆{Math.round(100 * res._score)/100}</sup> <sup title="peers">👥{res._peers}</sup>
        <h4><a href="{res.url}">{res._title}</a></h4>
        <small>{res._description}</small><br/>
        <samp><a href="{res.url}">{res.prettyUrl}</a></samp>
        <p>
        {#each res.hits as hit}
          <small>
            <time title="{new Date(hit.date).toString()}"
                  datetime="{new Date(hit.date).toString()}">
              🕑 {moment(hit.date).fromNow()}
            </time>
          </small>
          <p class="ellipsis">{@html hit.highlight}...</p>
        {/each}
        </p>
        </result>
      {/each}
    {/if}
  </section>
  {/if}

  {#if $menuState === 'news'}
    <section class="news mpad">
      <h2>What's new in hyperspace</h2>
      {#each ($news || []) as article}
        <article>
          <small><time
             title="{new Date(article.date).toString()}"
             datetime="{new Date(article.date).toString()}">
              Updated {moment(article.date).fromNow()}
            </time></small>
            <h4>{article.title}</h4>
            <small>{article.description}</small>
            <br/>
            <a href="{article.url}">{article.prettyUrl}</a>
            <p class="excerpt">TODO: summary goes here</p>
            <!--{JSON.stringify(article)}-->
        </article>
      {/each}
    </section>
  {/if}

  {#if $menuState === 'explore'}
    <h2 style="padding: 0 4em">Discover</h2>
    <section class="explore mpad">
      {#each ($idxAbout || []) as drive}
        <drive-card>
          <small><time
             title="{new Date(drive.updatedAt).toString()}"
             datetime="{new Date(drive.updatedAt).toString()}">
              Updated {moment(drive.updatedAt).fromNow()}
            </time></small>
          <h4><a href="hyper://{drive.key}">{drive.title}</a></h4>
          <p>&nbsp;{drive.description}</p>
          <samp>
            <span title="peers">👥{drive.peers}</span>
            <span title="version">🕑{drive.version}</span>
            <span title="file count">📁{drive.files}</span>
            <span title="drive size">({prettyBytes(drive.size)})</span>
          </samp>
          <!-- drive.updatedAt is missing -->
        </drive-card>
      {/each}
    </section>
  {/if}

  {#if $menuState === 'about'}
    <section class="about mpad">
      <h2>About hyperdex</h2>
      <ul>
        <li>Source code <a target="_new" href="https://github.com/telamon/hyperdex">hyperdex</a> (offline-webapp)</li>
        <li>Source code <a target="_new" href="https://github.com/telamon/hyperspace-indexer">hyperspace-indexer</a> (robot)</li>
        <li><a target="_new" href="https://twitter.com/telamohn">@telamohn (twitter)</a></li>
        <li><a target="_new" href="https://www.patreon.com/decentlabs">Decentlabs Patreon</a></li>
        <!--<li>hyper://decentlabs.se</li>-->
      </ul>
    </section>
    <result>
      <h2>Q&A</h2>
      <pre>
        ******
        Q: I don't want to be indexed
        A: Put an empty <span style="border: 1px solid #666;border-radius:4px;padding: 1px 5px;background-color: #eee">.nocrawl</span> file in the root of your hyperdrive.

        Q: Why is everything broken and where's the content for this page?
        A:
                      <img src="/under_construction.gif" width="200" alt="under construction"/>
                      ~ Under Construction ~
      </pre>
    </result>
  {/if}
  <footer>
    <p class="disclaimer">
    ⚠️ Disclaimer ⚠️
    <br/>
    The content on this page is transparently and deterministically produced by a robot,
    if you disagree with anything presented here or would like to alter the robot's behaviour,
    then please open an <a href="https://github.com/telamon/hyperspace-indexer/issues">issue</a> and don't forget
    to <a href="https://www.patreon.com/decentlabs">subscribe</a> to boost research and development.
    </p>
    <p>2020 © <a href="https://www.patreon.com/decentlabs">Decent Labs AB</a>. All wrongs reversed - <samp>Licensed GNU AGPLv3</samp></p>
  </footer>
</main>

<style>
  .disclaimer {
    background-color: #eee;
    border-radius: 4px;
    font-family: monospace;
    display: inline-block;
    max-width: 600px;
    padding: 2em;
    margin: 1em;
  }
  .explore { display: flex; flex-wrap: wrap; flex-direction: row; }
  drive-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 220px;
    border: 1px solid black;
    border-radius: 2px;
    padding: 1em;
    margin: 0.5em;
  }
  footer {
    text-align: center;
  }
  header {
    background-color: #03052d;
    color: #a680a9;
    padding: 4px 20px;
    text-align: right;
    font-size: 10px;
  }
  header a { background-color: inherit; }
  header a:visited { background-color: inherit; }
  .search {
    text-align: center;
    font-size: 24px;
    margin-top: 2em;
  }
	.logo {
		text-align: center;
		padding-top: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
  h2 { font-weight: normal; }
	h1 {
		color: #62467b;
		/*text-transform: uppercase;*/
		font-size: 4em;
    font-weight: 100;
    margin-bottom: 0;
    padding-bottom: 0.3em;
  }


	@media (min-width: 640px) {
		.logo {
			max-width: none;
		}
  }

  article, result {
    display: block;
    margin: 1em 0;
    margin-bottom: 1em;
    padding: 1em;
    background: #edf6f9;
  }
  article h4, result h4 {
    font-size: 24px;
    font-weight: normal;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  .mpad { padding: 0 4em }

  nav {
    max-width: 30vw;
    /* border-top: 1px solid #62467b;*/
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-left: auto;
    margin-right: auto;
  }
  nav a { color: #62467b; }
  nav a:visited { color: #62467b; }
  .search input {
    border: 1px solid #62467b;
    border-radius: 0px;
  }
  .pic img { height: 230px; }
  .pic {
    overflow: hidden;
    transition: height 0.5s;
    height: 255px;
  }
  .pic.hidden {
    height: 0;
  }
</style>

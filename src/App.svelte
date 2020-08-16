<script>
import { writable, derived, readable } from 'svelte/store'
import moment from 'moment'
import dbnc from 'debounce'
import prettyBytes from 'pretty-bytes'
import DriveCard from './components/DriveCard.svelte'
import DriveFloat from './components/DriveFloat.svelte'
export let db

const dbVersion = db.version
const aboutLut = db.about
const results = db.searchResults
const news = db.news
const dbUpdatedAt = db.updatedAt

const _loc = window.location.hash.replace(/#/, '')
const menuState = writable(_loc.length ? _loc : 'results')
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
  db.search(t)
}, [])

const sortAbout = writable('popularity')
const idxAbout = derived([aboutLut, sortAbout], ([$a, order], set) => {
  if (!$a) return set([])
  const drives = Object.values($a)
  drives.sort((a, b) => {
    switch (order) {
      case 'popularity':
        return b.peers - a.peers
      case 'activity':
        return b.updatedAt - a.updatedAt
      case 'size':
        return b.size - a.size
    }
  })
  set(drives)
}, [])

const resultsUsers = derived([tokens, aboutLut], ([tokens, aboutLut], set) => {
  if (!tokens.length) return set([])
  const matches = Object.values(aboutLut)
    .filter(info =>
      info.title && tokens.find(term => term.length > 3 && info.title.match(new RegExp(term, 'i')))
    )
  set(matches)
}, [])

const showTab = (section, ev) => {
  $menuState = section
}
</script>

<main>
  <header>
    Database v{$dbVersion} updated {moment($dbUpdatedAt).fromNow()}. <a href="{db.url}">{db.url}</a>
  </header>
  <section class="logo">
    <h1>hypé<sub>®</sub>dex</h1>
    <div class="pic {!$searchInput || !$searchInput.length ? '' : ' hidden'}">
      <div><img src="/index.jpg" alt="thick heavy phonebook"/></div>
      <small>
        <i title="It's lookups in a downloaded catalogue, your search history goes straight to the void">Offline search engine</i>
      </small>
    </div>
  </section>

  <section class="search">
    <input type="text" placeholder="search" bind:value={$searchInput}/>
  </section>
  <nav>
    <a href="#results" on:click={showTab.bind(null, 'results')}>Results</a>
    <a href="#news" on:click={showTab.bind(null, 'news')}>Updates</a>
    <a href="#discover" on:click={showTab.bind(null, 'discover')}>Discover</a>
    <a href="#about" on:click={showTab.bind(null, 'about')}>About</a>
  </nav>
  {#if $menuState === 'results'}
  <section class="results mpad">
    {#if !$results || !$results.length }
      <h2>Results</h2>
      <i>No results available, type 🐈 into the search box!</i>
    {:else}
      <h2><strong>{$results.length}</strong> results for <strong>{$tokens.join(', ')}</strong></h2>
      <section class="results-users">
        <bold>Users</bold>
        <div class="flex row">
          {#each $resultsUsers as drive}
            <DriveFloat db={db} key={drive.key} />
          {/each}
        </div>
      </section>
      {#each ($results) as res}
        <result>
        <sup title="ducks">
          🦆{Math.round(100 * res._score)/100}
          🎯 {res.hits.map(h => h.term).join(', ')}
        </sup>
        <DriveFloat db={db} key={res.key} />
        <samp><a href="{res.url}">{res.prettyUrl}</a></samp>
        <p>
        {#each res.hits as hit}
          <small>
            <time title="{new Date(hit.date).toString()}"
                  datetime="{new Date(hit.date).toString()}">
              🕑 {moment(hit.date).fromNow()}
            </time>
          </small>
            <p class="ellipsis">
            {#if hit.previewType === 'text'}
              {@html hit.preview}
            {:else if hit.previewType === 'image'}
              <img src="{hit.preview}" alt="preview"/>
            {/if}
          </p>
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
              Posted {moment(article.date).fromNow()}
            </time></small>
            <br/>
            <DriveFloat db={db} key={article.key} />
            <br/>
            <p class="ellipsis">
              {#if article.previewType === 'text'}
                {@html article.preview}
              {:else if article.previewType === 'image'}
                <img src="{article.preview}" alt="preview"/>
              {/if}
            </p>
            <samp><a href="{article.url}">{article.prettyUrl}</a></samp>
        </article>
      {/each}
    </section>
  {/if}

  {#if $menuState === 'discover'}
    <section class="mpad">
      <h2>Discover</h2>
      <div class="flex row space-between">
        <p>
        Listing <strong>{($idxAbout||[]).length}</strong> public drives containing a total of <strong>{prettyBytes(($idxAbout||[]).reduce((c, n) => c + n.size, 0))}</strong>
        </p>
        <div>
          Sort order:
          <button on:click={() => $sortAbout = 'popularity'}>Seeds</button>
          <button on:click={() => $sortAbout = 'activity'}>Recent Activity</button>
          <button on:click={() => $sortAbout = 'size'}>Drive size</button>
        </div>
      </div>
    </section>
    <section class="mpad flex row wrap">
      {#each ($idxAbout || []) as drive}
        <DriveCard info={drive} />
      {/each}
    </section>
  {/if}

  {#if $menuState === 'about'}
    <section class="about mpad">
      <h2>About hyperdex</h2>
      <ul>
        <li>Source code <a target="_new" href="https://github.com/telamon/hyperdex">hyperdex</a> (offline-webapp)</li>
        <li>Source code <a target="_new" href="https://github.com/telamon/hyperspace-indexer">hyperspace-indexer</a> (robot)</li>
        <li>
          <a target="_new" href="hyper://4effb70d142f4cec80f263bc870fcf28177af4ac7bca7f66bb72cd4cda45be50/"><strong>@telamohn</strong></a>
          ,
          <a target="_new" href="https://twitter.com/telamohn">(twitter)</a></li>
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
    then please open an <a href="https://github.com/telamon/hyperspace-indexer/issues">issue</a> and tell your friends
    to <a href="https://www.patreon.com/decentlabs">subscribe</a> to boost the R&amp;D.
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
  footer {
    text-align: center;
  }
  header {
    background-color: #03052d;
    color: #a680a9;
    padding: 4px 20px;
    text-align: right;
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

  h2 { font-weight: normal; font-size: 32px; }
	h1 {
		color: var(--purp);
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
  .pic img {
    height: 230px;
    border: 3px dotted #6b5c5c;
    border-radius: 11px
  }
  .pic {
    overflow: hidden;
    transition: height 0.5s;
    height: 260px;
  }
  .pic.hidden {
    height: 0;
  }
  .ellipsis {
    width: 450px;
    max-width: 450px;
    max-height: 350px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ellipsis h1, .ellipsis h2, .ellipsis h3, .ellipsis h4 {
    font-size: 12px;
    font-weight: bold;
  }
</style>

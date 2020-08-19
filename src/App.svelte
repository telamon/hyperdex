<script>
import { writable, derived, readable } from 'svelte/store'
import moment from 'moment'
import dbnc from 'debounce'
import prettyHash from 'pretty-hash'
import prettyBytes from 'pretty-bytes'
import DriveCard from './components/DriveCard.svelte'
import DriveFloat from './components/DriveFloat.svelte'
import NewsList from './components/NewsList.svelte'
import ResultsList from './components/ResultsList.svelte'
export let db

const dbVersion = db.version
const aboutLut = db.about
const dbUpdatedAt = db.updatedAt

const _loc = window.location.hash.replace(/#/, '')
const menuState = writable(_loc.length ? _loc : 'news')
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
// Workaround for having moved out search results into separate component
tokens.subscribe(() => { })

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

const showTab = (section, ev) => {
  $menuState = section
}
</script>

<main>
  <header>
    Database v{$dbVersion} updated {moment($dbUpdatedAt).fromNow()}.
    <a href="{db.url}">hyper://{prettyHash(new URL(db.url).host)}</a>
  </header>
  <section class="logo">
    <h1><span class="serif">hypé</span><sub>®</sub>dex</h1>
    <div class="pic {!$searchInput || !$searchInput.length ? '' : ' hidden'}">
      <div><img src="/index.jpg" alt="thick heavy phonebook"/></div>
      <small>
        <i title="Lookups performed on a downloaded catalogue, your search history goes straight to the void">Offline search engine</i>
      </small>
    </div>
  </section>

  <section class="search">
    <input id="primary-search" type="text" placeholder="search" bind:value={$searchInput}/>
  </section>
  <nav>
    <a href="#results" on:click={showTab.bind(null, 'results')}>Results</a>
    <a href="#news" on:click={showTab.bind(null, 'news')}>Updates</a>
    <a href="#discover" on:click={showTab.bind(null, 'discover')}>Discover</a>
    <a href="#about" on:click={showTab.bind(null, 'about')}>About</a>
  </nav>
  {#if $menuState === 'results'}
  <section class="results mpad">
    <ResultsList db={db} terms={tokens}/>
  </section>
  {/if}

  {#if $menuState === 'news'}
    <section class="mpad">
      <NewsList db={db}/>
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
          /
          <a target="_new" href="https://twitter.com/telamohn">twitter</a></li>
        <li>
          <a target="_new" href="hyper://3504e02af6b54117a66a5d628f80e3e4edc1697bdff6bed193d024e84a33ad88">@decentlabs</a>
          / <a target="_new" href="https://www.patreon.com/decentlabs">patreon</a>
        </li>
        <!--<li>hyper://decentlabs.se</li>-->
      </ul>
    </section>
    <result>
      <h2>Q&A</h2>
      <pre>
        ******
        Q: I don't want to be indexed
        A: Put an empty <span style="border: 1px solid #666;border-radius:4px;padding: 1px 5px;background-color: #eee">.nocrawl</span> file in the root of your hyperdrive.

        Q: Can I have dork-mode?
        A: <i>~Forget about it!~</i> Windows84-theme is canon, breathe it in.

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
    <p>2020 <span style="transform: rotate(149deg); display: inline-block">©</span> <a href="https://www.patreon.com/decentlabs">Decent Labs AB</a>. All wrongs reversed - <samp>Licensed GNU AGPLv3</samp></p>
  </footer>
</main>

<style>
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
</style>

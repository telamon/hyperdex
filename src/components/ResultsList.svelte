<script>

export let db;
export let terms;
import { derived } from 'svelte/store'
import moment from 'moment'
import DriveFloat from './DriveFloat.svelte'
import ProgressLoader from './ProgressLoader.svelte'

const { searchResults, searchProgress, about } = db
const resultsUsers = derived([terms, about], ([tokens, aboutLut], set) => {
  if (!tokens.length) return set([])
  const matches = Object.values(aboutLut)
    .filter(info =>
      info.title && tokens.find(term => term.length > 3 && info.title.match(new RegExp(term, 'i')))
    )
  set(matches)
}, [])


</script>
<search-results>
  {#if $searchProgress === 1 && (!$searchResults || !$searchResults.length) }
    <h2>Results</h2>
    <i>No results available, type 🐈 into the search box!</i>
  {:else if $searchProgress < 1}
    <ProgressLoader progress={searchProgress} title="Searching..."/>
  {:else}
    <h2><strong>{$searchResults.length}</strong> results for <strong>{$terms.join(', ')}</strong></h2>

    <section class="results-users">
      <bold>Users</bold>
      <div class="flex row">
        {#each $resultsUsers as drive}
          <DriveFloat db={db} key={drive.key} extras="peers"/>
        {/each}
      </div>
    </section>

    {#each ($searchResults) as res}
      <result>
      <DriveFloat db={db} key={res.key} extras="peers"/>
      <div class="content">
        <samp title="ducks">
          🦆{Math.round(100 * res._score)/100}
          🎯 {res.hits.map(h => h.term).join(', ')}
        </samp><br/>
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
      </div>
      </result>
    {/each}
  {/if}
</search-results>

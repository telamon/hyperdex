<script>
import { readable } from 'svelte/store'
export let key = null
export let db = null
export let extras = ''
const everything = extras === 'all'
extras = extras.split('|')
const showPeers = everything || !!extras.find(s => s === 'peers')
const showAdd = everything || !!extras.find(s => s === 'add')
//export let drive = null
// const info = drive ? readable(set => set(drive)) : db.driveInfo(key)
// const info = db.driveInfo(key)
const info = readable({
  thumbnail: null,
  title: 'loading...',
  description: 'loading...'
}, set => {
  db.fetchInfo(key).then(set)
})
</script>
<a class="drive-float flex row xcenter" href="hyper://{key}">
  <div class="thumbcontainer flex row center xcenter">
    <img class="thumb" src="{$info.thumbnail}" alt="thumb" />
  </div>
  <div class="flex column xstart">
    <h4>{$info.title}</h4>
    <description class="serif">{$info.description}</description>
  </div>

  <extras class="flex row-reverse xcenter" style="width: 100%; padding-right: 6px;">
  {#if showAdd}
    <button class="add-button"
            title="Add to address book"
            on:click|preventDefault={() => window.beaker.contacts.requestAddContact(`hyper://${key}`)}>
      +
    </button>
  {/if}
  {#if showPeers}
    <span title="peers">👥{$info.peers}</span>
  {/if}
  </extras>
</a>
<style>
  .thumbcontainer {
    width: 48px;
    height: 48px;
    margin-right: 1em;
  }
  .thumb {
    max-width: 48px;
    max-height: 48px;
    /*border-radius: 4px;*/
  }
  h4 {
    font-size: 20px;
    font-weight: normal;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 250px;
  }
  description {
    max-width: 250px;
    font-size: smaller;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .add-button {
    width: 24px;
    height: 24px;
    padding: 0;
    margin-left: 6px;
    margin-right: 4px;
    font-size: 24px;
    line-height: 16px;
    vertical-align: middle;
  }
  extras {
    vertical-align: middle;
    font-family: monospace;
    font-size: 14px;
    line-height: 14px;
  }
</style>

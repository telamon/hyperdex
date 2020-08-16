<script>
// import { readable } from 'svelte/store'
export let key = null
export let db = null
//export let drive = null
// const info = drive ? readable(set => set(drive)) : db.driveInfo(key)
const info = db.driveInfo(key)
</script>
<a class="drive-float flex row xcenter" href="hyper://{key}">
  <div class="thumbcontainer flex row center xcenter">
    <img class="thumb" src="{$info.thumbnail}" alt="thumb" />
  </div>
  <div class="flex column xstart">
    <h4>{$info.title}</h4>
    <description>{$info.description}</description>
  </div>
</a>
<style>
  .drive-float {
    /* background-color: var(--deep);
    color: #eee; */
    border: 1px solid var(--purp);
    border-radius: 2px;
    width: 320px;
  }
  .thumbcontainer {
    width: 48px;
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
    width: 250px;
  }
  description {
    width: 250px;
    font-size: smaller;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

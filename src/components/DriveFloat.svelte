<script>
export let key
export let db
const info = db.driveInfo(key)
</script>
<a class="flex row xcenter" href="hyper://{key}">
  <div class="thumbcontainer flex row center xcenter">
    <img class="thumb" src="{$info.thumbnail}" alt="thumb" />
  </div>
  <div class="flex column xstart">
    <h4>{$info.title}</h4>
    <description>{$info.description}</description>
  </div>
</a>
<style>
  .thumbcontainer {
    width: 48px;
    margin-right: 1em;
  }
  .thumb {
    max-width: 48px;
    max-height: 48px;
    border-radius: 4px;
  }
  h4 {
    font-size: 24px;
    margin: 0;
  }
  description {
    width: 250px;
    font-size: smaller;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

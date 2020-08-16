<script>
  import prettyBytes from 'pretty-bytes'
  import moment from 'moment'
  export let info
</script>
<drive-card>
  <small>
      <time
           title="{new Date(info.updatedAt).toString()}"
           datetime="{new Date(info.updatedAt).toString()}">
    Updated {moment(info.updatedAt).fromNow()}
      </time>
  </small>
  <div class="flex row xcenter">
    {#if info.thumbnail}
      <div class="thumbcontainer flex row center xcenter"><img class="thumbnail" src="{info.thumbnail}" alt="thumb"/></div>
    {/if}
    <h4><a href="hyper://{info.key}">{info.title}</a></h4>
  </div>
  <description>{info.description}</description>
  <samp>
    <span title="peers">👥{info.peers}</span>
    <span title="version">🕑{info.version}</span>
    <span title="file count">📁{info.files}</span>
    <span title="drive size">({prettyBytes(info.size)})</span>
  </samp>
</drive-card>
<style>
  drive-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 220px;
    /* border: 1px solid black; */
    border-radius: 1px;
    padding: 1em;
    margin: 0.5em;
    background-color: #ffffff;
    box-shadow: 1px 2px 5px rgba(0,0,0, 0.06);
  }
  h4 a, h4 a:visisted { color: red; text-decoration: none; }
  h4 {
    font-size: 24px;
    font-weight: 100;
  }
  .thumbcontainer {
    min-width: 75px;
    min-height: 75px;
    border-radius: 100%;
    border: 3px  solid #eee;
    overflow: hidden;
    margin-right: 1em;
  }
  .thumbnail {
    max-width: 75px;
    max-height: 75px;
  }
  description {
    max-height: 4em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

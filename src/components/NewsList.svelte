<script>
export let db
import { derived } from 'svelte/store'
import moment from 'moment'
import DriveFloat from './DriveFloat.svelte'
import Paginator from './Paginator.svelte'
import ProgressLoader from './ProgressLoader.svelte'

function emptyGroup (key = null) {
  return { key, date: 0, files: [], nImages: 0, nTexts: 0 }
}

const progress = db.newsProgress

const news = derived(db.news, (articles, set) => {
  if (!articles) return
  const groupedUpdates = []

  let drive = emptyGroup()
  for (const article of articles) {
    if (drive.key !== article.key) {
      if (drive.files.length) groupedUpdates.push(drive)
      drive = emptyGroup(article.key)
    }
    drive.date = Math.max(drive.date, article.date)
    switch (article.previewType) {
      case 'image':
        drive.nImages++
        break
      case 'text':
        drive.nTexts++
        break
    }
    drive.files.push(article)
  }
  if (drive.files.length) groupedUpdates.push(drive)
  set(groupedUpdates)
}, [])

</script>
<section class="news">
  <h2>Meanwhile in hyperspace</h2>
  <Paginator page={db.newsPage}/>
  {#if !news || !$news.length || $progress < 1}
    <ProgressLoader progress={progress}/>
  {/if}
  {#each $news as group (group.date)}
    <article>
      <DriveFloat db={db} key={group.key} extras="all"/>
      <div class="content">
        <samp>
          <time
            title="{new Date(group.date).toString()}"
            datetime="{new Date(group.date).toString()}">
            Published
            {#if group.files.length > 1}
              {group.files.length} change(s),
            {/if}
            {moment(group.date).fromNow()}
          </time>
        </samp><br/>
        {#each group.files as file}
          <file>
          {#if file.previewType === 'text'}
            <p class="ellipsis">{@html file.preview}</p>
          {:else if file.previewType === 'image' && group.nImages < 3 }
            <a href="{file.url}">
              <img src="{file.preview}"
                   alt="{file.url}"
                   class="imagePreview"/>
            </a>
          {/if}

          {#if !(file.previewType === 'image' && group.nImages >= 3)}
            <pre><a href="{file.url}">{file.prettyUrl}</a></pre>
          {/if}
          </file>
        {/each}

        <!-- conditional gallery if group contains more than 3 images. -->
        {#if group.nImages >= 3 }
          <thumb-gallery class="flex row wrap">
            {#each group.files as file}
              {#if file.previewType === 'image'}
                <a href="{file.url}">
                  <img src="{file.preview}" alt="{file.url}" class="imagePreview"/>
                </a>
              {/if}
            {/each}
          </thumb-gallery>
        {/if}
      </div>
    </article>
  {/each}
  <Paginator page={db.newsPage}/>
</section>
<style>
  article h4, result h4 {
    font-size: 24px;
    font-weight: normal;
    padding-bottom: 0;
    margin-bottom: 0;
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
  .imagePreview {
    max-width: 200px;
    max-height: 200px;
  }

  thumb-gallery img.imagePreview {
    max-width: 100px;
    max-height: 100px;
  }
</style>

<script>
  export let page
</script>
<paginator class="flex row space-between">
  <a href="/#" on:click|preventDefault={() => $page = Math.max($page-1, 0)}>
    &lt;-
  </a>
  {#each Array.from(new Array(10)).map((_, n) => n) as i}
    <a href="/#"
       class:current={$page === i}
       on:click|preventDefault={() => $page = i}>
       {i}
    </a>
  {/each}
  <a href="/#" on:click|preventDefault={() => $page = $page + 1}>
    -&gt;
  </a>
</paginator>
<style>
  paginator {
    max-width: 400px;
    margin: 1em auto;
  }
  paginator .current {
    color: var(--deep);
  }
</style>


<script>
  export let progress
export let title = 'Loading...'
</script>
<div class="flex column center xcenter" style="margin-bottom: 1em;">
  <h3 class="text-center serif">{title}{Math.round($progress * 100)}%</h3>
  <span class="loader">⌛</span>
  <progress max="1" value="{$progress}">{Math.round($progress * 100)}%</progress>
</div>

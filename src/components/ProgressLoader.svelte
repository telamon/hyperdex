<script>
  export let progress
export let title = 'Loading...'
</script>
<div class="flex column center xcenter" style="margin-bottom: 1em;">
  <span class="loader">⌛</span>
  <div><samp>{title} {Math.round($progress * 100)}%<samp></div>
  <progress max="1" value="{$progress}">{Math.round($progress * 100)}%</progress>
</div>

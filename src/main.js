import App from './App.svelte';
if (!beaker || !beaker.hyperdrive) {
  console.error(`Hyperdrive API's missing`)
  throw new Error('NotInHyperspace')
}

const app = new App({
	target: document.body,
	props: {
	}
});

export default app;

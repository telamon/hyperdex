import HyperdexDB from './db.js'

const DATABASE_URL = 'hyper://29a86f9275ccec8fdcf641fae006afb5b1883127264ee6818a916ca437f378f7'

const db = new HyperdexDB(DATABASE_URL)
import App from './App.svelte';
if (!beaker || !beaker.hyperdrive) {
  console.error(`Hyperdrive API's missing`)
  throw new Error('NotInHyperspace')
}

const app = new App({
	target: document.body,
	props: {
    db
	}
});

export default app;

import HyperdexDB from './db.js'

const DATABASE_URL = 'hyper://0b5dfb2a9f3f3bff79fe124d9519007b0b2838806b2abc161701d19c79a4e6d5'
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

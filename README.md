# RFO-JS API

Example Usage:

```ts
import { RFO } from 'rfo.js';

(async () => {
  const rfo = new RFO();

  await rfo.preprocessFlags();
  await rfo.findRoblox();
  await rfo.applyFlags();
})()
```
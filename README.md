# RFO-JS API

Example Usage:

```ts
import { RFO } from 'rfojs';

(async () => {
  const rfo = new RFO();

  await rfo.preprocessFlags();
  await rfo.findRoblox();
  await rfo.applyFlags();
})()
```
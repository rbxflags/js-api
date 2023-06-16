# RFO-JS API

## Documentation
[Here](https://js-api.rfo.sh/docs/classes/RFO.RFO.html)

## Example Usage

```ts
import { RFO } from 'rfo.js';

(async () => {
  const rfo = new RFO();

  await rfo.preprocessFlags();
  await rfo.findRoblox();
  await rfo.applyFlags();
})()
```
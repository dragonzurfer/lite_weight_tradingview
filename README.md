### Pre req
node 6+

npm 3+

## Installation

```
$ git clone <repo>
$ cd <repo>

$ npm install

$ npm start # this should launch a browser 
```

- This is not a production ready code. There are many unused variables and flaws in logic when it comes to re-populating data.

## Add a server_address.js file
- Define the address for your websocket server in WS_ADDRESS
- Defube th address for your data fetch POST api in DATA_ADDRESS

## Populating candle data
- fetchCandleData(symbol,from, to) is what fetches the candle data. It is called every 5mins(there are some flaws in logic here where the it over writes the panned data with 7days data)
- Within SymbolChartComponent we have the logic for handling the ticks coming from websocket server. Modify the subscribe and unsubscribe based on your websocket server logic
- Pan to load is handled in handleDownloadMore within the CandleStickChartPanToLoadMore
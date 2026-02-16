const http = require('http');

let token = '';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', 'Cookie': 'auth-token=' + token }
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  const res = await api('POST', '/api/auth/login', {username: process.env.AUTH_USERNAME || 'admin', password: process.env.AUTH_PASSWORD || 'admin'});
  if (res.token) {
    token = res.token;
    console.log('Login: OK');
  } else {
    console.log('Login: FAIL', res.message || '');
  }
}

async function main() {
  await login();

  // 1. Stock Holdings
  const stocks = [
    {symbol:'BEL',exchange:'NSE',shares:2,averageCost:414.9},
    {symbol:'ETERNAL',exchange:'NSE',shares:3,averageCost:271.15},
    {symbol:'KPITTECH',exchange:'NSE',shares:2,averageCost:1103},
    {symbol:'NIFTYBEES',exchange:'NSE',shares:3,averageCost:285.94},
    {symbol:'POWERGRID',exchange:'NSE',shares:6,averageCost:256.75},
    {symbol:'RELIANCE',exchange:'NSE',shares:1,averageCost:1382.5},
    {symbol:'MOTHERSON',exchange:'NSE',shares:5,averageCost:111.65},
    {symbol:'SUNPHARMA',exchange:'NSE',shares:1,averageCost:1623.2},
  ];
  const r1 = await api('POST', '/api/stocks', {items: stocks, replaceAll: true});
  console.log('Stocks:', r1.success ? 'OK (' + (r1.insertedCount||0) + ')' : JSON.stringify(r1));

  // 2. Stock Transactions
  const stockTxns = [
    {stockName:'YES BANK LIMITED',symbol:'YESBANK',isin:'INE528G01035',type:'BUY',quantity:8,value:144.24,exchange:'NSE',executionDate:'2025-05-06',orderStatus:'Executed'},
    {stockName:'YES BANK LIMITED',symbol:'YESBANK',isin:'INE528G01035',type:'SELL',quantity:8,value:161.2,exchange:'NSE',executionDate:'2025-07-04',orderStatus:'Executed'},
    {stockName:'RATTANINDIA POWER LIMITED',symbol:'RTNPOWER',isin:'INE399K01017',type:'BUY',quantity:53,value:787.05,exchange:'BSE',executionDate:'2025-07-04',orderStatus:'Executed'},
    {stockName:'RATTANINDIA POWER LIMITED',symbol:'RTNPOWER',isin:'INE399K01017',type:'SELL',quantity:53,value:781.22,exchange:'NSE',executionDate:'2025-07-04',orderStatus:'Executed'},
    {stockName:'NTPC LTD',symbol:'NTPC',isin:'INE733E01010',type:'SELL',quantity:1,value:332.15,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'PUNJAB NATIONAL BANK',symbol:'PNB',isin:'INE160A01022',type:'SELL',quantity:4,value:419.4,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'POWER GRID CORP. LTD.',symbol:'POWERGRID',isin:'INE752E01010',type:'SELL',quantity:2,value:573.4,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'ETERNAL LIMITED',symbol:'ETERNAL',isin:'INE758T01015',type:'SELL',quantity:4,value:1228,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'RELIANCE INDUSTRIES LTD',symbol:'RELIANCE',isin:'INE002A01018',type:'SELL',quantity:1,value:1411,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'HDFC GOLD ETF',symbol:'HDFCGOLD',isin:'INF179KC1981',type:'SELL',quantity:5,value:433.55,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'NIP IND ETF GOLD BEES',symbol:'GOLDBEES',isin:'INF204KB17I5',type:'SELL',quantity:6,value:501.36,exchange:'BSE',executionDate:'2025-08-05',orderStatus:'Executed'},
    {stockName:'KPIT TECHNOLOGIES LIMITED',symbol:'KPITTECH',isin:'INE04I401011',type:'BUY',quantity:2,value:2206,exchange:'NSE',executionDate:'2026-01-21',orderStatus:'Executed'},
    {stockName:'RELIANCE INDUSTRIES LTD',symbol:'RELIANCE',isin:'INE002A01018',type:'BUY',quantity:1,value:1382.5,exchange:'NSE',executionDate:'2026-01-21',orderStatus:'Executed'},
    {stockName:'SUN PHARMACEUTICAL IND L',symbol:'SUNPHARMA',isin:'INE044A01036',type:'BUY',quantity:1,value:1623.2,exchange:'NSE',executionDate:'2026-01-21',orderStatus:'Executed'},
    {stockName:'POWER GRID CORP. LTD.',symbol:'POWERGRID',isin:'INE752E01010',type:'BUY',quantity:3,value:769.5,exchange:'NSE',executionDate:'2026-01-21',orderStatus:'Executed'},
    {stockName:'ETERNAL LIMITED',symbol:'ETERNAL',isin:'INE758T01015',type:'BUY',quantity:3,value:813.45,exchange:'NSE',executionDate:'2026-01-21',orderStatus:'Executed'},
    {stockName:'BHARAT ELECTRONICS LTD',symbol:'BEL',isin:'INE263A01024',type:'BUY',quantity:2,value:829.8,exchange:'NSE',executionDate:'2026-01-22',orderStatus:'Executed'},
    {stockName:'POWER GRID CORP. LTD.',symbol:'POWERGRID',isin:'INE752E01010',type:'BUY',quantity:3,value:771,exchange:'BSE',executionDate:'2026-01-22',orderStatus:'Executed'},
    {stockName:'SAMVRDHNA MTHRSN INTL LTD',symbol:'MOTHERSON',isin:'INE775A01035',type:'BUY',quantity:5,value:558.25,exchange:'BSE',executionDate:'2026-01-22',orderStatus:'Executed'},
    {stockName:'NIP IND ETF NIFTY BEES',symbol:'NIFTYBEES',isin:'INF204KB14I2',type:'BUY',quantity:3,value:857.82,exchange:'BSE',executionDate:'2026-01-22',orderStatus:'Executed'},
  ];
  const r2 = await api('POST', '/api/stocks/transactions', {items: stockTxns, replaceAll: true});
  console.log('Stock Txns:', r2.success ? 'OK (' + (r2.insertedCount||0) + ')' : JSON.stringify(r2));

  // 3. MF Holdings
  const mfs = [
    {schemeName:'Bandhan Small Cap Fund Direct Growth',amc:'Bandhan Mutual Fund',category:'Equity',subCategory:'Small Cap',folioNumber:'8147838',source:'Groww',units:20.958,investedValue:999.95,currentValue:1055.38,returns:55.43},
    {schemeName:'Parag Parikh Flexi Cap Fund Direct Growth',amc:'PPFAS Mutual Fund',category:'Equity',subCategory:'Flexi Cap',folioNumber:'19122115',source:'Groww',units:32.199,investedValue:2999.83,currentValue:2964.43,returns:-35.40},
    {schemeName:'SBI Gold Direct Plan Growth',amc:'SBI Mutual Fund',category:'Commodities',subCategory:'Gold',folioNumber:'48381779',source:'Groww',units:21.264,investedValue:999.98,currentValue:991.23,returns:-8.76},
    {schemeName:'ICICI Prudential Short Term Fund Direct Plan Growth',amc:'ICICI Prudential Mutual Fund',category:'Debt',subCategory:'Short Duration',folioNumber:'42708261',source:'Groww',units:29.408,investedValue:1999.91,currentValue:2009.85,returns:9.94},
    {schemeName:'Navi Nifty 50 Index Fund Direct Growth',amc:'Navi Mutual Fund',category:'Equity',subCategory:'Large Cap',folioNumber:'9778718005',source:'Groww',units:90.904,investedValue:1499.93,currentValue:1518.1,returns:18.17},
    {schemeName:'HDFC Silver ETF FoF Direct Growth',amc:'HDFC Mutual Fund',category:'Commodities',subCategory:'Silver',folioNumber:'40041184',source:'Groww',units:22.759,investedValue:999.92,currentValue:913.77,returns:-86.15},
    {schemeName:'ICICI Prudential Gold ETF FoF Direct Growth',amc:'ICICI Prudential Mutual Fund',category:'Commodities',subCategory:'Gold',folioNumber:'42708261',source:'Groww',units:19.678,investedValue:999.96,currentValue:959.4,returns:-40.56},
  ];
  const r3 = await api('POST', '/api/mutual-funds', {items: mfs, replaceAll: true});
  console.log('MF Holdings:', r3.success ? 'OK (' + (r3.insertedCount||0) + ')' : JSON.stringify(r3));

  // 4. MF Transactions
  const mfTxns = [
    {schemeName:'SBI Gold Direct Plan Growth',transactionType:'PURCHASE',units:11.19,nav:44.69,amount:499,date:'2026-02-02'},
    {schemeName:'HDFC Silver ETF FoF Direct Growth',transactionType:'PURCHASE',units:13.46,nav:37.15,amount:499,date:'2026-02-02'},
    {schemeName:'ICICI Prudential Gold ETF FoF Direct Growth',transactionType:'PURCHASE',units:19.68,nav:50.82,amount:999,date:'2026-01-27'},
    {schemeName:'Parag Parikh Flexi Cap Fund Direct Growth',transactionType:'PURCHASE',units:32.2,nav:93.17,amount:2999,date:'2026-01-27'},
    {schemeName:'ICICI Prudential Short Term Fund Direct Plan Growth',transactionType:'PURCHASE',units:29.41,nav:68.01,amount:1999,date:'2026-01-27'},
    {schemeName:'Navi Nifty 50 Index Fund Direct Growth',transactionType:'PURCHASE',units:90.9,nav:16.5,amount:1499,date:'2026-01-27'},
    {schemeName:'Bandhan Small Cap Fund Direct Growth',transactionType:'PURCHASE',units:20.96,nav:47.71,amount:999,date:'2026-01-23'},
    {schemeName:'SBI Gold Direct Plan Growth',transactionType:'PURCHASE',units:10.08,nav:49.62,amount:499,date:'2026-01-21'},
    {schemeName:'HDFC Silver ETF FoF Direct Growth',transactionType:'PURCHASE',units:9.3,nav:53.75,amount:499,date:'2026-01-21'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'REDEEM',units:53.07,nav:31.91,amount:1693,date:'2025-08-05'},
    {schemeName:'HDFC Gold ETF Fund of Fund Direct Plan Growth',transactionType:'REDEEM',units:101.87,nav:31.51,amount:3209,date:'2025-08-05'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'REDEEM',units:47.09,nav:31.86,amount:1500,date:'2025-08-04'},
    {schemeName:'HDFC Gold ETF Fund of Fund Direct Plan Growth',transactionType:'PURCHASE',units:16.14,nav:30.98,amount:499,date:'2025-07-25'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'PURCHASE',units:15.92,nav:31.41,amount:499,date:'2025-07-21'},
    {schemeName:'HDFC Gold ETF Fund of Fund Direct Plan Growth',transactionType:'PURCHASE',units:16.34,nav:30.61,amount:499,date:'2025-06-25'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'PURCHASE',units:15.84,nav:31.57,amount:499,date:'2025-06-23'},
    {schemeName:'HDFC Gold ETF Fund of Fund Direct Plan Growth',transactionType:'PURCHASE',units:16.58,nav:30.15,amount:499,date:'2025-05-26'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'PURCHASE',units:16.41,nav:30.48,amount:499,date:'2025-05-21'},
    {schemeName:'HDFC Gold ETF Fund of Fund Direct Plan Growth',transactionType:'PURCHASE',units:16.56,nav:30.2,amount:499,date:'2025-04-25'},
    {schemeName:'Axis Gold Direct Plan Growth',transactionType:'PURCHASE',units:16.09,nav:31.07,amount:499,date:'2025-04-21'},
  ];
  const r4 = await api('POST', '/api/mutual-funds/transactions', {items: mfTxns, replaceAll: true});
  console.log('MF Txns:', r4.success ? 'OK (' + (r4.insertedCount||0) + ')' : JSON.stringify(r4));

  // 5. SIPs (user-confirmed active SIPs)
  const sips = [
    {name:'Navi Nifty 50 Index Fund Direct Growth',provider:'Groww',monthlyAmount:4000,startDate:'2026-01-27',status:'active'},
    {name:'ICICI Prudential Gold ETF FoF Direct Growth',provider:'Groww',monthlyAmount:1000,startDate:'2026-01-27',status:'active'},
    {name:'ICICI Prudential Short Term Fund Direct Plan Growth',provider:'Groww',monthlyAmount:2000,startDate:'2026-01-27',status:'active'},
    {name:'Parag Parikh Flexi Cap Fund Direct Growth',provider:'Groww',monthlyAmount:3000,startDate:'2026-01-27',status:'active'},
  ];
  const r5 = await api('POST', '/api/sips', {items: sips, replaceAll: true});
  console.log('SIPs:', r5.success ? 'OK (' + (r5.insertedCount||0) + ')' : JSON.stringify(r5));

  console.log('\n=== IMPORT COMPLETE ===');
}
main().catch(e => console.error(e));

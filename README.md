# blockDataRecorderについて  
blockDataRecorderは、[web3js](https://github.com/web3/web3.js)を利用して[Geth](https://geth.ethereum.org/)からソケットイベントを受信し、
このイベントと共に受信したブロック情報を[node-mysql2](https://github.com/sidorares/node-mysql2)を利用してMySQLデータベースに記録します。  

**ソースコード**
- メイン：[blockDataRecorder.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/blockDataRecorder.ts)
- 外部関数：[getLatestBlockNumberOnDb.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/externalFunctions/getLatestBlockNumberOnDb.ts)
- 外部関数：[sendBlockInfoFromGethToDb.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/externalFunctions/sendBlockInfoFromGethToDb.ts)  

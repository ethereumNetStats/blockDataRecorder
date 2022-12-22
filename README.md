# blockDataRecorderについて  
blockDataRecorderは、[web3js](https://github.com/web3/web3.js)を利用して[Geth](https://github.com/ethereum/go-ethereum)にアクセスし、
イーサリアムネットワークのブロック情報をMySQLデータベースに記録します。  

# 使い方
以下では、ubuntu server v22.04での使用例を説明します。  
ただし、下記説明の通りに作業をしてもGethが最新の状態に同期するには少なくとも２〜３週間以上かかります。  
また、ストレージについても最低でも2TBをSSDで用意する必要があります。  
プログラムの内容のみを知りたい場合はソースコードを参照ください。  

**ソースコード**
- [blockDataRecorder.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/blockDataRecorder.ts)
- [getLatestBlockNumberOnDb.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/externalFunctions/getLatestBlockNumberOnDb.ts)
- [sendBlockInfoFromGethToDb.ts](https://github.com/ethereumNetStats/blockDataRecorder/blob/main/externalFunctions/sendBlockInfoFromGethToDb.ts)

## Dockerのインストール
まず、下記コマンドを実行してDockerをインストールして下さい。  
```shell
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt update
sudo apt install docker-ce
```

## [Geth](https://github.com/ethereum/go-ethereum)を使用するための準備
下記コマンドでホームディレクトリ内にディレクトリを２つ用意して下さい。
```shell
mkdir ethereum
mkdir eth2
```
次に`eth2`ディレクトリに移動して下記コマンドでGethとPrysmの認証に使う`jwt.hex`を作成して下さい。
```shell
cd ./eth2
openssl rand -hex 32 | tr -d "\n" > "jwt.hex"
```
次に下記コマンドでGeth及びPrysmのコンテナを起動して下さい。  
また、下記コマンドではホームディレクトリの指定に環境変数`$HOME`を使用していますが上手くいかない場合は絶対パスを使用してみて下さい。  
Geth  
```shell
sudo docker run -d -m 24g --stop-timeout 600 --name ethereum-node -v $HOME/ethereum:/root/.ethereum -v $HOME/eth2/jwt.hex:/jwt.hex -p 8545:8545 -p 8546:8546 -p 30303:30303 -p 8551:8551 ethereum/client-go:stable --syncmode full --http --http.api "eth,net,web3,personal,engine,admin" --http.addr "0.0.0.0" --maxpeers 128 --cache 4096 --snapshot=false --txlookuplimit=0 --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,personal,admin" --authrpc.addr "0.0.0.0" --authrpc.jwtsecret /jwt.hex --txpool.globalslots 250000 --txpool.globalqueue 50000
```
Prysm  
```shell
sudo docker run -itd -v $HOME/eth2:/data -v $HOME/eth2/jwt.hex:/jwt.hex -p 4000:4000 -p 13000:13000 -p 12000:12000/udp --name beacon-node gcr.io/prysmaticlabs/prysm/beacon-chain:stable --accept-terms-of-use=true --datadir=/data --jwt-secret=/jwt.hex --rpc-host=0.0.0.0 --grpc-gateway-host=0.0.0.0 --monitoring-host=0.0.0.0 --execution-endpoint=http://192.168.1.10:8551
```
以上の手順を実行すると、GethがPrysmと連携してイーサリアムネットワークとの同期が始まります。

## MySQLデータベースの準備
下記コマンドでMySQLのコンテナを起動して下さい。なお、MySQLのオプションでは任意のパスワードを設定して下さい。  
```shell
sudo docker run --name mysql -p 3308:3306 -v $HOME/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:8.0.27
```

MySQLのコンテナが起動したら下記クエリを実行して`ethereum`データベースを作成します。
```mysql
CREATE DATABASE ethereum;
```
データ記録用のテーブルを作成して下さい。
```mysql
CREATE TABLE `ethereum.blockData` (
  `number` int NOT NULL,
  `hash` varchar(66) NOT NULL,
  `parentHash` varchar(66) DEFAULT NULL,
  `baseFeePerGas` bigint DEFAULT NULL,
  `nonce` varchar(18) DEFAULT NULL,
  `sha3Uncles` varchar(66) DEFAULT NULL,
  `logsBloom` varchar(514) DEFAULT NULL,
  `transactionsRoot` varchar(66) DEFAULT NULL,
  `stateRoot` varchar(66) DEFAULT NULL,
  `miner` text,
  `difficulty` text,
  `totalDifficulty` text,
  `extraData` text,
  `size` int DEFAULT NULL,
  `gasLimit` int DEFAULT NULL,
  `gasUsed` int DEFAULT NULL,
  `timestamp` int NOT NULL,
  `transactions` longtext,
  `uncles` longtext,
  `mixHash` varchar(66) DEFAULT NULL,
  `receiptsRoot` varchar(66) DEFAULT NULL,
  `timestampReadable` datetime NOT NULL,
  PRIMARY KEY (`hash`),
  KEY `blockDataTest_number_index` (`number`),
  KEY `blockDataTest_timestamp_index` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```
これでソースコードを実行する準備が整いました。  

## ソースコードの実行
まずこのレポジトリを`clone`します。  
```shell
git clone https://github.com/ethereumNetStats/blockDataRecorder.git
```
クローンしたディレクトリ内にある`.envSample`ファイルの`MYSQL_USER`と`MYSQL_PASS`を編集します。  
上記手順の通りにMySQLコンテナを立ち上げた場合は`MYSQL_USER=root`、`MYSQL_PASS`は起動時に指定したパスワードになります。  
`.envSample`
```
GETH_LAN_HTTP_API_ADDRESS=http://127.0.0.1:8545
GETH_LAN_SOCKET_API_ADDRESS=ws://127.0.0.1:8546

MYSQL_LAN_ADDRESS=127.0.0.1
MYSQL_PORT=3308
MYSQL_USER=******
MYSQL_PASS=******

SOCKET_SERVER_ADDRESS=ws://127.0.0.1:6000
```
`.envSample`の編集が終わったらファイル名を`.env`にリネームして下さい。  
```shell
mv ./.envSample ./.env 
```
`.env`の編集が終わったらTypescriptソースを下記コマンドでコンパイルします。
```shell
tsc --project tsconfig.json
```
コンパイルが終わったらDockerイメージをビルドしてコンテナを起動するためにシェルスクリプト`buildAndRunDockerImage.sh`に実行権限を付与します。
```shell
chmod 755 ./buildAndRunDockerImage.sh
```
最後にシェルスクリプトを実行してDockerコンテナを起動します。
```shell
sudo ./buildAndRunDockerImage.sh
```

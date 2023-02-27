// パッケージのインポート
import { io } from 'socket.io-client'

// 自作パッケージのインポート
import { gethDockerSocketClient } from '@ethereum_net_stats/get_geth_connections'
import { currentTimeReadable } from '@ethereum_net_stats/readable_time'
import { getLatestBlockNumberOnDb } from './externalFunctions/getLatestBlockNumberOnDb.js'
import { sendBlockInfoFromGethToDb } from './externalFunctions/sendBlockInfoFromGethToDb.js'

// 型定義のインポート
import type { BlockHeader } from 'web3-eth'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents } from './types/socketEvents'
import type { blockNumberWithTimestamp } from './types/types'

// socket.io-clientの定義
const socketClientName: string = 'blockDataRecorder'
const socketClient: Socket<ClientToServerEvents> = io(
  `${process.env.SOCKET_SERVER_DOCKER_ADDRESS}`,
  {
    forceNew: true,
    query: { name: socketClientName },
  },
)

// ソケットサーバーに接続した時の処理
socketClient.on('connect', () => {
  console.log(`${currentTimeReadable()} | Connect : socketServer.`)
})

// データベース上の最新のブロックナンバーを取得
const tableName: string = 'ethereum.blockData'
let latestBlockNumberOnDb: number = await getLatestBlockNumberOnDb(tableName)

// データの記録処理中か否かを示すフラグ
let isRecording: boolean = false

// GethのソケットAPIの"newBlockHeaders"イベントをリスニングする
console.log(
  `${currentTimeReadable()} | Subscribe : "newBlockHeaders" to the Geth.`,
)
gethDockerSocketClient
  .subscribe('newBlockHeaders', async (err: Error, res: BlockHeader) => {
    // "newBlockHeaders"イベントを受信したらブロックナンバーを表示
    console.log(
      `${currentTimeReadable()} | Receive : 'newBlockHeaders' | Block number : ${
        res.number
      }`,
    )

    //　データ記録中でなければ、記録処理を開始
    if (!isRecording) {
      // データの記録中を示すようにフラグを書き換え
      isRecording = true

      //"newBlockHeaders"イベントを受信したときに取得するGethの最新ブロックナンバーを代入
      let latestBlockNumberOnGeth: number = res.number

      //Gethの最新ブロックナンバーがデータベースの最新ブロックナンバーよりも進んでいたら記録処理を開始
      if (latestBlockNumberOnGeth - latestBlockNumberOnDb > 0) {
        console.log(
          `${currentTimeReadable()} | The latest block number on the DB : ${latestBlockNumberOnDb} | The latest block number on the Geth : ${latestBlockNumberOnGeth}`,
        )

        // 記録を開始するブロックナンバーを代入
        let initialBlockNumber: number = ++latestBlockNumberOnDb

        console.log(
          `${currentTimeReadable()} | Block number to record block info : ${initialBlockNumber} - ${latestBlockNumberOnGeth}`,
        )

        // データベースの記録がGethの最新ブロックに追いつくまでforループを実行
        for (
          let i = 0;
          i <= latestBlockNumberOnGeth - latestBlockNumberOnDb;
          i++
        ) {
          // Gethからデータベースにブロックデータを転送する関数の呼び出し
          let blockNumberWithTimestamp: blockNumberWithTimestamp =
            await sendBlockInfoFromGethToDb(initialBlockNumber + i, tableName)

          // データ転送が終わったらブロック番号をインクリメント
          latestBlockNumberOnDb = initialBlockNumber + i

          // ソケットサーバーにイベントとデータを送信
          socketClient.emit('newBlockDataRecorded', blockNumberWithTimestamp)
          console.log(
            `${currentTimeReadable()} | Emit : 'newBlockDataRecorded' | To : socketServer`,
          )
        }
      } else {
        console.log(
          `${currentTimeReadable()} | No data : There is no data for recording this time.`,
        )
      }

      // データの記録処理が終了したらフラグを元に戻す
      isRecording = false
    } else {
      // データの記録処理が進行中の場合はイベント受信を無視する
      console.log(
        `${currentTimeReadable()} | Ignore : The recording is currently running. This event emitting is ignored.`,
      )
    }
  })
  .on('error', (err) => {
    console.error(err)
    process.exit(1)
  })

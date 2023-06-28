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

// socket.io-clientのインスタンス生成
const socketClientName: string = 'blockDataRecorder'
const socketClient: Socket<ClientToServerEvents> = io(`${process.env.SOCKET_SERVER_ADDRESS}`, {
  forceNew: true,
  query: { name: socketClientName, attribute: 'blockDataRecorder' },
})

// ソケットサーバーに接続した時の処理
socketClient.on('connect', () => {
  console.log(`${currentTimeReadable()} | Connect : socketServer.`)
})

// データベース上の最新のブロックナンバーを取得
const tableName: string = 'ethereum.blockData'

// データの記録処理中か否かを示すフラグ
let isRecording: boolean = false

// GethのソケットAPIの"newBlockHeaders"イベントをリスニングする
console.log(`${currentTimeReadable()} | Subscribe : "newBlockHeaders" to the Geth.`)
gethDockerSocketClient
  .subscribe('newBlockHeaders', async (err: Error, res: BlockHeader) => {
    // "newBlockHeaders"イベントを受信したらブロックナンバーを表示
    console.log(
      `${currentTimeReadable()} | Receive : 'newBlockHeaders' | Block number : ${res.number}`,
    )
    // データの記録処理中でなければ記録処理を開始
    if (!isRecording) {
      // データの記録処理中であることを示すフラグを立てる
      isRecording = true
      // データベース上の最新のブロックナンバーを取得
      let latestBlockNumberOnDb: number = await getLatestBlockNumberOnDb(tableName)
      // データベース上の最新のブロックナンバーとGethから受信したブロックナンバーの差分を取得
      let blockNumberDifference: number = res.number - latestBlockNumberOnDb
      // 記録結果を格納する変数宣言
      let blockNumberWithTimestamp: blockNumberWithTimestamp
      // データベース上の最新のブロックナンバーとGethから受信したブロックナンバーの差分が1以上の場合
      // データを記録する
      if (blockNumberDifference >= 1) {
        for (let i = latestBlockNumberOnDb + 1; i <= res.number; i++) {
          //   ブロックデータをデータベースに記録
          blockNumberWithTimestamp = await sendBlockInfoFromGethToDb(i, tableName)
          //   ブロックデータをソケットサーバーに送信
          socketClient.emit('newBlockDataRecorded', blockNumberWithTimestamp)
        }
      } else {
        //  データベース上の最新のブロックナンバーとGethから受信したブロックナンバーの差分が0の場合
        //  そのことを表示
        console.log(`${currentTimeReadable()} | No new block.`)
      }
      // データの記録処理中であることを示すフラグを下ろす
      isRecording = false
    } else {
      console.log(
        `${currentTimeReadable()} | Ignore : The recording is currently running. This event emitting is ignored.`,
      )
    }
  })
  .on('error', (err) => {
    console.error(err)
    process.exit(1)
  })

// ソケットサーバーに送信するデータの型定義のインポート
import { blockNumberWithTimestamp } from './types'

//ソケットクライアントからソケットサーバーへのイベント名と送信データの型定義
type ClientToServerEvents = {
  newBlockDataRecorded: (
    blockNumberWithTimestamp: blockNumberWithTimestamp,
  ) => void
}

export type { ClientToServerEvents }

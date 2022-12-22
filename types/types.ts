// web3jsの型定義のインポート
import type {Block} from "web3-eth";

// 関数"sendBlockInfoFromGethToDb"の戻り値の型定義
type blockNumberWithTimestamp = {
    blockNumber: number | undefined,
    timestamp: number | undefined,
}

// データベースに記録するデータ型の定義
type recordData = Block & {
    timestampReadable: string,
}

export type {blockNumberWithTimestamp, recordData, Block}

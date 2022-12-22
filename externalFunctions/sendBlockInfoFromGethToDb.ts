// 自作パッケージのインポート
import {gethHttpClient} from "@ethereum_net_stats/get_geth_connections";
import {getMysqlConnection} from "@ethereum_net_stats/get_mysql_connection";
import {currentTimeReadable, unixTimeReadable} from "@ethereum_net_stats/readable_time";

// 型定義のインポート
import type {blockNumberWithTimestamp, recordData} from "../types/types";
import type {Pool} from "@ethereum_net_stats/get_mysql_connection";
import type {BlockTransactionString} from "web3-eth";

// データベースへのプールコネクションを確率
const pool: Pool = await getMysqlConnection(false);

// 関数"sendBlockInfoFromGethToDb"の宣言
export const sendBlockInfoFromGethToDb = async (blockNumber: number, tableName: string): Promise<blockNumberWithTimestamp> => {

    // Gethからのレスポンスを格納する変数
    let gethRes: BlockTransactionString;

    // データベースに書き込むデータを格納する変数
    let recordData: recordData;

    // 関数の戻り値を格納する変数
    let blockNumberWithTimestamp: blockNumberWithTimestamp;

    // 指定したブロックナンバーの情報をGethから取得する
    try {
        gethRes = await gethHttpClient.getBlock(blockNumber);

        // 指定したブロックにトランザクションデータがない場合、空文字列を要素として代入
        // トランザクションデータがある場合は、全て文字列に変換して代入
        if (gethRes.transactions.length === 0) {
            gethRes.transactions = [''];
        } else {
            gethRes.transactions = [gethRes.transactions.toString()];
        }

        // 指定ブロックのアンクルブロックがない場合、空文字列を要素として代入
        // アンクルブロックがある場合、全て文字列に変換して代入
        if (gethRes.uncles.length === 0) {
            gethRes.uncles = [''];
        } else {
            gethRes.uncles = [gethRes.uncles.toString()];
        }

        // Gethから得られたデータに読みやすくしたタイムスタンプを付加してSQLクエリ用のオブジェクトを生成
        recordData = {...gethRes, timestampReadable: unixTimeReadable(Number(gethRes.timestamp))};

        // データベースにレコードを記録
        await pool.query(`INSERT INTO ${tableName} SET ?`, recordData);
        console.log(`${currentTimeReadable()} | Insert : Block info | Block number : ${blockNumber} | Datetime : ${unixTimeReadable(Number(gethRes.timestamp))}`);

        // 記録したブロックデータの番号とunixTimestampを戻り値として代入
        blockNumberWithTimestamp = {blockNumber: blockNumber, timestamp: Number(recordData.timestamp)};

        return blockNumberWithTimestamp;

    } catch (e) {
        console.log(e);

        // Gethに指定番号のブロックデータがなくてエラーが帰ってきた場合は、undefinedのプロパティを持つ戻り値を代入
        blockNumberWithTimestamp = {blockNumber: undefined, timestamp: undefined};
        return blockNumberWithTimestamp;
    }
}

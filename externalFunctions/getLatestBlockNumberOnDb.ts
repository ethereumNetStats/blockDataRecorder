// パッケージのインポート
import {performance} from 'perf_hooks';

// 自作パッケージのインポート
import {currentTimeReadable} from "@ethereum_net_stats/readable_time";
import {getMysqlConnection} from "@ethereum_net_stats/get_mysql_connection";

// 型定義のインポート
import type {Pool, RowDataPacket} from "@ethereum_net_stats/get_mysql_connection";

// MySQLとのプールコネクションを生成
const pool: Pool = await getMysqlConnection(false);

// 関数"getLatestBlockNumberOnDb"の宣言
export const getLatestBlockNumberOnDb = async (tableName: string): Promise<number> => {
    console.log(`${currentTimeReadable()} | Start : Detecting the latest block number on the DB`);

    // SQLクエリの処理時間の計測開始
    let startTime = performance.now();

    // データベースに記録されている最新のブロック番号を確認
    let [queryResult] = await pool.query<RowDataPacket[]>(`SELECT number from ${tableName} ORDER BY number DESC LIMIT 1`);

    // SQLクエリの処理時間の計測終了
    let endTime = performance.now();

    // データベースが空の場合、0を返す
    if (queryResult.length === 0) {
        console.log(`${currentTimeReadable()} | End : Detecting the latest block number on the DB | The DB is empty | Process time : ${((endTime - startTime) / 1000).toString().slice(0, -12)} sec`);
        return 0;
    } else {
        // データベースから最新のブロック番号が得られた場合、戻り値とする
        console.log(`${currentTimeReadable()} | End : Detecting the latest block number on the DB | Block number : ${queryResult[0].number} | Process time : ${((endTime - startTime) / 1000).toString().slice(0, -12)} sec`);
        return queryResult[0].number;
    }
}

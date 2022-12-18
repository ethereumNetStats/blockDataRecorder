import {performance} from 'perf_hooks';
import {currentTimeReadable} from "@pierogi.dev/readable_time";
import {getMysqlConnection} from "@pierogi.dev/get_mysql_connection";

import type {Pool, RowDataPacket} from "@pierogi.dev/get_mysql_connection";

const pool: Pool = await getMysqlConnection(false);

export const getLatestBlockNumberOnDb = async (tableName: string): Promise<number> => {
    console.log(`${currentTimeReadable()} | Start : Detecting the latest block number on the DB`);
    let startTime = performance.now();
    let [queryResult] = await pool.query<RowDataPacket[]>(`SELECT number from ${tableName} ORDER BY number DESC LIMIT 1`);
    let endTime = performance.now();
    if (queryResult.length === 0) {
        console.log(`${currentTimeReadable()} | End : Detecting the latest block number on the DB | The DB is empty | Process time : ${((endTime - startTime) / 1000).toString().slice(0, -12)} sec`);
        return 0;
    } else {
        console.log(`${currentTimeReadable()} | End : Detecting the latest block number on the DB | Block number : ${queryResult[0].number} | Process time : ${((endTime - startTime) / 1000).toString().slice(0, -12)} sec`);
        return queryResult[0].number;
    }
}

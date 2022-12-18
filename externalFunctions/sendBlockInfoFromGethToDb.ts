import {gethHttpClient} from "@pierogi.dev/get_geth_connections";
import {getMysqlConnection} from "@pierogi.dev/get_mysql_connection";
import {currentTimeReadable, unixTimeReadable} from "@pierogi.dev/readable_time";

import type {blockNumberWithTimestamp, extendBlock} from "../types/types";
import type {Pool} from "@pierogi.dev/get_mysql_connection";
import {BlockTransactionString} from "web3-eth";

const pool: Pool = await getMysqlConnection(false);

export const sendBlockInfoFromGethToDb = async (blockNumber: number, tableName: string): Promise<{blockNumber: number | undefined, timestamp: number | undefined}> => {

    let gethRes: BlockTransactionString;
    let recordData: extendBlock;
    let blockNumberWithTimestamp: blockNumberWithTimestamp;

    //Try getting a block information of the given block number.
    try {
        gethRes = await gethHttpClient.getBlock(blockNumber);

        //If there are no transactions in the block information, an empty string element is inserted;
        //if there are transactions, all transactions are registered in the string.
        if (gethRes.transactions.length === 0) {
            gethRes.transactions = [''];
        } else {
            gethRes.transactions = [gethRes.transactions.toString()];
        }

        //The same process as above is performed for the uncle block.
        if (gethRes.uncles.length === 0) {
            gethRes.uncles = [''];
        } else {
            gethRes.uncles = [gethRes.uncles.toString()];
        }

        //Prepare an object for an insert query.
        recordData = {...gethRes, timestampReadable: unixTimeReadable(Number(gethRes.timestamp))};

        await pool.query(`INSERT INTO ${tableName} SET ?`, recordData);
        console.log(`${currentTimeReadable()} | Insert : Block info | Block number : ${blockNumber} | Datetime : ${unixTimeReadable(Number(gethRes.timestamp))}`);

        //Return a block number and a timestamp of the recording data.
        blockNumberWithTimestamp = {blockNumber: blockNumber, timestamp: Number(recordData.timestamp)};

        return blockNumberWithTimestamp;

    } catch (e) {

        //Return an object that has undefined properties when the geth returned an error.
        console.log(e);
        blockNumberWithTimestamp = {blockNumber: undefined, timestamp: undefined};
        return blockNumberWithTimestamp;
    }
}

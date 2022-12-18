//Import packages.
import {io} from "socket.io-client";

//Import self-made packages.
import {gethSocketClient} from "@pierogi.dev/get_geth_connections";
import {currentTimeReadable} from "@pierogi.dev/readable_time";
import {getLatestBlockNumberOnDb} from "./externalFunctions/getLatestBlockNumberOnDb.js";
import {sendBlockInfoFromGethToDb} from "./externalFunctions/sendBlockInfoFromGethToDb.js";

//Import types.
import type {BlockHeader} from "web3-eth";
import type {Socket} from "socket.io-client";
import type {ClientToServerEvents} from "./types/socketEvents";

//
//socket.io
//
const socketClientName: string = "blockDataRecorder";

const socketClient: Socket<ClientToServerEvents> = io(`${process.env.SOCKET_SERVER_ADDRESS}`, {
    forceNew: true,
    query: {name: socketClientName}
});

socketClient.on('connect', () => {
    console.log(`${currentTimeReadable()} | Connect : socketServer.`);
});

//
//Get the latest block number from the DB.
//
const tableName: string = "blockData";
let latestBlockNumberOnDb: number = await getLatestBlockNumberOnDb(tableName);

let isRecording: boolean = false;

//
//Registering the geth socket event listener.
//
console.log(`${currentTimeReadable()} | Subscribe : "newBlockHeaders" to the Geth.`);
gethSocketClient.subscribe("newBlockHeaders", async (err: Error, res: BlockHeader) => {
    console.log(`${currentTimeReadable()} | Receive : 'newBlockHeaders' | Block number : ${res.number}`);

    if (!isRecording) {

        isRecording = true;

        //
        //Get the latest block number on the Geth.
        //
        let latestBlockNumberOnGeth = res.number;

        //
        //When the latest block number in Geth is ahead of the latest block number in DB, the missing record is recorded from Geth to DB.
        //
        if (latestBlockNumberOnGeth - latestBlockNumberOnDb > 0) {

            console.log(`${currentTimeReadable()} | The latest block number on the DB : ${latestBlockNumberOnDb} | The latest block number on the Geth : ${latestBlockNumberOnGeth}`);

            let initialBlockNumber: number = ++latestBlockNumberOnDb;

            console.log(`${currentTimeReadable()} | Block number to record block info : ${initialBlockNumber} - ${latestBlockNumberOnGeth}`);

            for (let i = 0; i <= latestBlockNumberOnGeth - latestBlockNumberOnDb; i++) {

                let blockNumberWithTimestamp = await sendBlockInfoFromGethToDb(initialBlockNumber + i, tableName);
                latestBlockNumberOnDb = initialBlockNumber + i;
                socketClient.emit('newBlockDataRecorded', blockNumberWithTimestamp);
                console.log(`${currentTimeReadable()} | Emit : 'newBlockDataRecorded' | To : socketServer`);

            }

        } else {

            console.log(`${currentTimeReadable()} | No data : There is no data for recording this time.`);

        }

        isRecording = false;

    } else {

        console.log(`${currentTimeReadable()} | Ignore : The recording is currently running. This event emitting is ignored.`);

    }

})
    .on("error", (err) => {
        console.error(err);
        process.exit(1);
    });

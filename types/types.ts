import {Block} from "web3-eth";

type blockNumberWithTimestamp = {
    blockNumber: number | undefined,
    timestamp: number | undefined,
}

type extendBlock = Block & {
    timestampReadable: string,
}

export type {blockNumberWithTimestamp, extendBlock, Block}

import {blockNumberWithTimestamp} from "./types";

//Define the type of the client => server events.
type ClientToServerEvents = {
    newBlockDataRecorded: (blockNumberWithTimestamp: blockNumberWithTimestamp) => void,
};

export type {ClientToServerEvents}

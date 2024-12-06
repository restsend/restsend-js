import { Client } from "./client";

export function createRsClient(endpoint) {
    return new Client(endpoint)
}

const rsclient = new Client()
export default rsclient

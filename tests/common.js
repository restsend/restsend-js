import WebSocket from "ws";
import { Client } from '../src/client';
import { loadEnv } from 'vite'
import { assert } from "vitest";

const env = loadEnv('development', process.cwd())
export const server = env.VITE_API_SERVER
assert(server, 'VITE_API_SERVER is not set in .env.development')

export async function waitUntil(fn, timeout) {
    let start = Date.now()
    while (true) {
        if (fn()) {
            return true
        }
        if (Date.now() - start > timeout) {
            return false
        }
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

export function createWebsocketWithToken(url, token) {
    return new WebSocket(url + "&unittest=true", {
        finishRequest(req, ws) {
            req.on('socket', (socket) => {
                socket.on('connect', () => {
                    req.setHeader('Authorization', `Bearer ${token}`);
                    req.end();
                })
            })
        },
    })
}

export async function authClient(username, password, withWebSocket = false) {
    let client = new Client(server)
    await client.login({username, password})
    if (withWebSocket) {
        client.newWebSocket = (url) => {
            return createWebsocketWithToken(url, client.token)
        }
        await client.connect()
        await waitUntil(() => client.status === 'connected', 3000)
    }
    return client
}
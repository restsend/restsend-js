/**
 * unittest for client.js
 */
import WebSocket from "ws";

import { Client } from './client';
import { describe, it, expect, assert, vi } from 'vitest'
import { loadEnv } from 'vite'
import { getFirstLetter } from './utils';

const env = loadEnv('development', process.cwd())
const server = env.VITE_API_SERVER

async function waitUntil(fn, timeout) {
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

function createWebsocketWithToken(url, token) {
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

async function authClient(username, password, withWebSocket = false) {
    let client = new Client(server)
    await client.login(username, password)
    if (withWebSocket) {
        client.newWebSocket = (url) => {
            return createWebsocketWithToken(url, client.token)
        }
        await client.connect()
        await waitUntil(() => client.status === 'connected', 3000)
    }
    return client
}

describe('Pinyin', function () {
    describe('#test getFirstLetter', function () {
        it('latin and pinyin', function () {
            // latin
            expect(getFirstLetter('abc')).toBe('A')
            expect(getFirstLetter('123')).toBe('1')
            expect(getFirstLetter('223')).toBe('2')
            // Chinese
            getFirstLetter('')
            expect(getFirstLetter('你好')).toBe('N')
            expect(getFirstLetter('饿')).toBe('E')
            // emoji
            expect(getFirstLetter('👍')).toBe('#')
            expect(getFirstLetter('こんにちは')).toBe('#')
        })
    })
})

describe('Client auth', function () {
    describe('#constructor', function () {
        it('should create a client instance', function () {
            var client = new Client()
            assert.ok(client)
        })
    });
    describe('#server status', function () {
        it('test server is running', async function () {
            var resp = await fetch(`${server}api/connect`)
            expect(resp.status).toBe(401)
        });
        it('prepare unittest accounts', async function () {
            var client = new Client(server)
            await client.services.signup('guido', 'guido:demo').catch(e => { })
            await client.services.signup('vitalik', 'vitalik:demo').catch(e => { })
            await client.services.signup('alice', 'alice:demo').catch(e => { })
            await client.services.signup('bob', 'bob:demo').catch(e => { })
        });
    });
    describe('#login', function () {
        it('should login', async () => {
            var client = new Client(server)
            expect(await client.login('guido', 'guido:demo')).toHaveProperty('token')
            expect(await client.login('vitalik', 'vitalik:demo')).toHaveProperty('token')
            expect(await client.login('alice', 'alice:demo')).toHaveProperty('token')
            expect(await client.login('bob', 'bob:demo')).toHaveProperty('token')
        })
    })
})

describe('sync conversation', function () {
    it('sync chat list', async () => {
        var vitalik = await authClient('vitalik', 'vitalik:demo')
        expect(await vitalik.allowChatWithUser({ userId: 'guido' })).toStrictEqual({ ok: true })

        var guido = await authClient('guido', 'guido:demo')

        let topic = await guido.tryChatWithUser({ id: 'vitalik' })
        expect(topic).toHaveProperty('id')
        let count = 0
        // 先添加一个好友
        guido.onConversationUpdated = (_) => {
            count++
        }
        guido.beginSyncConversations()
        expect(await waitUntil(() => {
            return count > 0
        }, 3000)).toBe(true)
    })

    it('remove chat', async () => {
        var guido = await authClient('guido', 'guido:demo')
        expect(await guido.removeConversation('guido:vitalik')).toStrictEqual({ ok: true })
        let { items, updatedAt, hasMore } = await guido.services.getChatList()
        expect(items).toBeUndefined()
    })
})


describe('Connection states', function () {
    it('connect and shutdown', async () => {
        var vitalik = await authClient('guido', 'guido:demo', true)
        vitalik.shutdown()
        expect(await waitUntil(() => {
            return vitalik.status === 'disconnected'
        }, 3000)).toBe(true)
    })

    it('send text message', async () => {
        var guido = await authClient('guido', 'guido:demo', true)
        var vitalik = await authClient('vitalik', 'vitalik:demo', true)
        expect(await vitalik.allowChatWithUser({ userId: 'guido' })).toStrictEqual({ ok: true })
        let topic = await guido.tryChatWithUser({ id: 'vitalik' })
        expect(topic).toHaveProperty('id')
        let received = false

        vitalik.onTopicMessage = (topic, msg) => {
            received = true
            expect(topic.id).toEqual('vitalik:guido')
            expect(topic.ownerId).toEqual('vitalik')
            expect(topic.attendee).toEqual('guido')

            expect(msg.topicId).toEqual(topic.id)
            expect(msg.attendee).toEqual('guido')
            expect(msg.content).toHaveProperty('type')
            expect(msg.content).toHaveProperty('text')
            expect(msg.content.text).toEqual('hello from unittest')
        }

        guido.onTopicMessage = (topic, msg) => {
            expect(topic.id).toEqual('guido:vitalik')
            expect(topic.ownerId).toEqual('guido')
            expect(topic.attendee).toEqual('vitalik')
            expect(msg.topicId).toEqual(topic.id)
            expect(msg.attendee).toEqual('guido')
            expect(msg.content).toHaveProperty('text')
            expect(msg.content.text).toEqual('hello from unittest')
        }
        await guido.doSendText({ topic, text: 'hello from unittest' })

        expect(await waitUntil(() => {
            return received
        }, 3000)).toBe(true)
    })

    it('send topic message', async () => {
        var guido = await authClient('guido', 'guido:demo', true)
    })
})

describe('Attachments', function () {
    it('upload attachment', async () => {
        var guido = await authClient('guido', 'guido:demo', true)
        let r = await guido.uploadFile({
            file: new Blob(['hello world'], { type: 'text/plain', name: 'hello.txt' }),
            topicId: 'guido:vitalik',
            isPrivate: false
        })
        expect(r).toHaveProperty('size')
        expect(r).toHaveProperty('path')
    })
})
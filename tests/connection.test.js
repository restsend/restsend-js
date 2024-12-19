import { authClient, waitUntil } from './common'
import { describe, it, expect } from 'vitest'

describe('Connection states', function () {
    it('connect and shutdown', async () => {
        var vitalik = await authClient('guido', 'guido:demo', true)
        vitalik.shutdown()
        expect(await waitUntil(() => {
            return vitalik.status === 'disconnected'
        })).toBe(true)
    })

    it('send text message', async () => {
        var guido = await authClient('guido', 'guido:demo', true)
        var vitalik = await authClient('vitalik', 'vitalik:demo', true)
        expect(await vitalik.allowChatWithUser({ userId: 'guido' })).toStrictEqual(true)
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
            return {code:200, hasRead:true}
        }

        guido.onTopicMessage = (topic, msg) => {
            expect(topic.id).toEqual('guido:vitalik')
            expect(topic.ownerId).toEqual('guido')
            expect(topic.attendee).toEqual('vitalik')
            expect(msg.topicId).toEqual(topic.id)
            expect(msg.attendee).toEqual('guido')
            if (msg.content.type === 'text') {
                expect(msg.content.text).toEqual('hello from unittest')
            } else {
                expect(msg.content.type).toEqual('topic.join')
            }
            return {code:200, hasRead:false}
        }
        await guido.doSendText({ topicId:topic.topicId, text: 'hello from unittest' })
        expect(await waitUntil(() => {
            return received
        })).toBe(true)
    })

    it('send topic message', async () => {
        var guido = await authClient('guido', 'guido:demo', true)
    })
})

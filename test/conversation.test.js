import { authClient, waitUntil } from './common'
import { describe, it, expect } from 'vitest'
describe('sync conversation', function () {
    it('sync chat list', async () => {
        var vitalik = await authClient('vitalik', 'vitalik:demo')
        expect(await vitalik.allowChatWithUser({ userId: 'guido' })).toStrictEqual(true)

        var guido = await authClient('guido', 'guido:demo')

        let topic = await guido.tryChatWithUser({ id: 'vitalik' })
        expect(topic).toHaveProperty('id')
        let count = 0
        guido.onConversationUpdated = (_) => {
            count++
        }
        guido.beginSyncConversations()
        expect(await waitUntil(() => {
            return count > 0
        })).toBe(true)
    })

    it('remove chat', async () => {
        var guido = await authClient('guido', 'guido:demo')
        expect(await guido.removeConversation('guido:vitalik')).toStrictEqual(true)
        let { items, updatedAt, hasMore } = await guido.services.getChatList()
        items = items || []
        // expect items not to contain vitalik chat, key is topicId
        items.forEach(item => {
            expect(item.topicId).not.toEqual('guido:vitalik')
        })
    })

    it('should throw an error for invalid user', async () => {
        var guido = await authClient('guido', 'guido:demo')
        await expect(guido.allowChatWithUser({ userId: 'invalidUser' })).rejects.toThrow('User not found')
    })
})
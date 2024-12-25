import { authClient } from './common'
import { describe, it, expect } from 'vitest'
import { ClientStore } from '../src/store'
import { ChatLog } from '../src/types'
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
    it('store cache', async () => {
        var alice = await authClient('alice', 'alice:demo', true)
        let store = alice.store.getMessageStore('mock')
        for (let i = 0; i < 100; i++) {
            let item = new ChatLog();
            item.seq = i
            item.chatId = `mock:${i}`
            item.content = {
                type: 'text',
                text: 'hello world'
            }
            store.updateMessages([item])
        }
        expect(store.messages.length).toBe(100)
        let items = store.getMessagesFromCache(99, 20)
        expect(items).toHaveLength(20)
        expect(items[0].seq).toBe(80)
    })
})
import { authClient} from './common'
import { describe, it, expect } from 'vitest'
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
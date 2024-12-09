import { describe, it, expect } from 'vitest'
import ServiceApi  from '../src/services';
import { server } from './common';

describe('Services', function () {
    describe('without login', function () {
        it('chatWithUser', async () => {
            const services = new ServiceApi(server)
            expect(services.chatWithUser({ userId: 'invalidUser' })).rejects.toThrow('404 page not found')
        })
    })
})

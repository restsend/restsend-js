
import { Client } from '../src/client';
import { describe, it, expect } from 'vitest'
import { server } from './common'

describe('Client auth', function () {
    describe('#constructor', function () {
        it('should create a client instance', function () {
            var client = new Client()
            expect(client).toHaveProperty('services')
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
            expect(await client.login({username:'guido', password:'guido:demo'})).toHaveProperty('token')
            expect(await client.login({username:'vitalik', password:'vitalik:demo'})).toHaveProperty('token')
            expect(await client.login({username:'alice', password:'alice:demo'})).toHaveProperty('token')
            expect(await client.login({username:'bob', password:'bob:demo'})).toHaveProperty('token')
        })
    })
})

/**
 * unittest for client.js
 */
import { describe, it, expect } from 'vitest'
import { getFirstLetter } from '../src/utils';

describe('Utils', function () {
    describe('#test getFirstLetter', function () {
        it('latin', function () {
            // latin
            expect(getFirstLetter('abc')).toBe('A')
            expect(getFirstLetter('123')).toBe('1')
            expect(getFirstLetter('223')).toBe('2')
            // // Chinese
            getFirstLetter('')
            expect(getFirstLetter('你好')).toBe('#')
            expect(getFirstLetter('饿')).toBe('#')
            //emoji
            expect(getFirstLetter('👍')).toBe('#')
            expect(getFirstLetter('こんにちは')).toBe('#')
        })
    })
})

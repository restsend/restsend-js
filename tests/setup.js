import { beforeAll } from "vitest";

beforeAll(async () => {
    globalThis.window = {}
})
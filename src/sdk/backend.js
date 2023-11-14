export async function handleResult(resp) {
    if (resp.status !== 200) {
        let reason = await resp.text()
        if (/json/i.test(resp.headers.get('Content-Type'))) {
            const data = JSON.parse(reason)
            reason = data.error || reason
        }
        if (!reason)
            reason = resp.statusText
        throw reason
    }
    return await resp.json()
}

export async function sendReq(method, url, data, token) {
    const authToken = token ? `Bearer ${token}` : undefined
    const resp = await fetch(url, {
        method,
        credentials: 'same-origin',
        body: JSON.stringify(data),
        headers: new Headers({
            'Content-Type': 'application/json',
            'Authorization': authToken,
        }),
    })

    return await handleResult(resp)
}

export class BackendApi {
    constructor(token) {
        this.token = token
    }
    async delete(url, data, token) {
        return await sendReq('DELETE', url, data, this.token)
    }

    async get(url, token) {
        return await sendReq('GET', url, undefined, this.token)
    }

    async put(url, data, token) {
        return await sendReq('PUT', url, data, this.token)
    }

    async patch(url, data, token) {
        return await sendReq('PATCH', url, data, this.token)
    }

    async post(url, data, token) {
        return await sendReq('POST', url, data, this.token)
    }
}

const backend = new BackendApi()
export default backend

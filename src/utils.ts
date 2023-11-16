import { h } from 'vue'
export function buildIcon(url:string, defaultIconComponent:any) {
    if (!url || typeof url !== 'string')
        return defaultIconComponent
    return {
        render() {
           return h('img', {src: url})
        }
    }
}
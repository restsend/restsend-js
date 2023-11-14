export function buildIcon(url:string, defaultIconComponent:any) {
    if (!url || typeof url !== 'string')
        return defaultIconComponent
    return {
        props: {
            src: url,
        },
        render(h:any) {
            return h('img', {
                attrs: {
                    src: this.props.src,
                },
            })
        }
    }
}
import { createPinia, defineStore } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia
export const useAppStore = defineStore('rsapp', {
    persist: true,
    state: () => ({
        authenticated: false,
        userInfo: {},
        sidebarOpen: true,
        applicationList: {},
        authToken: '',
        authUserId: '',
    }),
    actions: {
        setSideBar(flag: boolean) {
            this.sidebarOpen = flag
        },

        setApplicationList(list: any) {
            this.applicationList = list
        },

        signin(info:any, remember:boolean) {
            this.authenticated = true
            this.userInfo = info
            
            this.authToken = info.token
            this.authUserId = info.email
          
        },
        logout() {
            console.log("logout")
            this.authenticated = false
            this.userInfo = {}
            this.authToken = ''
            this.authUserId = ''
        },
    },
})
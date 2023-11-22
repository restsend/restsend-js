import { createRouter, createWebHistory } from 'vue-router'
import Conversation from './components/Conversation.vue'
import Setting from './components/Setting.vue'
import Signin from './view/Signin.vue'
import Signup from './view/Signup.vue'
import Logout from './view/Logout.vue'
import MainView from './MainView.vue'

import TopicView from '@/components/TopicView.vue'

const routes = [
    {
        path: '/',
        name: 'MainView',
        component: MainView,
        children: [
            {
                path: '/',
                name: 'Conversation Detail',
                component: Conversation,
                children: [{
                    path: '/topic/:id',
                    name: 'Conversation Detail',
                    component: TopicView,
                },
                {
                    path: '/chat/:id',
                    name: 'Chat Detail',
                    component: TopicView,
                },
                ],
            },
            { path: '/setting', name: 'Setting', component: Setting },
        ],
    },
    {
        path: '/signin',
        name: 'Signin',
        component: Signin,
    },
    {
        path: '/signup',
        name: 'Signup',
        component: Signup,
    },
    {
        path: '/logout',
        name: 'Logout',
        component: Logout,
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router

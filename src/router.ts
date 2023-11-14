import { createRouter, createWebHistory } from 'vue-router'
import Conversation from './components/Conversation.vue'
import Contacts from './components/Contacts.vue'
import Notifications from './components/Notifications.vue'
import Setting from './components/Setting.vue'
import Signin from './view/Signin.vue'
import Signup from './view/Signup.vue'
import Logout from './view/Logout.vue'
import MainView from './MainView.vue'
import NotifyCenter from './components/NotifyCenter.vue'
import topicKonck from './components/topicknock.vue'

import TopicView from '@/components/TopicView.vue'

const routes = [
    {
        path: '/',
        name: 'MainView',
        component: MainView,
        children: [
            {
                path: '/',
                name: 'Topic Detail',
                component: Conversation,
                children: [{
                    path: '/topic/:id',
                    name: 'Topic Detail',
                    component: TopicView,
                },
                {
                    path: '/chat/:id',
                    name: 'Chat Detail',
                    component: TopicView,
                },
                ],
            },
            { path: '/contacts', name: 'Contacts', component: Contacts },
            {
                path: '/notifications',
                name: 'Notifications',
                component: Notifications,
                children: [{
                    path: '/notifications/friends',
                    name: 'Notifications Friends',
                    component: NotifyCenter,
                },
                {
                    path: '/notifications/topics',
                    name: 'Notifications Topics',
                    component: topicKonck,
                },
                {
                    path: '/notifications/sys',
                    name: 'Notifications System',
                    component: Notifications,
                }],
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

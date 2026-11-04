import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRouter from './modules/auth/auth.routes.js'
import commentsRouter from './modules/comments/comments.routes.js'
import notificationRouter from './modules/notifications/notifications.routes.js'
import postsRouter from './modules/posts/posts.routes.js'
import reactionsRouter from './modules/reactions/reactions.routes.js'
import subscriptionsRouter from './modules/subscriptions/subscriptions.routes.js'



const app = express()

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true
    })
)

app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TNTube APIs are running'
    })
})

app.use('/api/auth', authRouter )
app.use('/api/comments', commentsRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/posts', postsRouter)
app.use('/api/reactions', reactionsRouter)
app.use('/api/subscriptions', subscriptionsRouter)

export default app
/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import queueRoutes from './routes/queue.js'
import vipRoutes from './routes/vip.js'
import pricingRoutes from './routes/pricing.js'
import billsRoutes from './routes/bills.js'
import membershipRoutes from './routes/membership.js'
import storeRoutes from './routes/store.js'
import { loadData } from './store/dataStore.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

loadData()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/vip', vipRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/bills', billsRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/store', storeRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', error.message);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  });
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const app = express()
const port = process.env.PORT || 8787

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.warn('OPENAI_API_KEY not set. Set it in server/.env')
}
const client = new OpenAI({ apiKey })

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {}
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages (array) is required' })
    }

    const system = { role: 'system', content: 'Je bent een behulpzame assistent.' }
    const userAssistantMsgs = messages.map(m => ({ role: m.role, content: m.content }))

    const response = await client.responses.create({
      model: 'gpt-4.1',
      input: [system, ...userAssistantMsgs],
    })

    const text = response.output_text || ''
    res.json({ reply: text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})

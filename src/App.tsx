import { useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

function App() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const next: Msg[] = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const reply = (data?.reply as string) ?? ''
      setMessages([...next, { role: 'assistant' as const, content: reply }])
    } catch (err) {
      setMessages([
        ...next,
        { role: 'assistant' as const, content: 'Er ging iets mis. Probeer opnieuw.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <header className="border-b border-neutral-800 p-4">
        <h1 className="text-xl font-semibold">lololo — Chat</h1>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-neutral-400">Stel je vraag aan de assistent…</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'bg-blue-600/20 border border-blue-500/30 rounded-xl px-3 py-2'
                  : 'bg-neutral-800/60 border border-neutral-700 rounded-xl px-3 py-2'
              }
            >
              <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                {m.role === 'user' ? 'Jij' : 'Assistent'}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-neutral-400 text-sm">Denken…</div>
          )}
        </div>

        <form onSubmit={sendMessage} className="sticky bottom-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Typ een bericht"
              className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ''}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 font-medium"
            >
              Verstuur
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default App

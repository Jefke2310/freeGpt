import { useState, useRef } from 'react'

type Msg = { 
  role: 'user' | 'assistant'; 
  content: string;
  imageUrl?: string;
}

function App() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if ((!text && !imagePreview) || loading) return

    const userMessage: Msg = {
      role: 'user' as const, 
      content: text,
      ...(imagePreview && { imageUrl: imagePreview })
    }

    const next: Msg[] = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setImagePreview(null)
    setLoading(true)

    try {
      const base = (import.meta as any).env?.VITE_API_BASE ?? ''
      const url = `${String(base).replace(/\/$/, '')}/api/chat`
      
      const formData = new FormData()
      formData.append('message', text)
      if (imagePreview) {
        const blob = await (await fetch(imagePreview)).blob()
        formData.append('image', blob, 'image.jpg')
      }
      
      // Add previous messages
      messages.forEach((msg, index) => {
        formData.append(`messages[${index}][role]`, msg.role)
        formData.append(`messages[${index}][content]`, msg.content)
      })

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
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
              {m.imageUrl && (
                <div className="my-2">
                  <img 
                    src={m.imageUrl} 
                    alt="Uploaded content" 
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-neutral-400 text-sm">Denken…</div>
          )}
        </div>

        <div className="sticky bottom-4">
          {imagePreview && (
            <div className="relative mb-2 inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded border border-neutral-600"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={sendMessage}>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
                disabled={loading}
              >
                📷
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ een bericht"
                className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={loading || (input.trim() === '' && !imagePreview)}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 font-medium transition-colors"
              >
                {loading ? 'Verzenden...' : 'Verstuur'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default App

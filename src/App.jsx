import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Message({ role, text, extra }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
        <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
        {extra && (
          <div className="mt-2 text-xs opacity-80">
            {extra}
          </div>
        )}
      </div>
    </div>
  )
}

function IntentBadge({ name, score }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      <span className="font-medium">{name}</span>
      <span className="opacity-70">{(score * 100).toFixed(0)}%</span>
    </span>
  )
}

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help with flights, hotels, cars, and packages. What do you need?' }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setThinking(true)

    try {
      // 1) Parse user text into intent
      const parseRes = await fetch(`${API_BASE}/nlu/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }).then(r => r.json())

      const intent = parseRes.intent
      const confidence = parseRes.confidence
      const entities = parseRes.entities || {}

      // 2) Execute intent (maps to backend command)
      const execRes = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, parameters: entities })
      }).then(r => r.json())

      const extra = (
        <div>
          <div className="mb-1">Detected intent: <IntentBadge name={intent || 'unknown'} score={confidence || 0} /></div>
          {parseRes.matched_keywords?.length ? (
            <div className="text-xs">Keywords: {parseRes.matched_keywords.join(', ')}</div>
          ) : null}
        </div>
      )

      setMessages(m => [...m, { role: 'assistant', text: JSON.stringify(execRes.result, null, 2), extra }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Travel Agency Chatbot</h1>
          <p className="text-gray-600">Type anything like "Find me flights from NYC to Paris next month". I will detect your intent and run the matching backend command.</p>
        </header>

        <div className="bg-gray-50 border rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="h-[46vh] overflow-y-auto pr-2">
            {messages.map((m, idx) => (
              <Message key={idx} role={m.role} text={m.text} extra={m.extra} />
            ))}
            {thinking && (
              <div className="text-xs text-gray-500 px-2 py-1">Thinking…</div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <textarea
              className="flex-1 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              rows={2}
              placeholder="Ask about flights, hotels, cars, packages…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={thinking}
            >
              Send
            </button>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <h2 className="font-semibold mb-2">How it works</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>What you type is sent to an AI intent parser.</li>
            <li>The parser maps your message to a specific intent and extracts key details.</li>
            <li>The intent triggers a matching backend command which returns sample results.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App

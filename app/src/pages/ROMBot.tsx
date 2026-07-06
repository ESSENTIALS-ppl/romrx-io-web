import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { Send, Loader2, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'

// Working shell for Phase 1: simple chat UI backed by the ai-chat edge
// function and ai_conversations table. Sport-specific game-plan handoffs
// (BJJ's flow generator, competition planner, etc.) are intentionally NOT
// ported here - they live in the BJJ sport add-on app.
const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`

interface Message { role: 'user' | 'assistant'; content: string }

function formatLines(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split('\n').filter(Boolean)
}

export function ROMBot() {
  const { user, session } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [convId, setConvId] = useState<string | undefined>()
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0 && user && !profileLoading) {
      const name = (profile?.full_name ?? 'there').split(' ')[0]
      setMessages([{
        role: 'assistant',
        content: `Hey ${name} - I'm ROMBot, your mobility intelligence assistant.\n\nI can see your ROM scores and protocol. Ask me anything:\n- "What's driving my lowest score?"\n- "What should I prioritize this week?"\n\nNote: ROMBot provides educational information only and is not medical advice. Consult a healthcare professional before changing your training if you have pain or injury.`,
      }])
    }
  }, [user, profile, profileLoading, messages.length])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || busy || !session) return
    const msg = input.trim()
    setInput(''); setError('')
    setMessages(p => [...p, { role: 'user', content: msg }])
    setBusy(true)
    try {
      const res = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ message: msg, conversation_id: convId, sport: 'base' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setConvId(data.conversation_id)
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (profileLoading) return <Spinner />

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <PageHeader
        title="ROMBot"
        subtitle="Your mobility intelligence assistant"
        action={
          <button onClick={() => { setMessages([]); setConvId(undefined) }}
            className="p-2 rounded-card hover:bg-red-50 text-slate-500 hover:text-red-700 transition-colors" title="Clear chat">
            <Trash2 size={15} />
          </button>
        }
      />

      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 bg-surface border border-cobalt/10 rounded-card px-3 py-2 mb-2">
        <span className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-cobalt-ink">Educational use only.</span> ROMBot is not medical advice - consult a healthcare professional for pain or injury.
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user'
                ? 'bg-cobalt text-white rounded-br-sm'
                : 'bg-white border border-cobalt/10 text-cobalt-ink rounded-bl-sm'
            )}>
              {formatLines(m.content).map((line, j) => (
                <p key={j} dangerouslySetInnerHTML={{ __html: line }} className={j > 0 ? 'mt-1' : ''} />
              ))}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-cobalt/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 160, 320].map(d => (
                  <div key={d} className="w-2 h-2 bg-cobalt rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-center text-red-700 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-cobalt/10 mt-2">
        <textarea
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about your mobility or protocol..."
          rows={1} className="flex-1 px-4 py-2.5 rounded-card border border-cobalt/10 bg-surface text-sm resize-none focus:outline-none focus:border-cobalt focus:bg-white transition-colors"
          style={{ minHeight: 44, maxHeight: 120 }}
        />
        <button onClick={send} disabled={busy || !input.trim()} className="btn-primary px-4 flex items-center gap-1.5 shrink-0">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}

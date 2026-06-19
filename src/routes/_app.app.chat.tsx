import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/chat")({
  head: () => ({ meta: [{ title: "Assistant IA — FinEase" }] }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void supabase.from("chat_messages").select("role,content").eq("user_id", user.id)
      .order("created_at").limit(50)
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
  }, [user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setBusy(true);

    void supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: userMsg.content });

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next, userId: user.id }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Trop de requêtes, réessayez dans un instant.");
        else if (resp.status === 402) toast.error("Crédits IA épuisés.");
        else toast.error("Erreur du chat");
        setBusy(false); return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let acc = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m)); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      if (acc) await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: acc });
    } catch (e) {
      toast.error("Erreur: " + (e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-10 max-w-3xl mx-auto space-y-3 md:space-y-4 h-[calc(100dvh-3.5rem-4.5rem)] md:h-[calc(100dvh-1px)] flex flex-col">
      <header className="flex items-center gap-3 shrink-0">
        <div className="size-9 md:size-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"><Sparkles className="size-4 md:size-5 text-primary-foreground" /></div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Assistant IA</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">Posez vos questions sur vos finances.</p>
        </div>
      </header>

      <Card ref={scrollRef} className="flex-1 p-4 overflow-y-auto shadow-soft border-border/60 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <Sparkles className="size-8 text-primary mb-3" />
            <p className="font-medium text-foreground">Bonjour ! Comment puis-je vous aider ?</p>
            <p className="text-sm mt-1">Essayez : « Combien j'ai dépensé en restaurants ce mois-ci ? »</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content || (busy && i === messages.length - 1 ? <Loader2 className="size-4 animate-spin" /> : "")}
            </div>
          </div>
        ))}
      </Card>

      <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex gap-2 shrink-0">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Écrivez votre question…" disabled={busy} />
        <Button type="submit" disabled={busy || !input.trim()} className="bg-gradient-primary border-0">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}

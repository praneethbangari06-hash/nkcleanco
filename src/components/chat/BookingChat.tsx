import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ChatMessage {
  id: string;
  sender_type: string;
  message_text: string;
  created_at: string;
}

interface Props {
  bookingId: string;
  /** Who is typing in this instance of the chat. */
  sender: "customer" | "worker";
  /** Chat is read-only once the job is completed/cancelled. */
  locked: boolean;
  onSend: (text: string) => Promise<unknown>;
  /** Credential-checked fetch — messages are never readable straight from the table. */
  fetchMessages: () => Promise<ChatMessage[]>;
  peerLabel: string;
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function BookingChat({
  bookingId,
  sender,
  locked,
  onSend,
  fetchMessages,
  peerLabel,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_type, message_text, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as ChatMessage[]);
    };
    void load();

    const channel = supabase
      .channel(`messages-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText("");
    } catch (error) {
      toast.error((error as Error).message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MessageCircle className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold">Chat with {peerLabel}</h2>
          <p className="text-xs text-muted-foreground">
            {locked ? "This chat is now closed." : "Messages appear instantly on both sides."}
          </p>
        </div>
      </div>

      <div
        ref={scroller}
        className="mt-4 max-h-72 min-h-32 space-y-2.5 overflow-y-auto rounded-2xl bg-surface p-3"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_type === sender;
            return (
              <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm font-medium shadow-soft ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {timeOf(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {locked ? (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
          <Lock className="size-4" /> Chat locked — job completed
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex items-center gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type a message…"
            maxLength={500}
            className="h-12 flex-1 rounded-full"
            aria-label="Message"
          />
          <Button type="submit" variant="hero" size="icon" className="size-12 shrink-0" disabled={sending}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      )}
    </section>
  );
}

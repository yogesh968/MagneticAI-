(function () {
  "use strict";

  const script = document.currentScript;
  const tenantId = script && script.dataset.tenantId;
  if (!tenantId) return console.error("[MagneticAI] data-tenant-id is required");

  const API = new URL(script.src).origin;
  const SOCKET_URL = script.dataset.socketUrl || API;

  // ── Shadow DOM container ────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "magnetic-ai-widget";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  // ── State ───────────────────────────────────────────────────────────────
  let config = null;
  let sessionId = null;
  let conversationId = null;
  let isOpen = false;
  let isHumanActive = false;
  let socket = null;
  let lastUserMsg = "Support request";

  // ── Helpers ─────────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const md = (s) =>
    esc(s)
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
      .replace(/\n/g, "<br>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

  const $ = (sel) => root.querySelector(sel);
  const msgs = () => $(".messages");

  function scrollBottom() {
    const m = msgs();
    if (m) m.scrollTop = m.scrollHeight;
  }

  function addMsg(text, cls) {
    const el = document.createElement("div");
    el.className = "msg " + cls;
    el.innerHTML = md(text);
    msgs()?.appendChild(el);
    scrollBottom();
    return el;
  }

  function setOpen(v) {
    isOpen = v;
    const panel = $(".panel");
    const btn = $(".toggle");
    if (panel) panel.style.display = v ? "flex" : "none";
    if (btn) btn.innerHTML = v ? CLOSE_SVG : CHAT_SVG;
    if (v) scrollBottom();
  }

  // ── SVGs ────────────────────────────────────────────────────────────────
  const CHAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`;
  const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
  const SEND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5"/></svg>`;

  // ── Send a message (SSE streaming) ──────────────────────────────────────
  async function send(text) {
    if (!text.trim() || !sessionId) return;
    lastUserMsg = text;

    addMsg(text, "user");

    // Push to socket room so agents see it in real time
    if (socket && conversationId) {
      socket.emit("customer:message", { conversationId, content: text });
    }

    // If a human agent is active, don't call the AI
    if (isHumanActive) return;

    const typingEl = document.createElement("div");
    typingEl.className = "msg bot typing-indicator";
    typingEl.innerHTML = "<span></span><span></span><span></span>";
    msgs()?.appendChild(typingEl);
    scrollBottom();

    try {
      const res = await fetch(`${API}/api/chat/message`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ tenantId, sessionId, message: text }),
      });

      if (!res.ok || !res.body) {
        typingEl.className = "msg bot";
        typingEl.innerHTML = md("Sorry, something went wrong. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";
      typingEl.className = "msg bot";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const eventLine = part.match(/^event: (.+)$/m)?.[1];
          const dataLine = part.match(/^data: (.+)$/m)?.[1];
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventLine === "token") {
              answer += data.token;
              typingEl.innerHTML = md(answer);
              scrollBottom();
            }
            if (eventLine === "done") {
              if (data.ticket) showTicketForm();
              if (data.message?.conversationId && !conversationId) {
                conversationId = data.message.conversationId;
              }
            }
          } catch {}
        }
      }
    } catch {
      typingEl.className = "msg bot";
      typingEl.innerHTML = md("Connection error. Please try again.");
    }
  }

  // ── Ticket form ──────────────────────────────────────────────────────────
  function showTicketForm() {
    const tf = $(".ticket-form");
    if (tf) tf.style.display = "block";
  }

  // ── Load Socket.io and connect ───────────────────────────────────────────
  function connectSocket() {
    if (!conversationId) return;
    const s = document.createElement("script");
    s.src = `${SOCKET_URL}/socket.io/socket.io.js`;
    s.onload = () => {
      socket = window.io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
      socket.on("connect", () => {
        socket.emit("join:conversation", { conversationId });
      });
      socket.on("message:new", (msg) => {
        if (msg.role === "assistant" && msg.eventType === "human_joined") {
          isHumanActive = true;
          const banner = $(".handoff-banner");
          if (banner) banner.style.display = "flex";
        }
        if (msg.role === "assistant") addMsg(msg.content, "bot");
        if (msg.role === "system")    addMsg(msg.content, "system");
      });
      socket.on("handoff:active", ({ agentName }) => {
        isHumanActive = true;
        addMsg(`${agentName} has joined and will assist you now.`, "system");
        const banner = $(".handoff-banner");
        if (banner) banner.style.display = "flex";
      });
      socket.on("agent:left", () => {
        isHumanActive = false;
        addMsg("The agent has left. The AI assistant is back.", "system");
        const banner = $(".handoff-banner");
        if (banner) banner.style.display = "none";
      });
      socket.on("typing:start", ({ isAgent }) => {
        if (!isAgent) return;
        let el = $(".agent-typing");
        if (!el) {
          el = document.createElement("div");
          el.className = "msg bot typing-indicator agent-typing";
          el.innerHTML = "<span></span><span></span><span></span>";
          msgs()?.appendChild(el);
          scrollBottom();
        }
      });
      socket.on("typing:stop", () => {
        $(".agent-typing")?.remove();
      });
    };
    document.head.appendChild(s);
  }

  // ── Build UI ─────────────────────────────────────────────────────────────
  fetch(`${API}/api/widget/${tenantId}/config`)
    .then((r) => r.json())
    .then(async (cfg) => {
      config = cfg;
      const color = cfg.settings?.widgetColor || "#2563eb";
      const pos   = cfg.settings?.widgetPosition === "bottom-left" ? "left" : "right";

      root.innerHTML = `<style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        :host{font-family:Inter,system-ui,sans-serif}

        /* Toggle button */
        .toggle{
          position:fixed;${pos}:24px;bottom:24px;
          border:0;border-radius:50%;width:60px;height:60px;
          background:${color};cursor:pointer;
          box-shadow:0 8px 32px rgba(0,0,0,.24);
          display:flex;align-items:center;justify-content:center;
          transition:transform .15s,box-shadow .15s;
          z-index:2147483647;outline:none;
        }
        .toggle:hover{transform:scale(1.08);box-shadow:0 12px 40px rgba(0,0,0,.3)}

        /* Panel */
        .panel{
          position:fixed;${pos}:24px;bottom:96px;
          width:min(390px,calc(100vw - 32px));height:580px;
          background:#fff;border-radius:20px;
          box-shadow:0 24px 80px rgba(0,0,0,.18);
          overflow:hidden;display:none;flex-direction:column;
          border:1px solid rgba(0,0,0,.08);
          z-index:2147483646;
          animation:slideUp .25s cubic-bezier(.16,1,.3,1);
        }
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* Header */
        .head{
          padding:14px 18px;background:${color};color:#fff;
          display:flex;align-items:center;gap:12px;flex-shrink:0;
        }
        .head-av{
          width:40px;height:40px;border-radius:50%;
          background:rgba(255,255,255,.2);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:17px;flex-shrink:0;
          border:2px solid rgba(255,255,255,.3);
        }
        .head-info b{display:block;font-size:15px;font-weight:700;line-height:1.2}
        .head-info span{font-size:12px;opacity:.8}
        .online{width:8px;height:8px;border-radius:50%;background:#4ade80;margin-left:auto;
          box-shadow:0 0 0 3px rgba(74,222,128,.25);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}

        /* Human handoff banner */
        .handoff-banner{
          display:none;align-items:center;gap:8px;
          background:#fefce8;border-bottom:1px solid #fde68a;
          padding:8px 16px;font-size:12px;font-weight:600;color:#92400e;
          flex-shrink:0;
        }
        .handoff-banner::before{content:"👤";font-size:14px}

        /* Messages */
        .messages{
          flex:1;overflow-y:auto;padding:14px;
          background:#f8fafc;scroll-behavior:smooth;
        }
        .msg{
          max-width:87%;padding:10px 14px;border-radius:16px;
          margin:5px 0;font-size:14px;line-height:1.55;
          word-break:break-word;
          animation:fadeUp .2s ease-out both;
        }
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .bot{
          background:#fff;border:1px solid #e5e7eb;color:#1e293b;
          box-shadow:0 1px 3px rgba(0,0,0,.05);border-radius:16px 16px 16px 4px;
        }
        .user{
          background:${color};color:#fff;margin-left:auto;
          border-radius:16px 16px 4px 16px;
        }
        .system{
          background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;
          font-size:12px;text-align:center;max-width:100%;
          border-radius:10px;padding:7px 12px;
        }

        /* Typing indicator */
        .typing-indicator{display:flex;gap:5px;padding:14px 16px;align-items:center}
        .typing-indicator span{
          width:7px;height:7px;border-radius:50%;background:#94a3b8;
          animation:bounce .9s infinite;
        }
        .typing-indicator span:nth-child(2){animation-delay:.18s}
        .typing-indicator span:nth-child(3){animation-delay:.36s}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}

        /* Suggested question chips */
        .chips{
          padding:8px 12px 6px;background:#fff;
          border-top:1px solid #f1f5f9;
          display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;
        }
        .chip{
          border:1px solid ${color};color:${color};background:#fff;
          border-radius:99px;padding:5px 13px;
          font-size:12px;font-weight:500;cursor:pointer;
          transition:all .15s;
        }
        .chip:hover{background:${color};color:#fff}

        /* Ticket form */
        .ticket-form{
          padding:12px 14px;border-top:1px solid #e5e7eb;
          background:#fffbeb;display:none;flex-shrink:0;
        }
        .ticket-form p{font-size:12px;font-weight:600;color:#92400e;margin-bottom:8px}
        .ticket-form input{
          width:100%;border:1px solid #d1d5db;border-radius:10px;
          padding:9px 12px;font-size:13px;margin-bottom:6px;
          outline:none;font-family:inherit;
        }
        .ticket-form input:focus{border-color:${color};box-shadow:0 0 0 3px ${color}20}
        .ticket-form button{
          width:100%;border:0;background:${color};color:#fff;
          border-radius:10px;padding:10px;font-size:13px;
          font-weight:600;cursor:pointer;font-family:inherit;
          transition:opacity .15s;
        }
        .ticket-form button:hover{opacity:.9}

        /* Input area */
        .form{
          padding:10px 12px;border-top:1px solid #e5e7eb;
          background:#fff;display:flex;gap:8px;flex-shrink:0;align-items:center;
        }
        .form input{
          flex:1;border:1px solid #e5e7eb;border-radius:12px;
          padding:10px 14px;font-size:14px;outline:none;
          font-family:inherit;transition:border .15s;background:#f8fafc;
        }
        .form input:focus{border-color:${color};background:#fff;box-shadow:0 0 0 3px ${color}18}
        .form button{
          border:0;background:${color};color:#fff;border-radius:12px;
          width:42px;height:42px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;transition:opacity .15s,transform .1s;
        }
        .form button:hover{opacity:.9}
        .form button:active{transform:scale(.95)}
        .form button:disabled{opacity:.4;cursor:not-allowed}

        /* Code */
        pre{overflow-x:auto;background:#1e293b;color:#e2e8f0;padding:10px;border-radius:8px;font-size:12px;margin:6px 0}
        code{background:#f1f5f9;color:#0f172a;padding:1px 5px;border-radius:4px;font-size:12px}
        a{color:${color};text-decoration:underline}
        ul,ol{padding-left:18px;margin:4px 0}
        strong{font-weight:600}

        /* Scrollbar */
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
      </style>

      <button class="toggle" aria-label="Open support chat">${CHAT_SVG}</button>

      <section class="panel" role="dialog" aria-label="${esc(cfg.botName)} support chat">
        <div class="head">
          <div class="head-av">${esc(cfg.botName?.[0] ?? "A")}</div>
          <div class="head-info">
            <b>${esc(cfg.botName)}</b>
            <span>${esc(cfg.businessName)}</span>
          </div>
          <div class="online" title="Online"></div>
        </div>

        <div class="handoff-banner">Agent connected — you're chatting with a human</div>

        <div class="messages"></div>

        <div class="chips"></div>

        <div class="ticket-form">
          <p>📋 Let our team follow up by email</p>
          <input id="tf-name" placeholder="Your name" autocomplete="name" />
          <input id="tf-email" type="email" placeholder="Email address" autocomplete="email" />
          <button id="tf-btn">Create support ticket →</button>
        </div>

        <form class="form">
          <input
            class="msg-input"
            aria-label="Message"
            placeholder="Type a message…"
            autocomplete="off"
            required
          />
          <button type="submit" aria-label="Send">${SEND_SVG}</button>
        </form>
      </section>`;

      // ── Welcome message ─────────────────────────────────────────────────
      addMsg(cfg.welcomeMessage || "Hi! How can I help?", "bot");

      // ── Suggested chips ──────────────────────────────────────────────────
      const chipsEl = $(".chips");
      if (cfg.suggestedQuestions?.length) {
        cfg.suggestedQuestions.forEach((q) => {
          const btn = document.createElement("button");
          btn.className = "chip";
          btn.textContent = q;
          btn.onclick = () => {
            chipsEl.style.display = "none";
            $(".msg-input").value = "";
            send(q);
          };
          chipsEl.appendChild(btn);
        });
      } else {
        chipsEl.style.display = "none";
      }

      // ── Create session ────────────────────────────────────────────────────
      const sessRes = await fetch(`${API}/api/chat/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const sessData = await sessRes.json();
      sessionId      = sessData.sessionId;
      conversationId = sessData.conversationId ?? null;

      // Connect socket for real-time
      if (conversationId) connectSocket();

      // ── Toggle ──────────────────────────────────────────────────────────
      $(".toggle").onclick = () => setOpen(!isOpen);

      // ── Send form ────────────────────────────────────────────────────────
      $(".form").onsubmit = (e) => {
        e.preventDefault();
        const inp = $(".msg-input");
        const text = inp.value.trim();
        if (!text) return;
        inp.value = "";
        chipsEl.style.display = "none";
        send(text);
      };

      // ── Typing events ────────────────────────────────────────────────────
      $(".msg-input").addEventListener("input", () => {
        if (socket && conversationId) {
          socket.emit("typing:start", { conversationId });
          clearTimeout(window._typingTimer);
          window._typingTimer = setTimeout(() => {
            socket.emit("typing:stop", { conversationId });
          }, 1200);
        }
      });

      // ── Ticket form submit ────────────────────────────────────────────────
      $("#tf-btn").onclick = async () => {
        const name  = $("#tf-name").value.trim();
        const email = $("#tf-email").value.trim();
        if (!name || !email) {
          alert("Please enter your name and email.");
          return;
        }
        $("#tf-btn").textContent = "Creating…";
        $("#tf-btn").disabled = true;
        try {
          const r = await fetch(`${API}/api/chat/ticket`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenantId, sessionId,
              customerName: name, customerEmail: email,
              description: lastUserMsg,
            }),
          });
          if (r.ok) {
            $(".ticket-form").style.display = "none";
            addMsg("✅ Ticket created! Our team will follow up at **" + email + "** within 24 hours.", "bot");
          } else {
            throw new Error("Failed");
          }
        } catch {
          $("#tf-btn").textContent = "Create support ticket →";
          $("#tf-btn").disabled = false;
          addMsg("Sorry, couldn't create the ticket. Please try again.", "bot");
        }
      };
    })
    .catch((err) => console.error("[MagneticAI] Widget failed to load:", err));
})();

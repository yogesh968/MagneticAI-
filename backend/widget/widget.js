(function () {
  "use strict";

  const script = document.currentScript;
  // data-bot-id picks a specific bot. data-tenant-id is the older form and
  // resolves to that tenant's default bot.
  const botId = script && script.dataset.botId;
  const tenantId = script && script.dataset.tenantId;
  if (!botId && !tenantId) {
    return console.error("[MagneticAI] data-bot-id is required");
  }

  const API = new URL(script.src).origin;
  const SOCKET_URL = script.dataset.socketUrl || API;
  const CONFIG_URL = botId ? `${API}/api/widget/bot/${botId}/config` : `${API}/api/widget/${tenantId}/config`;

  // ── Shadow DOM container ────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "magnetic-ai-widget";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  // ── State ───────────────────────────────────────────────────────────────
  // Keyed per bot so two widgets on one page don't share a conversation.
  const STORAGE_KEY = `magnetic_session_${botId || tenantId}`;
  let config = null;
  let sessionId = sessionStorage.getItem(STORAGE_KEY + "_sid") || null;
  let conversationId = sessionStorage.getItem(STORAGE_KEY + "_cid") || null;
  // Issued by POST /api/chat/session. Every subsequent chat call proves which
  // tenant and conversation it belongs to with this instead of passing a raw
  // tenantId the server would have to take on trust.
  let sessionToken = sessionStorage.getItem(STORAGE_KEY + "_tok") || null;
  let isOpen = false;
  let isHumanActive = false;
  let socket = null;
  let lastUserMsg = "Support request";

  const sessionHeaders = (extra) =>
    Object.assign({ "content-type": "application/json", "x-session-token": sessionToken }, extra || {});

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY + "_sid");
    sessionStorage.removeItem(STORAGE_KEY + "_cid");
    sessionStorage.removeItem(STORAGE_KEY + "_tok");
    sessionId = conversationId = sessionToken = null;
  }

  async function startSession() {
    // The server pins the session to a bot; botId wins, tenantId falls back to
    // the tenant's default bot.
    const res = await fetch(`${API}/api/chat/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      mode: "cors",
      body: JSON.stringify(botId ? { botId } : { tenantId }),
    });
    if (!res.ok) throw new Error(`Session error: ${res.status}`);
    const data = await res.json();
    sessionId = data.sessionId;
    conversationId = data.conversationId ?? null;
    sessionToken = data.sessionToken;
    if (sessionId) sessionStorage.setItem(STORAGE_KEY + "_sid", sessionId);
    if (conversationId) sessionStorage.setItem(STORAGE_KEY + "_cid", conversationId);
    if (sessionToken) sessionStorage.setItem(STORAGE_KEY + "_tok", sessionToken);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

  /**
   * Block-level markdown, rendered line by line.
   *
   * The previous version wrapped each <li> in its own <ul> and then turned every
   * newline into a <br>, so a three-item list rendered as three separate
   * one-item lists with breaks between them. Grouping runs of list items into a
   * single list is the whole point — the model's structure has to survive here
   * or asking it for structure is pointless.
   */
  const md = (s) => {
    const lines = esc(String(s ?? "")).split("\n");
    const out = [];
    let list = null; // "ul" | "ol" | null
    let code = false;
    let buf = [];

    const closeList = () => {
      if (list) {
        out.push(`</${list}>`);
        list = null;
      }
    };
    const flushPara = () => {
      if (buf.length) {
        out.push(`<p>${inline(buf.join("<br>"))}</p>`);
        buf = [];
      }
    };

    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        flushPara();
        closeList();
        out.push(code ? "</code></pre>" : "<pre><code>");
        code = !code;
        continue;
      }
      if (code) {
        out.push(line + "\n");
        continue;
      }

      const ul = line.match(/^\s*[-*]\s+(.+)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
      const head = line.match(/^\s*(#{1,3})\s+(.+)$/);

      if (ul || ol) {
        flushPara();
        const want = ul ? "ul" : "ol";
        if (list !== want) {
          closeList();
          out.push(`<${want}>`);
          list = want;
        }
        out.push(`<li>${inline((ul || ol)[1])}</li>`);
        continue;
      }

      closeList();

      if (head) {
        flushPara();
        out.push(`<h4>${inline(head[2])}</h4>`);
        continue;
      }
      if (!line.trim()) {
        flushPara();
        continue;
      }
      buf.push(line);
    }

    flushPara();
    closeList();
    if (code) out.push("</code></pre>");
    return out.join("");
  };

  const $ = (sel) => root.querySelector(sel);
  const msgs = () => $(".messages");

  function scrollBottom() {
    const m = msgs();
    if (m) m.scrollTop = m.scrollHeight;
  }

  /**
   * A bot turn is a bubble plus a byline underneath ("Fin • AI Agent • Just
   * now"), so each one is wrapped in a row rather than appended bare. The
   * returned element is still the bubble itself — the streaming code writes
   * tokens straight into it.
   */
  /** Clock time like "11:10 AM". Falls back to now when no timestamp is given. */
  function fmtTime(d) {
    const t = d ? new Date(d) : new Date();
    return isNaN(t.getTime()) ? "" : t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function addMsg(text, cls, time) {
    const row = document.createElement("div");
    row.className = "row " + cls;

    const el = document.createElement("div");
    el.className = "msg " + cls;
    el.innerHTML = md(text);
    row.appendChild(el);

    if (cls === "bot") {
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${config?.botName ?? "Assistant"} • ${isHumanActive ? "Agent" : "AI Agent"} • ${fmtTime(time)}`;
      row.appendChild(meta);
    }

    msgs()?.appendChild(row);
    scrollBottom();
    return el;
  }

  /** Citation chips under a bot answer, naming the KB documents it drew on. */
  function addSources(bubble, sources) {
    if (!bubble || !sources?.length) return;
    const row = bubble.parentElement;
    if (!row || row.querySelector(".sources")) return;
    const wrap = document.createElement("div");
    wrap.className = "sources";
    wrap.innerHTML =
      `<span class="sources-label">Sources</span>` +
      sources.map((s) => `<span class="source">${esc(s)}</span>`).join("");
    row.insertBefore(wrap, row.querySelector(".meta"));
    scrollBottom();
  }

  /** Set once the teaser has been dismissed or the chat opened, so it does not nag. */
  const TEASER_KEY = STORAGE_KEY + "_teaser_done";

  function hideTeaser() {
    const t = $(".teaser");
    if (t) t.style.display = "none";
    const b = $(".badge");
    if (b) b.style.display = "none";
  }

  function setOpen(v) {
    isOpen = v;
    const panel = $(".panel");
    const btn = $(".toggle");
    if (panel) panel.style.display = v ? "flex" : "none";
    // The icon swap has to preserve the badge element, which lives inside the
    // button — innerHTML alone would drop it.
    if (btn) {
      const badge = btn.querySelector(".badge");
      btn.innerHTML = v ? CHEVRON_SVG : CHAT_SVG;
      if (badge) btn.appendChild(badge);
      btn.classList.toggle("open", v);
      btn.setAttribute("aria-label", v ? "Minimise support chat" : "Open support chat");
    }
    if (v) {
      sessionStorage.setItem(TEASER_KEY, "1");
      hideTeaser();
      scrollBottom();
      $(".msg-input")?.focus();
    }
  }

  // ── The mark ────────────────────────────────────────────────────────────
  /**
   * The animated orb, built from layered blurred gradients rather than the
   * source video. An 8MB mp4 on every host page is not a launcher icon; three
   * drifting blobs behind a glass highlight read as the same object, cost
   * nothing to load, and stay sharp at any size.
   *
   * Sized entirely off the --s custom property so one markup blob serves the
   * launcher, the header and the teaser.
   */
  /** Every orb size rendered, so a matching filter can be emitted for each. */
  const ORB_SIZES = new Set();

  const ORB = (size) => {
    ORB_SIZES.add(size);
    return `<span class="orb" style="--s:${size}px" aria-hidden="true"><span class="liquid" style="filter:url(#liquify-${size})"><i class="b1"></i><i class="b2"></i><i class="b3"></i></span></span>`;
  };

  /**
   * Displacement filter that turns the soft gradient blobs into liquid.
   *
   * Blur alone gives a glowing ball; the reference has ink-in-water edges. Warping
   * the blobs through fractal noise buys that definition.
   *
   * The noise field is deliberately STATIC. Animating baseFrequency recomputes the
   * whole field every frame, and this script runs on other people's pages — a
   * launcher icon has no business burning a customer's main thread. The blobs drift
   * and morph through the fixed field instead, which churns the surface for free.
   *
   * One filter per size, because both knobs are in user-space pixels and neither
   * follows the element. `scale` is a pixel displacement — 30px is a tenth of the
   * 300px mark but most of the 34px avatar — and baseFrequency is a wavelength, so
   * a fixed value gives the small orbs a much finer grain than the large one.
   * Holding freq × size and scale ÷ size constant makes every size warp alike.
   *
   * primitiveUnits="objectBoundingBox" would express both relatively and is the
   * obvious fix, but Chrome still reads baseFrequency in user space under it, which
   * turns the noise into per-pixel speckle. Hence the explicit per-size filters.
   *
   * Defined inside the shadow root the orbs live in: filter: url(#id) will not
   * resolve across that boundary.
   */
  const ORB_FILTER = () => `
    <svg class="orb-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        ${[...ORB_SIZES]
          .map(
            (s) => `
        <filter id="liquify-${s}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="${(4.2 / s).toFixed(4)} ${(5.4 / s).toFixed(4)}" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="${(s * 0.1).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" />
        </filter>`
          )
          .join("")}
      </defs>
    </svg>`;

  // Fills the launcher edge to edge: the mark is the button.
  const CHAT_SVG = ORB(62);
  // currentColor, not a fixed white: this X sits on the dark panel header, and a
  // hardcoded stroke would be invisible anywhere lighter.
  const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;

  // The launcher's open state. A second X down here just repeats the one already
  // in the panel header; a chevron says "put this away" instead.
  const CHEVRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>`;
  const SEND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5"/></svg>`;

  // ── Send a message (SSE streaming) ──────────────────────────────────────
  async function send(text) {
    if (!text.trim() || !sessionToken) return;
    lastUserMsg = text;

    addMsg(text, "user");

    // If a human agent is active, send via socket only (agent sees it in real-time, no AI)
    // The server derives the conversation from the handshake token.
    if (isHumanActive) {
      if (socket) socket.emit("customer:message", { content: text });
      return;
    }

    // The indicator IS the bubble the answer streams into — it starts as three
    // dots and becomes the reply in place. It has to sit in a .row like any
    // other bot turn so the byline can be attached once the answer lands.
    const typingRow = document.createElement("div");
    typingRow.className = "row bot";
    const typingEl = document.createElement("div");
    typingEl.className = "msg bot typing-indicator";
    typingEl.innerHTML = "<span></span><span></span><span></span>";
    typingRow.appendChild(typingEl);
    msgs()?.appendChild(typingRow);
    scrollBottom();

    /** Turn the dots into a real bot turn: drop the indicator, add the byline. */
    const settle = () => {
      typingEl.className = "msg bot";
      if (!typingRow.querySelector(".meta")) {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `${config?.botName ?? "Assistant"} • AI Agent • ${fmtTime()}`;
        typingRow.appendChild(meta);
      }
    };

    try {
      const res = await fetch(`${API}/api/chat/message`, {
        method: "POST",
        headers: sessionHeaders({ accept: "text/event-stream" }),
        mode: "cors",
        body: JSON.stringify({ message: text }),
      });

      // A 24h session token can expire mid-conversation; start a fresh one rather
      // than leaving the widget permanently broken.
      if (res.status === 401) {
        clearSession();
        await startSession();
        settle();
        typingEl.innerHTML = md("Your session expired. Please send that again.");
        return;
      }

      if (!res.ok || !res.body) {
        settle();
        typingEl.innerHTML = md("Sorry, something went wrong. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";
      settle();

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
              if (data.message?.conversationId) {
                const newConvId = data.message.conversationId;
                if (!conversationId) {
                  conversationId = newConvId;
                  sessionStorage.setItem(STORAGE_KEY + "_cid", conversationId);
                  connectSocket();
                }
              }
            }
          } catch {}
        }
      }
    } catch {
      settle();
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
    if (!conversationId || !sessionToken) return;
    const s = document.createElement("script");
    s.src = `${SOCKET_URL}/socket.io/socket.io.js`;
    s.onload = () => {
      // The server authenticates the handshake, so the token goes in `auth`.
      socket = window.io(SOCKET_URL, {
        transports: ["websocket"],
        autoConnect: true,
        auth: { sessionToken },
      });
      socket.on("connect", () => {
        socket.emit("join:conversation", { conversationId });
      });
      socket.on("connect_error", (err) => {
        console.warn("[MagneticAI] live connection unavailable:", err.message);
      });
      socket.on("message:new", (msg) => {
        if (msg.role === "assistant" && msg.eventType === "human_joined") {
          isHumanActive = true;
          const banner = $(".handoff-banner");
          if (banner) banner.style.display = "flex";
        }
        if (msg.role === "assistant") addMsg(msg.content, "bot", msg.createdAt);
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
        if (!$(".agent-typing")) {
          // Wrapped in a .row like every other bot turn, or it sits outside the
          // column layout and loses its alignment and spacing.
          const row = document.createElement("div");
          row.className = "row bot agent-typing";
          const el = document.createElement("div");
          el.className = "msg bot typing-indicator";
          el.innerHTML = "<span></span><span></span><span></span>";
          row.appendChild(el);
          msgs()?.appendChild(row);
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
  fetch(CONFIG_URL, { mode: "cors" })
    .then((r) => {
      if (!r.ok) throw new Error(`Config ${r.status} — check the bot id is correct and the bot is active`);
      return r.json();
    })
    .then(async (cfg) => {
      config = cfg;
      const color = cfg.settings?.widgetColor || "#2563eb";
      const pos   = cfg.settings?.widgetPosition === "bottom-left" ? "left" : "right";

      root.innerHTML = `<style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        :host{font-family:Inter,system-ui,sans-serif}

        /* The panel is a dark surface regardless of the tenant's brand colour —
           that colour becomes the accent (user bubble, send, launcher) so the
           branding survives without wrecking contrast on a light hue. */
        :host{
          --panel:#1A1A1C; --raised:#2A2A2E; --line:rgba(255,255,255,.09);
          --text:#F4F4F5; --muted:#9A9AA2; --accent:${color};
        }

        /* ── The orb ──────────────────────────────────────────────────────
           A frosted sphere with liquid inside. Three blobs drift on prime-ish
           durations (7s/11s/13s) so the loop never visibly repeats, and the
           whole thing is clipped to the circle. Everything scales off --s. */
        .orb{
          position:relative;display:block;flex:none;
          width:var(--s);height:var(--s);border-radius:50%;
          overflow:hidden;isolation:isolate;
          background:radial-gradient(circle at 36% 30%, #FBFAFE 0%, #E7E2F6 46%, #C6BEE2 78%, #ADA3D0 100%);
          /* Push the liquid past what the gradients alone give: the mark is
             small and competes with whatever page it lands on. */
          filter:saturate(1.45) contrast(1.08) brightness(1.04);
        }
        .orb-defs{position:absolute;width:0;height:0;overflow:hidden}
        /* One filter over the whole liquid layer, not per blob — displacing them
           together keeps their boundaries coherent, the way real fluid meets.
           The slow counter-rotation is what actually sells the motion: at
           launcher size the blobs' own drift is only a few pixels and reads as
           a still image. url(#liquify-N) is set per instance by ORB(). */
        .liquid{
          position:absolute;inset:0;z-index:1;
          animation:orbSpin 24s linear infinite;
        }
        @keyframes orbSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        /* Only a light blur: the displacement supplies the shape, and heavy blur
           would smear three colours into one mauve smudge with no cyan left. */
        .orb i{
          position:absolute;display:block;border-radius:44% 56% 52% 48%;
          filter:blur(calc(var(--s) * .022));
          will-change:transform;
        }
        /* Stacking is the whole composition: magenta and violet sit behind, the
           cyan mass sits in front. Painted the other way round the magenta
           covers the middle and the mark turns into a pink dot. */
        .orb .b1{
          z-index:3;
          width:70%;height:70%;left:6%;top:20%;
          background:radial-gradient(circle, #F0FEFF 0%, #67E8F9 30%, #22D3EE 58%, #0284C7 82%, rgba(2,132,199,0) 92%);
          animation:orbA 5s ease-in-out infinite;
        }
        .orb .b2{
          z-index:2;
          width:58%;height:58%;left:30%;top:-2%;
          background:radial-gradient(circle, #DDC4FF 0%, #A855F7 34%, #7C3AED 62%, #5B21B6 84%, rgba(91,33,182,0) 93%);
          animation:orbB 7s ease-in-out infinite;
        }
        .orb .b3{
          z-index:1;
          width:50%;height:50%;left:50%;top:44%;
          background:radial-gradient(circle, #FFB3F5 0%, #F026E0 36%, #C026D3 64%, #86198F 86%, rgba(134,25,143,0) 94%);
          animation:orbC 9s ease-in-out infinite;
        }
        /* Glass: specular hotspot top-left, bright rim, and a contact shadow at
           the bottom so it reads as a sphere rather than a flat disc. */
        .orb::after{
          content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:4;
          background:
            radial-gradient(ellipse 28% 20% at 30% 19%, rgba(255,255,255,.98) 0%, rgba(255,255,255,.5) 45%, rgba(255,255,255,0) 100%),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 62%, rgba(255,255,255,.42) 88%, rgba(255,255,255,.72) 100%),
            radial-gradient(circle at 50% 108%, rgba(90,74,140,.42) 0%, rgba(90,74,140,0) 42%);
          box-shadow:inset 0 0 0 calc(var(--s) * .012) rgba(255,255,255,.55);
        }
        /* Amplitudes are large on purpose. These are percentages of a ~60px
           button, so a "subtle" 8% drift is five pixels and reads as a static
           image — the whole point of the mark is that it is alive. */
        @keyframes orbA{
          0%,100%{transform:translate(0,0) scale(1) rotate(0deg);border-radius:44% 56% 52% 48%}
          30%{transform:translate(26%,18%) scale(1.24) rotate(70deg);border-radius:60% 40% 44% 56%}
          60%{transform:translate(12%,-18%) scale(.82) rotate(-55deg);border-radius:46% 54% 62% 38%}
        }
        @keyframes orbB{
          0%,100%{transform:translate(0,0) scale(1) rotate(0deg);border-radius:52% 48% 44% 56%}
          38%{transform:translate(-24%,34%) scale(1.3) rotate(-80deg);border-radius:40% 60% 58% 42%}
          72%{transform:translate(16%,20%) scale(.86) rotate(45deg);border-radius:58% 42% 46% 54%}
        }
        @keyframes orbC{
          0%,100%{transform:translate(0,0) scale(1) rotate(0deg);border-radius:48% 52% 56% 44%}
          34%{transform:translate(-28%,-32%) scale(1.34) rotate(85deg);border-radius:58% 42% 40% 60%}
          70%{transform:translate(20%,8%) scale(.8) rotate(-40deg);border-radius:42% 58% 54% 46%}
        }

        /* Launcher: the orb IS the button. No white puck behind it — that ring
           read as chrome around the mark rather than the mark itself. The glow
           is a drop-shadow so it follows the sphere, not a square box. */
        .toggle{
          position:fixed;${pos}:24px;bottom:24px;
          border:0;border-radius:50%;width:62px;height:62px;
          background:transparent;cursor:pointer;padding:0;
          color:#fff;
          filter:drop-shadow(0 10px 22px rgba(88,40,190,.5)) drop-shadow(0 2px 6px rgba(0,0,0,.25));
          display:flex;align-items:center;justify-content:center;
          transition:transform .18s;
          z-index:2147483647;outline:none;
        }
        .toggle:hover{transform:translateY(-3px) scale(1.06)}
        .toggle:focus-visible{outline:2px solid #7C3AED;outline-offset:4px}
        /* Open: the orb gives way to a plain white puck with a chevron. The mark
           has done its job by then, and the panel is already on screen carrying
           the branding. */
        .toggle.open{
          background:#FFFFFF;
          color:#1A1A1C;
          filter:drop-shadow(0 8px 20px rgba(0,0,0,.28));
        }

        /* Unread dot on the launcher, mirroring the teaser card */
        .badge{
          position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;
          border-radius:99px;background:#EF4444;color:#fff;
          font-size:11px;font-weight:700;line-height:20px;text-align:center;
          padding:0 5px;box-shadow:0 0 0 2px rgba(0,0,0,.25);display:none;
        }

        /* Teaser shown before the panel is opened */
        .teaser{
          position:fixed;${pos}:24px;bottom:92px;
          width:min(320px,calc(100vw - 48px));
          display:none;flex-direction:column;align-items:flex-end;gap:8px;
          z-index:2147483646;
          animation:slideUp .28s cubic-bezier(.16,1,.3,1);
        }
        .teaser-card{
          width:100%;background:var(--panel);color:var(--text);
          border:1px solid var(--line);border-radius:16px;padding:14px 16px;
          box-shadow:0 18px 50px rgba(0,0,0,.3);cursor:pointer;text-align:left;
          font-family:inherit;
        }
        .teaser-top{display:flex;gap:11px;align-items:flex-start}
        .teaser-card b{display:block;font-size:14px;font-weight:600;margin-bottom:2px}
        .teaser-card p{font-size:14px;line-height:1.45;color:var(--text)}
        .teaser-card small{display:block;margin-top:8px;font-size:11.5px;color:var(--muted)}
        .teaser-chips{display:flex;flex-direction:column;align-items:flex-end;gap:7px;width:100%}
        .teaser-chip{
          background:var(--panel);color:var(--text);
          border:1px solid var(--line);border-radius:99px;
          padding:9px 15px;font-size:13px;font-weight:500;cursor:pointer;
          font-family:inherit;box-shadow:0 8px 24px rgba(0,0,0,.22);
          transition:background .15s,transform .12s;max-width:100%;
        }
        .teaser-chip:hover{background:var(--raised);transform:translateY(-1px)}
        /* Dismiss. Sits on the card's outer corner — away from the chips, which
           are the thing we actually want tapped. 26px is the smallest that still
           takes a thumb; the glyph is an SVG so it renders identically across the
           customer sites this lands on rather than depending on their font. */
        .teaser-close{
          position:absolute;top:-9px;${pos === "left" ? "right" : "left"}:-9px;
          width:26px;height:26px;border-radius:50%;
          border:1px solid var(--line);
          background:var(--raised);color:var(--muted);cursor:pointer;padding:0;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 12px rgba(0,0,0,.3);
          transition:background .15s,color .15s,transform .15s;
        }
        .teaser-close:hover{background:#3A3A40;color:var(--text);transform:scale(1.08)}
        .teaser-close:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

        /* Panel */
        .panel{
          position:fixed;${pos}:24px;bottom:92px;
          width:min(400px,calc(100vw - 32px));height:min(620px,calc(100vh - 128px));
          background:var(--panel);border-radius:20px;
          box-shadow:0 24px 80px rgba(0,0,0,.4);
          overflow:hidden;display:none;flex-direction:column;
          border:1px solid var(--line);
          z-index:2147483646;
          animation:slideUp .25s cubic-bezier(.16,1,.3,1);
        }
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* Header */
        .head{
          padding:16px 18px;color:var(--text);
          display:flex;align-items:center;gap:11px;flex-shrink:0;
          border-bottom:1px solid var(--line);
        }
        .head-av{display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .head-info{min-width:0;flex:1}
        .head-info b{display:block;font-size:14.5px;font-weight:600;line-height:1.25}
        .head-info span{font-size:12.5px;color:var(--muted)}
        .head-x{
          border:0;background:transparent;color:var(--muted);cursor:pointer;
          width:30px;height:30px;border-radius:8px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          transition:background .15s,color .15s;
        }
        .head-x:hover{background:var(--raised);color:var(--text)}

        /* Human handoff banner */
        .handoff-banner{
          display:none;align-items:center;gap:8px;
          background:rgba(245,158,11,.14);border-bottom:1px solid rgba(245,158,11,.28);
          padding:9px 18px;font-size:12px;font-weight:600;color:#FBBF24;
          flex-shrink:0;
        }

        /* Messages */
        .messages{
          flex:1;overflow-y:auto;padding:18px 16px;
          scroll-behavior:smooth;
        }
        /* align-items must be set: a column flex container defaults to stretch,
           which forced every bot bubble to the full 86% no matter how little was
           in it — the three-dot typing indicator rendered as a full-width bar. */
        .row{display:flex;flex-direction:column;align-items:flex-start;margin-bottom:14px}
        .row.user{align-items:flex-end}
        .row.system{align-items:center}
        .msg{
          max-width:86%;padding:11px 14px;border-radius:16px;
          font-size:14.5px;line-height:1.5;
          word-break:break-word;
          animation:fadeUp .18s ease-out both;
        }
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .msg.bot{background:var(--raised);color:var(--text)}
        .msg.user{background:var(--accent);color:#fff}
        .msg.system{
          background:transparent;border:1px solid var(--line);color:var(--muted);
          font-size:12px;text-align:center;max-width:100%;
          border-radius:99px;padding:6px 14px;
        }
        .msg p{margin:0 0 8px}
        .msg p:last-child{margin-bottom:0}
        .msg h4{font-size:14px;font-weight:600;margin:0 0 6px}

        /* Byline under a bot turn — "Fin • AI Agent • Just now" */
        .meta{margin-top:6px;font-size:11.5px;color:var(--muted)}

        /* Citations */
        .sources{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
        .sources-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
        .source{
          font-size:11.5px;color:var(--text);background:var(--raised);
          border:1px solid var(--line);border-radius:99px;padding:3px 9px;
        }

        /* Typing indicator */
        .typing-indicator{display:flex;gap:4px;padding:12px 14px;align-items:center;background:var(--raised);border-radius:16px}
        .typing-indicator span{
          width:6px;height:6px;border-radius:50%;background:var(--muted);
          animation:bounce .9s infinite;
        }
        .typing-indicator span:nth-child(2){animation-delay:.18s}
        .typing-indicator span:nth-child(3){animation-delay:.36s}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}

        /* Suggested question chips (inside the panel) */
        .chips{
          padding:0 16px 10px;
          display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;
        }
        .chip{
          border:1px solid var(--line);color:var(--text);background:transparent;
          border-radius:99px;padding:7px 13px;
          font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit;
          transition:background .15s;
        }
        .chip:hover{background:var(--raised)}

        /* Ticket form */
        .ticket-form{
          padding:12px 16px;border-top:1px solid var(--line);
          background:rgba(245,158,11,.08);display:none;flex-shrink:0;
        }
        .ticket-form p{font-size:12px;font-weight:600;color:#FBBF24;margin-bottom:8px}
        .ticket-form input{
          width:100%;border:1px solid var(--line);border-radius:10px;
          padding:9px 12px;font-size:13px;margin-bottom:6px;
          outline:none;font-family:inherit;background:var(--raised);color:var(--text);
        }
        .ticket-form input::placeholder{color:var(--muted)}
        .ticket-form input:focus{border-color:var(--accent)}
        .ticket-form button{
          width:100%;border:0;background:var(--accent);color:#fff;
          border-radius:10px;padding:10px;font-size:13px;
          font-weight:600;cursor:pointer;font-family:inherit;
          transition:opacity .15s;
        }
        .ticket-form button:hover{opacity:.9}

        /* Composer */
        .form{
          margin:0 14px 6px;padding:6px 6px 6px 14px;
          border:1px solid var(--line);border-radius:16px;
          background:var(--raised);
          display:flex;gap:8px;flex-shrink:0;align-items:center;
          transition:border-color .15s;
        }
        .form:focus-within{border-color:var(--accent)}
        .form input{
          flex:1;border:0;background:transparent;color:var(--text);
          padding:9px 0;font-size:14.5px;outline:none;font-family:inherit;
        }
        .form input::placeholder{color:var(--muted)}
        .form button{
          border:0;background:var(--accent);color:#fff;border-radius:50%;
          width:34px;height:34px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;transition:opacity .15s,transform .1s;
        }
        .form button:hover{opacity:.9}
        .form button:active{transform:scale(.94)}
        .form button:disabled{opacity:.35;cursor:not-allowed}

        .foot{
          padding:0 16px 12px;text-align:center;
          font-size:11px;color:var(--muted);flex-shrink:0;
        }

        /* Code */
        pre{overflow-x:auto;background:#101012;color:var(--text);padding:10px;border-radius:10px;font-size:12px;margin:6px 0}
        code{background:rgba(255,255,255,.08);color:var(--text);padding:1px 5px;border-radius:4px;font-size:12px}
        a{color:#fff;text-decoration:underline}
        ul,ol{padding-left:18px;margin:4px 0 8px}
        li{margin:2px 0}
        strong{font-weight:600}

        /* Scrollbar */
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:99px}

        @media (prefers-reduced-motion:reduce){
          *{animation-duration:.01ms !important;transition-duration:.01ms !important}
          /* The orb's drift is the mark itself, not an entrance flourish — but
             honour the preference by slowing it to a crawl rather than freezing
             mid-keyframe, which would leave the blobs bunched off-centre. */
          .orb i{animation-duration:40s !important;animation-iteration-count:infinite !important}
        }
      </style>

      <div class="teaser">
        <button class="teaser-close" aria-label="Dismiss these suggestions" title="Dismiss">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
            <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div class="teaser-card" role="button" tabindex="0">
          <div class="teaser-top">
            ${ORB(30)}
            <div>
              <b>Hi there 👋</b>
              <p>${esc(cfg.welcomeMessage || "How can I help?")}</p>
            </div>
          </div>
          <small>${esc(cfg.botName)} • ${fmtTime()}</small>
        </div>
        <div class="teaser-chips"></div>
      </div>

      <button class="toggle" aria-label="Open support chat">
        ${CHAT_SVG}
        <span class="badge">1</span>
      </button>

      <section class="panel" role="dialog" aria-label="${esc(cfg.botName)} support chat">
        <div class="head">
          <div class="head-av">${ORB(34)}</div>
          <div class="head-info">
            <b>${esc(cfg.botName)}</b>
            <span>The team can also help</span>
          </div>
          <button class="head-x" aria-label="Close chat">${CLOSE_SVG}</button>
        </div>

        <div class="handoff-banner">Agent connected — you're chatting with a human</div>

        <div class="messages"></div>

        <div class="chips"></div>

        <div class="ticket-form">
          <p>Let our team follow up by email</p>
          <input id="tf-name" placeholder="Your name" autocomplete="name" />
          <input id="tf-email" type="email" placeholder="Email address" autocomplete="email" />
          <button id="tf-btn">Create support ticket →</button>
        </div>

        <form class="form">
          <input
            class="msg-input"
            aria-label="Message"
            placeholder="Ask a question…"
            autocomplete="off"
            required
          />
          <button type="submit" aria-label="Send">${SEND_SVG}</button>
        </form>

        <div class="foot">Powered by ${esc(cfg.businessName || "Magnetic AI")}</div>
      </section>

      ${/* Last: ORB_FILTER reads the size set that the ORB() calls above fill in,
            and template literals evaluate left to right. */ ""}
      ${ORB_FILTER()}`;

      // ── Welcome message ─────────────────────────────────────────────────
      addMsg(cfg.welcomeMessage || "Hi! How can I help?", "bot");

      // ── Suggested chips ──────────────────────────────────────────────────
      // The same questions appear twice: inside the panel, and on the teaser so
      // a visitor can pick one without opening the chat first.
      //
      // Falls back when the bot has none configured, which is every bot by
      // default — an empty list rendered no chips at all, so the feature only
      // existed for tenants who had already found the setting. Anything set in
      // Dashboard → AI Config wins, and should: these are deliberately generic,
      // and a chip whose answer is not in the KB just earns a "I don't have that".
      //
      // "What can you help me with?" was tempting and is a trap — the model reads
      // it as small talk and answers the question with the question.
      const questions = cfg.suggestedQuestions?.length
        ? cfg.suggestedQuestions
        : ["What are your business hours?", "How do I get a refund?", "Talk to a human"];

      const chipsEl = $(".chips");
      const teaserChipsEl = $(".teaser-chips");
      const ask = (q) => {
        chipsEl.style.display = "none";
        setOpen(true);
        $(".msg-input").value = "";
        send(q);
      };

      questions.forEach((q) => {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.textContent = q;
        btn.onclick = () => ask(q);
        chipsEl.appendChild(btn);
      });
      // Three is what fits above the launcher without covering the page.
      questions.slice(0, 3).forEach((q) => {
        const btn = document.createElement("button");
        btn.className = "teaser-chip";
        btn.textContent = q;
        btn.onclick = (e) => {
          e.stopPropagation();
          ask(q);
        };
        teaserChipsEl.appendChild(btn);
      });

      // ── Teaser ───────────────────────────────────────────────────────────
      const openChat = () => setOpen(true);
      $(".teaser-card").onclick = openChat;
      $(".teaser-card").onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openChat();
        }
      };
      $(".teaser-close").onclick = (e) => {
        e.stopPropagation();
        sessionStorage.setItem(TEASER_KEY, "1");
        hideTeaser();
      };
      $(".head-x").onclick = () => setOpen(false);

      // Only pitch to someone who has not engaged yet, and only after a beat —
      // a card that lands the instant the page does reads as a popup.
      if (!sessionStorage.getItem(TEASER_KEY)) {
        setTimeout(() => {
          if (!isOpen && !sessionStorage.getItem(TEASER_KEY)) {
            const t = $(".teaser");
            if (t) t.style.display = "flex";
            const b = $(".badge");
            if (b) b.style.display = "block";
          }
        }, 2500);
      }

      // ── Create or restore session ─────────────────────────────────────────
      // Try to resume first; fall back to a fresh session if the stored token is
      // gone or the server no longer accepts it.
      if (sessionToken && conversationId) {
        try {
          // The token identifies the conversation, so sessionId is not in the URL.
          const histRes = await fetch(`${API}/api/chat/history`, { mode: "cors", headers: sessionHeaders() });
          if (histRes.ok) {
            const prevMsgs = (await histRes.json()).messages ?? [];
            if (prevMsgs.length > 0) {
              // Replace the welcome message with the real history
              msgs().innerHTML = "";
              prevMsgs.forEach((m) => addMsg(m.content, m.role === "user" ? "user" : "bot", m.createdAt));
            }
          } else {
            clearSession();
          }
        } catch {
          // Network hiccup — keep the session and let the next send retry.
        }
      }

      if (!sessionToken) await startSession();
      connectSocket();

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
            headers: sessionHeaders(),
            mode: "cors",
            body: JSON.stringify({
              customerName: name, customerEmail: email,
              description: lastUserMsg,
            }),
          });
          if (r.ok) {
            $(".ticket-form").style.display = "none";
            addMsg("Ticket created! Our team will follow up at **" + email + "** within 24 hours.", "bot");
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

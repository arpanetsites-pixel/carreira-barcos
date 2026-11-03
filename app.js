(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height;
      const escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // "cover"
      const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    const atualizarMomentos = (p) => {
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    const quadro = () => {
      alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();

/* ── Som da apresentação: trilha + efeitos sincronizados com a rolagem ──── */
(() => {
  const convite = document.querySelector(".som-convite");
  const alternar = document.querySelector(".som-alternar");
  const cine = document.querySelector(".cine");
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!alternar || !AC) { alternar && (alternar.hidden = true); convite && (convite.hidden = true); return; }

  // Volumes da trilha: alto na apresentação, baixo no resto do site, mais baixo durante os efeitos
  const VOL = { apresentacao: 0.55, site: 0.14, efeito: 0.3 };
  // Pontos da rolagem (0 a 1) em que a logo começa a borbulhar e rompe a água
  const ZONA = { ronco: 0.49, impacto: 0.643, fim: 0.95, rearmar: 0.45 };

  let ctx, mestre, trilhaGain, trilhaEl, roncoGain, roncoNo;
  const buf = {};
  let iniciado = false, ligado = false, fase = "antes", efeitoAte = 0;

  const progresso = () => {
    if (!cine) return 1;
    const r = cine.getBoundingClientRect();
    const curso = cine.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / (curso || 1)));
  };
  const naApresentacao = () => !cine || cine.getBoundingClientRect().bottom > innerHeight * 0.55;

  const decodificar = (url) => fetch(url).then((r) => r.arrayBuffer())
    .then((a) => new Promise((ok, erro) => ctx.decodeAudioData(a, ok, erro)));

  const iniciar = () => {
    ctx = new AC();
    mestre = ctx.createGain(); mestre.gain.value = 0; mestre.connect(ctx.destination);
    trilhaEl = new Audio("assets/audio/trilha.mp3");
    trilhaEl.loop = true; trilhaEl.preload = "auto";
    trilhaGain = ctx.createGain(); trilhaGain.gain.value = 0;
    ctx.createMediaElementSource(trilhaEl).connect(trilhaGain).connect(mestre);
    decodificar("assets/audio/ronco.mp3").then((b) => (buf.ronco = b)).catch(() => {});
    decodificar("assets/audio/impacto.mp3").then((b) => (buf.impacto = b)).catch(() => {});
    iniciado = true;
  };

  const rampa = (g, v, t = 0.6) => g && g.gain.setTargetAtTime(v, ctx.currentTime, t / 3);

  const tocar = (nome, ganho = 1) => {
    if (!buf[nome] || !ligado) return null;
    const no = ctx.createBufferSource(); no.buffer = buf[nome];
    const g = ctx.createGain(); g.gain.value = ganho;
    no.connect(g).connect(mestre); no.start();
    efeitoAte = ctx.currentTime + buf[nome].duration;
    return { no, g };
  };
  const pararRonco = (t = 0.35) => {
    if (!roncoNo) return;
    rampa(roncoGain, 0, t);
    const n = roncoNo; setTimeout(() => { try { n.stop(); } catch (e) {} }, t * 1000 + 100);
    roncoNo = roncoGain = null;
  };

  const ajustarTrilha = () => {
    if (!iniciado || !ligado) return;
    const alvo = ctx.currentTime < efeitoAte && naApresentacao() ? VOL.efeito
      : naApresentacao() ? VOL.apresentacao : VOL.site;
    rampa(trilhaGain, alvo, 1.8);
  };

  const sincronizar = () => {
    const p = progresso();
    if (convite) convite.classList.toggle("oculto", ligado || p > 0.08);
    if (!iniciado || !ligado) return;
    if (p < ZONA.rearmar && fase !== "antes") { pararRonco(); fase = "antes"; }
    if (fase === "antes" && p >= ZONA.ronco && p < ZONA.impacto) {
      const r = tocar("ronco", 0.9); if (r) { roncoNo = r.no; roncoGain = r.g; fase = "ronco"; }
    }
    if ((fase === "antes" || fase === "ronco") && p >= ZONA.impacto && p < ZONA.fim) {
      pararRonco(0.2); if (tocar("impacto", 1)) fase = "impacto";
    }
    ajustarTrilha();
  };

  const ligar = () => {
    if (!iniciado) iniciar();
    ligado = true;
    ctx.resume && ctx.resume();
    trilhaEl.play().catch(() => {});
    rampa(mestre, 1, 0.4);
    rampa(trilhaGain, naApresentacao() ? VOL.apresentacao : VOL.site, 2.5);
    alternar.setAttribute("aria-pressed", "true");
    alternar.setAttribute("aria-label", "Desligar som");
    sincronizar();
  };
  const desligar = () => {
    ligado = false;
    pararRonco(0.2);
    rampa(mestre, 0, 0.4);
    setTimeout(() => { if (!ligado) trilhaEl.pause(); }, 600);
    alternar.setAttribute("aria-pressed", "false");
    alternar.setAttribute("aria-label", "Ativar som");
  };

  convite && convite.addEventListener("click", ligar);
  alternar.addEventListener("click", () => (ligado ? desligar() : ligar()));
  addEventListener("scroll", sincronizar, { passive: true });
  setInterval(() => ligado && ajustarTrilha(), 700);
  document.addEventListener("visibilitychange", () => {
    if (!iniciado) return;
    if (document.hidden) ctx.suspend && ctx.suspend();
    else if (ligado) ctx.resume && ctx.resume();
  });
  sincronizar();
})();

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
      let escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // "cover"
      // Vídeo vertical (celular): mostra a largura inteira para não cortar logo e barco
      if (img.naturalHeight > img.naturalWidth) escala = cw / img.naturalWidth;
      const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
      const y = h < ch ? ch - h : (ch - h) / 2;
      // sobra no topo: estende o céu do próprio quadro (a 1ª linha esticada)
      if (y > 0) ctx.drawImage(img, 0, 0, img.naturalWidth, 2, 0, 0, cw, y + 2);
      ctx.drawImage(img, (cw - w) / 2, y, w, h);
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

  /* ── Chamada: headline que sobe palavra por palavra ───────────────────── */
  document.querySelectorAll(".chamada").forEach((chamada) => {
    let i = 0;
    chamada.querySelectorAll(".chamada-linha").forEach((linha) => {
      const partes = [];
      linha.childNodes.forEach((no) => {
        const destaque = no.nodeType === 1; // <em>aventura</em>
        no.textContent.split(/\s+/).filter(Boolean).forEach((p) => partes.push({ p, destaque }));
      });
      linha.innerHTML = partes.map(({ p, destaque }) =>
        `<span class="palavra"><span class="palavra-in${destaque ? " palavra--destaque" : ""}" style="--i:${i++}">${p}</span></span>`).join(" ");
    });
    chamada.style.setProperty("--total", i);
    if (reduzir) chamada.classList.add("visto", "solto");
    else new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { chamada.classList.add("visto"); o.disconnect(); setTimeout(() => chamada.classList.add("solto"), i * 90 + 1300); }
    }, { threshold: 0.45 }).observe(chamada);
  });

  /* ── Modelos: um barco por vez, conforme a rolagem ────────────────────── */
  const frota = document.querySelector(".frota");
  if (frota) {
    const modelos = [...frota.querySelectorAll(".modelo")];
    const contador = frota.querySelector(".frota-contador b");
    const tracos = [...frota.querySelectorAll(".frota-trilha i")];
    const n = modelos.length;

    // quebra o nome em letras (o leitor de tela continua lendo a palavra inteira)
    modelos.forEach((m) => {
      const h = m.querySelector(".modelo-nome");
      const nome = h.textContent.trim();
      h.setAttribute("aria-label", nome);
      h.innerHTML = [...nome].map((c, i) => `<span class="letra" style="--i:${i}" aria-hidden="true">${c}</span>`).join("");
    });

    // imagens dos barcos começam a baixar quando a abertura está perto do fim
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      frota.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
      o.disconnect();
    }, { rootMargin: "150% 0px" }).observe(frota);

    // números da ficha sobem do zero até o valor quando o barco chega
    const contar = (m) => {
      m.querySelectorAll("[data-conta]").forEach((el, k) => {
        const fim = Number(el.dataset.conta), atraso = 1000 + k * 120, dur = 1100;
        cancelAnimationFrame(el._raf); clearTimeout(el._t);
        el.textContent = "0";
        el._t = setTimeout(() => {
          const t0 = performance.now();
          const passo = (agora) => {
            const x = Math.min(1, (agora - t0) / dur);
            el.textContent = Math.round(fim * (1 - Math.pow(1 - x, 3)));
            if (x < 1) el._raf = requestAnimationFrame(passo);
          };
          el._raf = requestAnimationFrame(passo);
        }, atraso);
      });
    };

    let ativo = -2;
    const atualizar = () => {
      const r = frota.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const curso = frota.offsetHeight - innerHeight;
      const p = Math.min(0.9999, Math.max(0, -r.top / (curso || 1)));
      // o 1º barco entra quando a seção já tomou boa parte da tela
      const idx = r.top > innerHeight * (celular ? 0.3 : 0.62) ? -1 : Math.floor(p * n);
      const local = p * n - Math.max(0, idx);

      if (idx !== ativo) {
        modelos.forEach((m, i) => {
          m.classList.toggle("ativo", i === idx);
          m.classList.toggle("passou", i < idx);
        });
        if (idx >= 0 && contador) contador.textContent = String(idx + 1).padStart(2, "0");
        if (idx >= 0) contar(modelos[idx]);
        if (idx >= 0 && ativo !== -2) dispatchEvent(new CustomEvent("frota:troca", { detail: { de: ativo, para: idx } }));
        ativo = idx;
      }
      if (idx >= 0) modelos[idx].style.setProperty("--t", local.toFixed(3));
      tracos.forEach((t, i) => t.style.setProperty("--p", i < idx ? 1 : i === idx ? local.toFixed(3) : 0));
    };
    if (!reduzir) {
      addEventListener("scroll", () => requestAnimationFrame(atualizar), { passive: true });
      addEventListener("resize", atualizar);
      atualizar();
    }
  }

  /* ── Galeria: o piloto mostra a foto e coloca no quadro ao lado ───────── */
  const galeria = document.querySelector(".galeria");
  if (galeria) {
    const tela = galeria.querySelector(".galeria-canvas");
    const g = tela.getContext("2d");
    const quadroEl = galeria.querySelector(".galeria-quadro");
    const fotosEl = [...galeria.querySelectorAll(".galeria-foto")];
    const contador = galeria.querySelector(".galeria-contador");
    const N = fotosEl.length;
    galeria.style.setProperty("--n", N);
    if (contador) contador.innerHTML = `<b>00</b> / ${String(N).padStart(2, "0")}`;
    const contB = contador && contador.querySelector("b");

    // quadros da sequência do piloto: 1 a cada 2 do vídeo, 1600x900, verde do cartão vazado
    const BASE = "assets/galeria/";
    let info = null;
    const quadros = [];
    const fotos = fotosEl.map((el) => { const im = new Image(); im.decoding = "async"; im.src = el.currentSrc || el.src; return im; });
    const ok = (im) => im && im.complete && im.naturalWidth;

    // posição do cartão na tela: vídeo ancorado embaixo; no celular, só o lado do piloto
    const QUADRO_V = { x: 0.62, y: 0.19, w: 0.36 }; // quadro grande, em fração do vídeo (desktop)
    let L = null; // layout atual em pixels CSS
    const medir = () => {
      const W = innerWidth, H = galeria.querySelector(".galeria-palco").clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
      if (celular) {
        const corte = 0.6; // mostra 60% da largura do vídeo (piloto + cartão)
        const w = W * 1.04, h = w * (900 / (1600 * corte));
        L = { dpr, sx: 0, sw: 1600 * corte, x: (W - w) / 2, y: H - h, w, h, esc: w / (1600 * corte) };
        const qw = Math.min(W * 0.8, (H - h - 120) * (700 / 658));
        Object.assign(quadroEl.style, { left: `${(W - qw) / 2}px`, top: `${Math.max(100, (H - h - qw * 658 / 700) / 2 + 40)}px`, width: `${qw}px` });
      } else {
        let h = H * 0.86, w = h * 16 / 9;
        if (w > W) { w = W; h = w * 9 / 16; }
        L = { dpr, sx: 0, sw: 1600, x: (W - w) / 2, y: H - h, w, h, esc: w / 1600 };
        Object.assign(quadroEl.style, { left: `${L.x + QUADRO_V.x * w}px`, top: `${L.y + QUADRO_V.y * h}px`, width: `${QUADRO_V.w * w}px` });
      }
      desenhado = -1;
    };

    // homografia quadrado unitário → quadrilátero (para a foto acompanhar a perspectiva do cartão)
    const homografia = (p) => {
      const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
      const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
      const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
      let a, b, d, e, gg = 0, hh = 0;
      if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) { a = x1 - x0; b = x2 - x1; d = y1 - y0; e = y2 - y1; }
      else {
        const den = dx1 * dy2 - dx2 * dy1;
        gg = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den;
        a = x1 - x0 + gg * x1; b = x3 - x0 + hh * x3; d = y1 - y0 + gg * y1; e = y3 - y0 + hh * y3;
      }
      return (u, v) => { const z = gg * u + hh * v + 1; return [(a * u + b * v + x0) / z, (d * u + e * v + y0) / z]; };
    };
    const triangulo = (im, s0, s1, s2, d0, d1, d2) => {
      // um pouco maior que o triângulo, para não aparecer fresta entre eles
      const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
      const ex = (p) => { const vx = p[0] - cx, vy = p[1] - cy, l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * 0.8, p[1] + vy / l * 0.8]; };
      g.save();
      g.beginPath(); const a0 = ex(d0), a1 = ex(d1), a2 = ex(d2);
      g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.closePath(); g.clip();
      const u1x = s1[0] - s0[0], u1y = s1[1] - s0[1], u2x = s2[0] - s0[0], u2y = s2[1] - s0[1];
      const v1x = d1[0] - d0[0], v1y = d1[1] - d0[1], v2x = d2[0] - d0[0], v2y = d2[1] - d0[1];
      const det = u1x * u2y - u2x * u1y;
      if (Math.abs(det) > 1e-9) {
        const a = (v1x * u2y - v2x * u1y) / det, c = (v2x * u1x - v1x * u2x) / det;
        const b = (v1y * u2y - v2y * u1y) / det, d = (v2y * u1x - v1y * u2x) / det;
        g.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]);
        g.drawImage(im, 0, 0);
      }
      g.restore();
    };
    const fotoNoCartao = (im, quad) => {
      const pts = quad.map(([x, y]) => [L.x + (x - L.sx) * L.esc, L.y + y * L.esc]);
      const H = homografia(pts);
      const iw = im.naturalWidth, ih = im.naturalHeight, m = 0.035; // corta a borda branca da foto
      const sx = iw * m, sy = ih * m, sw = iw * (1 - 2 * m), sh = ih * (1 - 2 * m);
      const n = 6;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
        const s = (u, v) => [sx + u * sw, sy + v * sh];
        triangulo(im, s(u0, v0), s(u1, v0), s(u1, v1), H(u0, v0), H(u1, v0), H(u1, v1));
        triangulo(im, s(u0, v0), s(u1, v1), s(u0, v1), H(u0, v0), H(u1, v1), H(u0, v1));
      }
    };

    let desenhado = -1, desenhadoFoto = -1;
    const desenhar = (k, ciclo) => {
      if (!info || !L) return;
      // quadro pronto mais próximo
      let j = -1;
      for (let d = 0; d < info.total && j < 0; d++) { if (ok(quadros[k - d])) j = k - d; else if (ok(quadros[k + d])) j = k + d; }
      if (j < 0) return;
      const foto = j >= info.trocaFoto ? (ciclo + 1) % N : ciclo;
      if (j === desenhado && foto === desenhadoFoto) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, tela.width, tela.height);
      g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
      const q = info.quads[j];
      if (q && ok(fotos[foto])) fotoNoCartao(fotos[foto], q);
      g.drawImage(quadros[j], L.sx, 0, L.sw, 900, L.x, L.y, L.w, L.h);
      // some com as bordas do vídeo: funde no fundo da seção
      g.globalCompositeOperation = "destination-in";
      const fv = g.createLinearGradient(0, L.y, 0, L.y + L.h * 0.14);
      fv.addColorStop(0, "rgba(0,0,0,0)"); fv.addColorStop(1, "#000");
      g.fillStyle = fv; g.fillRect(0, 0, tela.width, tela.height);
      if (!celular) {
        const fh = g.createLinearGradient(L.x, 0, L.x + L.w, 0);
        fh.addColorStop(0, "rgba(0,0,0,0)"); fh.addColorStop(0.2, "#000"); fh.addColorStop(0.93, "#000"); fh.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = fh; g.fillRect(0, 0, tela.width, tela.height);
      }
      g.globalCompositeOperation = "source-over";
      desenhado = j; desenhadoFoto = foto;
    };

    // pilha de fotos: cada uma pousa num ângulo próprio, por cima das anteriores e um pouco maior
    const capa = galeria.querySelector(".galeria-capa");
    const ANG = [-6, 5, -3.5, 6.5, -5, 4];
    const DES = [[-7, 4], [6, -3], [-4, -5], [7, 3], [-6, -2], [4, 5]]; // deslocamento em % do cartão
    const escala = (i) => (N > 1 ? 0.8 + 0.22 * (i / (N - 1)) : 1); // a última é a maior
    const pousada = (i) => ({ x: DES[i % DES.length][0], y: DES[i % DES.length][1], a: ANG[i % ANG.length], s: escala(i) });
    const pos = (el, x, y, a, s, op, filtro, z) => {
      el.style.transform = `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) rotate(${a.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      el.style.opacity = op; el.style.filter = filtro; el.style.zIndex = z;
    };
    // fotos de baixo escurecem um pouco conforme a pilha cresce
    const fundo = (prof) => (prof <= 0 ? "none" : `brightness(${Math.max(0.55, 1 - prof * 0.12).toFixed(2)})`);
    // de onde a foto sai: no computador o piloto está à esquerda; no celular, embaixo
    const SAI = celular ? { x: 60, y: 115 } : { x: -62, y: 6 };
    const ENTRA = [17, 29]; // quadros da sequência em que o cartão sai da mão e pousa na pilha
    const suave = (x) => x * x * (3 - 2 * x);
    let ultimaEntrada = -1;
    const quadroGrande = (ciclo, k) => {
      const r = suave(Math.min(1, Math.max(0, (k - ENTRA[0]) / (ENTRA[1] - ENTRA[0]))));
      const topo = ciclo - 1 + r; // posição "contínua" do topo da pilha
      pos(capa, -1, 1, -1.5, 0.74, topo > 3.5 ? 0 : 1, fundo(topo + 1), 1);
      fotosEl.forEach((el, i) => {
        const f = pousada(i);
        const prof = topo - i; // quantas fotos já estão por cima desta
        if (i < ciclo || (i === ciclo && r >= 1)) {
          pos(el, f.x, f.y, f.a, f.s, prof > 4 ? 0 : 1, fundo(prof), i + 2);
        } else if (i === ciclo && r > 0) {
          // sai de onde o piloto solta o cartão (à esquerda, reto, menor) e pousa girando
          const e = r, v = 1 - e;
          pos(el, f.x + v * SAI.x, f.y + v * SAI.y, f.a * e, f.s * (0.72 + 0.28 * e) * (1 + Math.sin(e * Math.PI) * 0.05),
            Math.min(1, e * 5).toFixed(3), `brightness(${(1 + v * 0.45).toFixed(3)})`, i + 2);
        } else {
          pos(el, f.x + SAI.x, f.y + SAI.y, 0, f.s * 0.72, 0, "none", i + 2);
        }
      });
      const mostrando = ciclo + (r > 0.5 ? 1 : 0);
      if (contB) contB.textContent = String(mostrando).padStart(2, "0");
      galeria.classList.toggle("comecou", mostrando > 0);
      const marca = ciclo * 2 + (r > 0.05 ? 1 : 0);
      if (marca !== ultimaEntrada) {
        if (ultimaEntrada >= 0 && marca > ultimaEntrada && marca % 2) dispatchEvent(new CustomEvent("frota:troca"));
        ultimaEntrada = marca;
      }
    };

    let alvo = 0, atual = 0, rodando = false, visivel = false;
    const progresso = () => {
      const r = galeria.getBoundingClientRect();
      const curso = galeria.offsetHeight - innerHeight;
      return Math.min(0.99999, Math.max(0, -r.top / (curso || 1)));
    };
    const passo = () => {
      if (!info) { rodando = false; return; }
      alvo = progresso() * N;
      atual += (alvo - atual) * 0.16;
      if (Math.abs(alvo - atual) < 0.0005) atual = alvo;
      const ciclo = Math.min(N - 1, Math.floor(atual));
      const k = Math.min(info.total - 1, Math.round((atual - ciclo) * (info.total - 1)));
      desenhar(k, ciclo);
      quadroGrande(ciclo, k);
      if (visivel || atual !== alvo) requestAnimationFrame(passo); else rodando = false;
    };
    const acordar = () => { if (!rodando && info) { rodando = true; requestAnimationFrame(passo); } };

    const iniciar = () => {
      fetch(BASE + "piloto.json").then((r) => r.json()).then((d) => {
        info = d;
        const src = (i) => `${BASE}p_${String(i + 1).padStart(4, "0")}.webp`;
        const carregar = (i) => {
          if (quadros[i]) return;
          const im = new Image(); im.decoding = "async"; im.src = src(i);
          im.onload = () => { desenhado = -1; acordar(); };
          quadros[i] = im;
        };
        const fila = [];
        for (const p of [8, 4, 2, 1]) for (let i = 0; i < d.total; i += p) if (!fila.includes(i)) fila.push(i);
        let k = 0;
        const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
        lote();
        medir();
        if (reduzir) { atual = alvo = 0; desenhar(0, 0); } else acordar();
      }).catch(() => {});
      fotos.forEach((im) => (im.onload = () => { desenhado = -1; acordar(); }));
      fotosEl.forEach((el) => (el.loading = "eager"));
    };
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { iniciar(); o.disconnect(); } }, { rootMargin: "150% 0px" }).observe(galeria);
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) acordar(); }).observe(galeria);
    addEventListener("scroll", acordar, { passive: true });
    addEventListener("resize", () => { if (info) { medir(); acordar(); } });
    if (reduzir) quadroGrande(N - 1, info ? info.total : 99);
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

  /* ── Motores: orçamento direto no WhatsApp + luz que segue o mouse ───── */
  document.querySelectorAll(".motor").forEach((card) => {
    const botao = card.querySelector(".motor-botao");
    if (botao && S.whatsapp && S.whatsapp.numero) {
      const num = String(S.whatsapp.numero).replace(/\D/g, "");
      botao.href = `https://wa.me/${num}?text=${encodeURIComponent(`Olá! Gostaria de solicitar um orçamento do motor ${card.dataset.motor}.`)}`;
      botao.target = "_blank"; botao.rel = "noopener";
    }
    if (reduzir || !matchMedia("(hover: hover)").matches) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${x * 100}%`); card.style.setProperty("--my", `${y * 100}%`);
      card.style.setProperty("--rx", `${(0.5 - y) * 6}deg`); card.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
    });
    card.addEventListener("pointerleave", () => ["--mx", "--my", "--rx", "--ry"].forEach((v) => card.style.removeProperty(v)));
  });

  /* ── Soluções: WhatsApp com o serviço escolhido + luz que segue o mouse ─ */
  document.querySelectorAll(".solucao").forEach((card) => {
    const link = card.querySelector(".solucao-link");
    if (link && S.whatsapp && S.whatsapp.numero) {
      const num = String(S.whatsapp.numero).replace(/\D/g, "");
      link.href = `https://wa.me/${num}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre ${card.dataset.servico}.`)}`;
      link.target = "_blank"; link.rel = "noopener";
    }
    if (reduzir || !matchMedia("(hover: hover)").matches) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`); card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    card.addEventListener("pointerleave", () => ["--mx", "--my"].forEach((v) => card.style.removeProperty(v)));
  });

  /* ── Menu do celular ──────────────────────────────────────────────────── */
  const botaoMenu = document.querySelector(".menu-botao");
  const menuMovel = document.getElementById("menu-movel");
  if (botaoMenu && menuMovel) {
    const linksMenu = [...menuMovel.querySelectorAll("[data-secao]")];
    const secoes = linksMenu.map((a) => document.getElementById(a.dataset.secao)).filter(Boolean);
    const marcarAtual = () => {
      const meio = innerHeight * 0.4;
      let atual = secoes[0];
      secoes.forEach((sec) => { if (sec.getBoundingClientRect().top <= meio) atual = sec; });
      linksMenu.forEach((a) => a.classList.toggle("atual", !!atual && a.dataset.secao === atual.id));
    };
    const zap = menuMovel.querySelector(".menu-movel-whats");
    if (zap && whats) zap.href = whats.href;
    let fecharTimer;
    const aberto = () => document.body.classList.contains("menu-aberto");
    const abrir = () => {
      clearTimeout(fecharTimer);
      marcarAtual();
      menuMovel.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("menu-aberto")));
      botaoMenu.setAttribute("aria-expanded", "true");
      botaoMenu.setAttribute("aria-label", "Fechar menu");
      document.documentElement.style.overflow = "hidden";
    };
    const fechar = () => {
      document.body.classList.remove("menu-aberto");
      botaoMenu.setAttribute("aria-expanded", "false");
      botaoMenu.setAttribute("aria-label", "Abrir menu");
      document.documentElement.style.overflow = "";
      fecharTimer = setTimeout(() => { menuMovel.hidden = true; }, 420);
    };
    botaoMenu.addEventListener("click", () => (aberto() ? fechar() : abrir()));
    menuMovel.addEventListener("click", (ev) => {
      const a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      ev.preventDefault();
      const alvo = document.querySelector(a.getAttribute("href"));
      fechar();
      // salta direto: rolar suave por cima da abertura de 720vh ficaria lento e travado
      requestAnimationFrame(() => alvo && alvo.scrollIntoView({ behavior: "instant", block: "start" }));
    });
    addEventListener("keydown", (ev) => { if (ev.key === "Escape" && aberto()) fechar(); });
    matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches && aberto()) fechar(); });
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

/* ── Som da apresentação: efeitos sincronizados com a rolagem ─────────── */
(() => {
  const convite = document.querySelector(".som-convite");
  const alternar = document.querySelector(".som-alternar");
  const cine = document.querySelector(".cine");
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!alternar || !AC) { alternar && (alternar.hidden = true); convite && (convite.hidden = true); return; }

  // Pontos da rolagem (0 a 1) em que a água começa a borbulhar e a logo rompe a superfície.
  // O celular usa um vídeo vertical próprio, com outro tempo.
  const celular = matchMedia("(max-width: 760px)").matches;
  const ZONA = celular
    ? { ronco: 0.545, impacto: 0.62, fim: 0.95, rearmar: 0.5 }
    : { ronco: 0.49, impacto: 0.643, fim: 0.95, rearmar: 0.45 };

  let ctx, mestre, roncoGain, roncoNo;
  const buf = {};
  let iniciado = false, ligado = false, fase = "antes";

  const progresso = () => {
    if (!cine) return 1;
    const r = cine.getBoundingClientRect();
    const curso = cine.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / (curso || 1)));
  };

  const decodificar = (url) => fetch(url).then((r) => r.arrayBuffer())
    .then((a) => new Promise((ok, erro) => ctx.decodeAudioData(a, ok, erro)));

  const iniciar = () => {
    ctx = new AC();
    mestre = ctx.createGain(); mestre.gain.value = 0; mestre.connect(ctx.destination);
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
    return { no, g };
  };
  const pararRonco = (t = 0.35) => {
    if (!roncoNo) return;
    rampa(roncoGain, 0, t);
    const n = roncoNo; setTimeout(() => { try { n.stop(); } catch (e) {} }, t * 1000 + 100);
    roncoNo = roncoGain = null;
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
  };

  const ligar = () => {
    if (!iniciado) iniciar();
    ligado = true;
    ctx.resume && ctx.resume();
    // toca um silêncio curto no próprio clique: destrava o áudio no iPhone
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start();
    rampa(mestre, 1, 0.3);
    alternar.setAttribute("aria-pressed", "true");
    alternar.setAttribute("aria-label", "Desligar som");
    sincronizar();
  };
  const desligar = () => {
    ligado = false;
    pararRonco(0.2);
    rampa(mestre, 0, 0.3);
    alternar.setAttribute("aria-pressed", "false");
    alternar.setAttribute("aria-label", "Ativar som");
  };

  // "Whoosh" de passagem a cada barco: ruído filtrado com varredura, gerado na hora (sem arquivo)
  let ultimoWhoosh = 0;
  const whoosh = () => {
    if (!iniciado || !ligado || ctx.state !== "running") return;
    const agora = ctx.currentTime;
    if (agora - ultimoWhoosh < 0.35) return; // rolagem rápida não vira metralhadora
    ultimoWhoosh = agora;
    const dur = 1.1;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const fonte = ctx.createBufferSource(); fonte.buffer = b;
    const filtro = ctx.createBiquadFilter(); filtro.type = "bandpass"; filtro.Q.value = 1.4;
    filtro.frequency.setValueAtTime(300, agora);
    filtro.frequency.exponentialRampToValueAtTime(2400, agora + dur * 0.45);
    filtro.frequency.exponentialRampToValueAtTime(500, agora + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, agora);
    g.gain.exponentialRampToValueAtTime(0.32, agora + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, agora + dur);
    fonte.connect(filtro).connect(g).connect(mestre);
    fonte.start(agora); fonte.stop(agora + dur);
  };
  addEventListener("frota:troca", whoosh);

  convite && convite.addEventListener("click", ligar);
  alternar.addEventListener("click", () => (ligado ? desligar() : ligar()));
  addEventListener("scroll", sincronizar, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!iniciado) return;
    if (document.hidden) ctx.suspend && ctx.suspend();
    else if (ligado) ctx.resume && ctx.resume();
  });
  sincronizar();
})();

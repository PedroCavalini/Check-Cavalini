"use strict";
var C = [
    ["A", "Pneus e rodas", ["!Pneus dianteiros", "!Pneus traseiros", "!Desgaste e profundidade dos sulcos", "!Calibragem aparente", "!Cortes, bolhas ou deformações", "Rodas e aros", "!Porcas e fixação das rodas", "Estepe"]],
    ["B", "Freios", ["!Lonas de freio *", "!Tambores de freio *", "!Cubos de roda *", "!Sistema de freio pneumático", "!Reservatórios de ar", "!Mangueiras e conexões", "!Vazamentos de ar", "!Freio de estacionamento", "!Indicadores e alertas do sistema de freios"]],
    ["C", "Suspensão e direção", ["Molejo e feixes de molas *", "Grampos e suportes de fixação *", "Amortecedores *", "Buchas e componentes da suspensão *", "!Barra de direção *", "!Terminais da barra de direção *", "!Caixa de direção *", "!Volante e folgas na direção", "Demais componentes da suspensão e direção *"]],
    ["D", "Motor e transmissão", ["Nível do óleo do motor", "Nível do líquido de arrefecimento", "Vazamentos de óleo", "Vazamentos de água ou arrefecimento", "Correias e mangueiras *", "Funcionamento do motor", "Embreagem *", "Caixa de câmbio *", "Cardan e cruzetas *", "Diferencial *", "Ruídos ou vibrações anormais"]],
    ["E", "Sistema elétrico", ["Bateria", "!Faróis baixos e altos", "Lanternas dianteiras e traseiras", "!Luzes de freio", "!Luzes de direção e pisca-alerta", "Luzes de ré", "Iluminação interna", "Painel de instrumentos", "Buzina", "!Limpadores de para-brisa", "Indicadores e luzes de advertência"]],
    ["F", "Carroceria e estrutura", ["!Para-brisa e vidros", "!Retrovisores", "!Portas de acesso", "Fechaduras e travas", "Degraus e corrimãos", "Bancos e assentos", "Cintos de segurança", "Piso e revestimentos", "Estrutura e carroceria", "Ausência de peças soltas ou danificadas"]],
    ["G", "Equipamentos obrigatórios e segurança", ["!Extintor de incêndio (validade e carga)", "!Triângulo de sinalização", "Macaco e ferramentas", "!Saídas de emergência", "!Martelos de emergência", "Cintos e equipamentos de segurança", "Demais itens obrigatórios conforme a legislação"]],
    ["H", "Itens específicos de ônibus", ["!Abertura e fechamento das portas", "Campainhas e sinalização interna", "Ar-condicionado", "Ventilação interna", "Tacógrafo", "Câmeras e monitoramento", "Condições gerais do salão de passageiros", "Identificação visual e adesivos da empresa"]]
];
var PR = ["Baixa", "Média", "Alta", "Crítica"],
    RL = { bom: "Bom", regular: "Regular", ruim: "Ruim", na: "N/A" };
var S, DB = null,
    ALL = [],
    UID = null,
    DK = "cavalini-rascunho";

function $(i) { return document.getElementById(i) }

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }

function nm(s) { return s.replace(/^!/, "").replace(/ \*$/, "") }

function toast(m, bad) {
    var t = $("toast");
    t.textContent = m;
    t.style.display = "block";
    t.style.background = bad ? "var(--ba)" : "var(--ok)";
    t.style.color = "#fff";
    clearTimeout(t._h);
    t._h = setTimeout(function() { t.style.display = "none" }, 4500)
}

function today() { var d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) }

function br(s) { return s ? s.split("-").reverse().join("/") : "—" }

function hm(t) { return t ? new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" }

function fresh() { return { id: null, opid: (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)), dv: today(), tipo: "Antes de iniciar a operação", just: "", ini: Date.now(), placa: "", frota: "", km: "", motorista: "", it: {}, extras: [], obs: "", geral: "", resp: "", conf: false, sig: "" } }

function save() { try { localStorage.setItem(DK, JSON.stringify(S)) } catch (e) {} }

function load() { try { var d = localStorage.getItem(DK); return d ? JSON.parse(d) : null } catch (e) { return null } }

function clr() { try { localStorage.removeItem(DK) } catch (e) {} }

function entries() {
    var o = [];
    C.forEach(function(c, ci) { c[2].forEach(function(s, i) { o.push({ k: ci + "-" + i, cat: c[0] + ". " + c[1], name: nm(s), saf: s[0] == "!", mec: / \*$/.test(s) }) }) });
    S.extras.forEach(function(s, i) { o.push({ k: "I-" + i, cat: "I. Outros componentes", name: s, saf: false, mec: false }) });
    return o
}

function analyze(d, es) {
    var P = [],
        crit = false,
        ruim = false,
        alta = false,
        pend = 0;
    es.forEach(function(e) { var v = d.it[e.k] || {}; if (!v.r) { pend++; return } if (v.r == "regular" || v.r == "ruim") { P.push({ e: e, r: v.r, p: v.p || "Média", o: v.o || "" }); if (v.r == "ruim") ruim = true; if (v.p == "Alta") alta = true; if (v.p == "Crítica" || (e.saf && v.r == "ruim")) crit = true } });
    var st = crit ? "bad" : (ruim || alta) ? "warn" : P.length ? "warn" : "ok";
    var tx = crit ? "NÃO LIBERAR o veículo até a avaliação do responsável técnico" : (ruim || alta) ? "Problemas registrados: a liberação depende da decisão do responsável técnico" : P.length ? "Itens com atenção registrados: acompanhar na manutenção" : "Nenhum problema registrado nesta inspeção";
    return { P: P, crit: crit, st: st, tx: tx, pend: pend }
}

function summ(d) {
    var es = [];
    var bk = S;
    S = d;
    es = entries();
    S = bk;
    var a = analyze(d, es);
    var h = '<h2>Inspeção — ' + esc(d.placa) + ' · Frota ' + esc(d.frota) + '</h2><p class="mu">Data da vistoria: <b>' + br(d.dia) + '</b> · ' + esc(d.tipo || "") + ' · Início ' + hm(d.ini) + ' · Conclusão ' + hm(d.fim) + '<br>Enviado em ' + esc(d.dt || "") + ' (' + esc(d.fuso || "") + ') · Checklist v' + esc(d.ver || "1.0") + '<br>KM ' + esc(d.km) + ' · Motorista: ' + esc(d.motorista) + (d.just ? '<br>Justificativa da data anterior: ' + esc(d.just) : '') + '<br>ID: ' + esc(d.opid || '') + '</p><div class="ban ' + a.st + '">' + esc(a.tx) + '</div><p class="mu">Este registro não é uma aprovação do veículo e não substitui a decisão do responsável técnico.</p>';
    h += '<h2>Problemas registrados (' + a.P.length + ')</h2>';
    if (!a.P.length) h += '<p class="mu">Nenhum.</p>';
    else {
        h += '<div class="sc"><table><tr><th>Item</th><th>Situação</th><th>Prioridade</th><th>Observação</th></tr>';
        a.P.forEach(function(x) { h += '<tr><td>' + esc(x.e.name) + (x.e.saf ? ' <span class="tag s">segurança</span>' : '') + '<br><span class="mu">' + esc(x.e.cat) + '</span></td><td>' + RL[x.r] + '</td><td>' + x.p + '</td><td>' + esc(x.o) + '</td></tr>' });
        h += '</table></div>'
    }
    if (d.obs) h += '<h2>Observações e problemas identificados</h2><p>' + esc(d.obs).replace(/\n/g, "<br>") + '</p>';
    h += '<h2>Itens avaliados</h2><div class="sc"><table>';
    var last = "";
    es.forEach(function(e) {
        if (e.cat != last) {
            h += '<tr><th colspan="2">' + esc(e.cat) + '</th></tr>';
            last = e.cat
        }
        var v = d.it[e.k] || {};
        h += '<tr><td>' + esc(e.name) + '</td><td>' + (v.r ? RL[v.r] : "—") + '</td></tr>'
    });
    h += '</table></div>';
    if (d.geral) h += '<h2>Observações gerais</h2><p>' + esc(d.geral).replace(/\n/g, "<br>") + '</p>';
    h += '<p>Responsável: <b>' + esc(d.resp || d.motorista) + '</b></p>' + (d.sig ? '<img src="' + d.sig + '" alt="Assinatura" style="max-width:240px;border-bottom:1px solid #888">' : '');
    return h
}

function row(e) {
    var v = S.it[e.k] || {};
    var h = '<div class="it" id="r-' + e.k + '"><div class="n">' + esc(e.name) + (e.saf ? '<span class="tag s">segurança</span>' : '') + (e.mec ? '<span class="tag">verif. técnica</span>' : '') + '</div><div class="rt">';
    ["bom", "regular", "ruim", "na"].forEach(function(r) { h += '<button type="button" class="' + r + (v.r == r ? " on" : "") + '" onclick="rate(\'' + e.k + '\',\'' + r + '\')">' + RL[r] + '</button>' });
    h += '</div>';
    if (v.r == "regular" || v.r == "ruim") {
        h += '<div class="ex"><label>Observação deste item</label><textarea rows="2" oninput="S.it[\'' + e.k + '\'].o=this.value;save()">' + esc(v.o || "") + '</textarea><label>Prioridade</label><select onchange="S.it[\'' + e.k + '\'].p=this.value;save();banner()">';
        PR.forEach(function(p) { h += '<option' + (v.p == p ? " selected" : "") + '>' + p + '</option>' });
        h += '</select>';
        if (e.saf && v.r == "ruim") h += '<div class="ban bad" style="margin:8px 0 0">Item de segurança em estado ruim: não liberar o veículo até avaliação do responsável técnico.</div>';
        h += '</div>'
    }
    return h + '</div>'
}

function rate(k, r) {
    var e = entries().filter(function(x) { return x.k == k })[0];
    var v = S.it[k] || {};
    if (v.r == r) return;
    var np = r == "ruim" ? (e.saf ? "Crítica" : "Alta") : r == "regular" ? "Média" : "";
    S.it[k] = { r: r, o: v.o || "", p: (r == "regular" || r == "ruim") ? np : "" };
    $("r-" + k).outerHTML = row(e);
    save();
    banner();
    counts()
}

function counts() {
    C.forEach(function(c, ci) {
        var n = 0;
        c[2].forEach(function(s, i) { if ((S.it[ci + "-" + i] || {}).r) n++ });
        var el = $("cn-" + ci);
        if (el) el.textContent = n + "/" + c[2].length
    })
}

function banner() {
    var a = analyze(S, entries());
    var b = $("live");
    if (!b) return;
    b.className = "ban " + a.st;
    b.textContent = a.crit ? "Atenção: há indício de falha de segurança. Não liberar o veículo até a avaliação do responsável técnico." : "Pendentes: " + a.pend + " item(ns) · Problemas: " + a.P.length;
}

function f(k, v) {
    S[k] = v;
    save()
}

function form() {
    var h = '<div id="live" class="ban ok"></div><div class="card"><h2>1. Identificação do veículo</h2><div class="g2"><div><label>Placa *</label><input id="placa" value="' + esc(S.placa) + '" maxlength="8" autocapitalize="characters" oninput="this.value=this.value.toUpperCase();f(\'placa\',this.value)"></div><div><label>Número de frota *</label><input id="frota" value="' + esc(S.frota) + '" oninput="f(\'frota\',this.value)"></div><div><label>Quilometragem atual (KM) *</label><input id="km" type="number" inputmode="numeric" min="0" value="' + esc(S.km) + '" oninput="f(\'km\',this.value)"></div><div><label>Motorista / responsável *</label><input id="motorista" value="' + esc(S.motorista) + '" oninput="f(\'motorista\',this.value)"></div></div><div class="g2"><div><label>Data da vistoria *</label><input id="dv" type="date" value="' + esc(S.dv) + '" onchange="dvch(this.value)"></div><div><label>Tipo de vistoria *</label><select id="tipo" onchange="f(\'tipo\',this.value)">' + TIPOS.map(function(t) { return "<option" + (S.tipo == t ? " selected" : "") + ">" + t + "</option>" }).join("") + '</select></div></div><div id="jw" class="hide"><label>Justificativa da data anterior *</label><textarea id="just" rows="2" oninput="f(\'just\',this.value)">' + esc(S.just) + '</textarea></div><p class="mu">Início: registrado ao abrir. Conclusão e envio: registrados ao finalizar, pelo relógio do aparelho (este ambiente não fornece hora do servidor).</p></div><h2 style="margin:6px 2px">2. Itens de inspeção</h2><p class="mu" style="margin:0 2px 10px">O motorista faz a verificação visual. Itens marcados “verif. técnica” devem ser confirmados por mecânico qualificado. Marque “N/A” se o item não existir no veículo.</p>';
    C.forEach(function(c, ci) {
        h += '<details class="cat"' + (ci == 0 ? " open" : "") + '><summary><span>' + c[0] + '. ' + c[1] + '</span><span class="mu" id="cn-' + ci + '"></span></summary><div>';
        c[2].forEach(function(s, i) { h += row({ k: ci + "-" + i, name: nm(s), saf: s[0] == "!", mec: / \*$/.test(s) }) });
        h += '</div></details>'
    });
    h += '<details class="cat"><summary><span>I. Outros componentes</span></summary><div id="ext">';
    S.extras.forEach(function(s, i) { h += row({ k: "I-" + i, name: s, saf: false, mec: false }) });
    h += '<div class="g2" style="margin-top:10px"><input id="newx" placeholder="Nome do componente"><button type="button" class="btn sec" onclick="addx()">Adicionar item</button></div></div></details>';
    h += '<div class="card"><h2>3. Observações e problemas identificados</h2><textarea rows="5" placeholder="Defeitos, ruídos, peças desgastadas, reparos necessários..." oninput="f(\'obs\',this.value)">' + esc(S.obs) + '</textarea><p class="mu">Anexo de fotos: não disponível nesta versão.</p></div>';
    h += '<div class="card"><h2>4. Finalização</h2><label>Observações gerais</label><textarea rows="3" oninput="f(\'geral\',this.value)">' + esc(S.geral) + '</textarea><label>Nome do responsável pela inspeção *</label><input id="resp" value="' + esc(S.resp) + '" oninput="f(\'resp\',this.value)"><label>Assinatura digital (desenhe com o dedo)</label><canvas id="sg" width="600" height="240"></canvas><button type="button" class="btn sec sm" onclick="clsig()">Limpar assinatura</button><label style="display:flex;gap:10px;align-items:center;margin-top:14px"><input type="checkbox" id="conf" style="width:26px;height:26px" ' + (S.conf ? "checked" : "") + ' onchange="f(\'conf\',this.checked)">Confirmo que realizei esta inspeção.</label><div class="row"><button class="btn sec" onclick="draft()">Salvar como rascunho</button><button class="btn sec" onclick="prv()">Prévia do PDF</button><button class="btn" id="fin" onclick="fin()">Finalizar checklist</button></div></div>';
    $("v-nova").innerHTML = h;
    $("dv").max = today();
    jw();
    banner();
    counts();
    sig()
}
var TIPOS = ["Antes de iniciar a operação", "Após o término da operação", "Periódica", "Extraordinária", "Após manutenção", "Após identificação de defeito", "Retorno à operação"];

function jw() { $("jw").classList.toggle("hide", !(S.dv && S.dv < today())) }

function dvch(v) {
    f("dv", v);
    jw()
}

function addx() {
    var i = $("newx"),
        t = i.value.trim();
    if (!t) { toast("Digite o nome do componente.", 1); return }
    S.extras.push(t);
    save();
    var k = "I-" + (S.extras.length - 1);
    var d = document.createElement("div");
    d.innerHTML = row({ k: k, name: t, saf: false, mec: false });
    $("ext").insertBefore(d.firstChild, i.parentNode);
    i.value = "";
    banner()
}

function sig() {
    var c = $("sg");
    if (!c) return;
    var x = c.getContext("2d"),
        dn = false;
    x.lineWidth = 3;
    x.lineCap = "round";
    x.strokeStyle = "#000";
    if (S.sig) {
        var im = new Image();
        im.onload = function() { x.drawImage(im, 0, 0, c.width, c.height) };
        im.src = S.sig
    }

    function p(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height] }
    c.onpointerdown = function(e) {
        dn = true;
        var q = p(e);
        x.beginPath();
        x.moveTo(q[0], q[1]);
        c.setPointerCapture(e.pointerId)
    };
    c.onpointermove = function(e) {
        if (!dn) return;
        var q = p(e);
        x.lineTo(q[0], q[1]);
        x.stroke()
    };
    c.onpointerup = function() {
        if (dn) {
            dn = false;
            S.sig = c.toDataURL("image/png");
            save()
        }
    }
}

function clsig() {
    var c = $("sg");
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    S.sig = "";
    save()
}

function draft() {
    save();
    toast("Rascunho salvo neste aparelho.")
}

function need(id, ok) { var e = $(id); if (e) e.classList.toggle("err", !ok); return ok }
async function fin() {
    var ok = true;
    ["placa", "frota", "km", "motorista", "resp"].forEach(function(k) { if (!need(k, String(S[k]).trim() !== "")) ok = false });
    if (!S.dv) {
        need("dv", false);
        ok = false
    } else if (S.dv > today()) {
        need("dv", false);
        toast("A data da vistoria não pode ser futura.", 1);
        window.scrollTo(0, 0);
        return
    } else need("dv", true);
    if (S.dv && S.dv < today() && !String(S.just).trim()) {
        need("just", false);
        ok = false
    } else need("just", true);
    if (!ok) {
        toast("Preencha os campos obrigatórios destacados (data anterior exige justificativa).", 1);
        window.scrollTo(0, 0);
        return
    }
    var es = entries(),
        a = analyze(S, es);
    if (a.pend) { toast("Faltam " + a.pend + " item(ns) sem avaliação. Marque Bom, Regular, Ruim ou N/A.", 1); return }
    if (!S.conf) { toast("Confirme que a inspeção foi realizada.", 1); return }
    if (!DB) {
        alert("Banco de dados indisponível. Entre na sua conta, recarregue a página e tente de novo. O rascunho foi mantido.");
        toast("Não foi possível salvar: banco de dados indisponível. Abra o link entrando na sua conta. O rascunho continua neste aparelho.", 1);
        return
    }
    var d = JSON.parse(JSON.stringify(S));
    d.dt = new Date().toLocaleString("pt-BR");
    d.ts = Date.now();
    d.fim = d.ts;
    d.dia = S.dv;
    d.fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
    d.ver = "1.0";
    d.nprob = a.P.length;
    d.crit = a.crit;
    d.sit = a.st;
    d.sitx = a.tx;
    d.by = UID || null;
    delete d.id;
    d = JSON.parse(JSON.stringify(d));
    $("fin").disabled = true;
    try {
        var ins = await SB.from("inspecoes").insert({ id: S.opid, dia: d.dia, placa: d.placa, frota: d.frota, km: parseInt(d.km, 10) || null, motorista: d.motorista, resp: d.resp, nprob: d.nprob, critica: d.crit, situacao: d.sit, dados: d });
        if (ins.error && ins.error.code != "23505") throw ins.error;
        clr();
        S = fresh();
        toast("Checklist finalizado e salvo com sucesso.");
        d.id = d.opid;
        reload();
        show("det");
        $("v-det").innerHTML = '<div class="card">' + summ(d) + '<div class="row"><button class="btn" onclick="prn()">Gerar PDF / imprimir</button><button class="btn sec" onclick="baixar()">Baixar relatório</button><button class="btn sec" onclick="show(\'painel\')">Voltar ao painel</button></div></div>';
        D = d
    } catch (e) {
        $("fin").disabled = false;
        var m = "Erro ao salvar (" + (e && e.code || "desconhecido") + "): " + (e && e.message || "tente novamente") + ". Seus dados continuam no aparelho.";
        toast(m, 1);
        alert(m)
    }
}
var D = null;

function prv() {
    D = JSON.parse(JSON.stringify(S));
    D.dia = S.dv;
    D.dt = new Date().toLocaleString("pt-BR");
    D.fim = Date.now();
    prn()
}
async function baixar() {
    try {
        var h = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Vistoria</title><style>body{font:14px Arial;max-width:800px;margin:20px auto}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;padding:4px;text-align:left}.ban{border:2px solid #000;padding:8px;font-weight:bold}</style></head><body><h1>Transporte Cavalini — Relatório de Vistoria Veicular</h1>' + summ(D) + '</body></html>';
        var a = document.createElement("a");
        a.href = window.URL.createObjectURL(new Blob([h], { type: "text/html" }));
        a.download = "vistoria-" + D.placa + "-" + D.dia + ".html";
        document.body.appendChild(a);
        a.click();
        a.remove()
    } catch (e) { toast("Não foi possível baixar: " + (e && e.message || "erro"), 1) }
}

function prn() {
    $("prt").innerHTML = '<h1>Transporte Cavalini — Checklist de inspeção</h1>' + summ(D);
    window.print()
}

function pill(d) { return '<span class="pill ' + (d.sit || "ok") + '">' + (d.crit ? "Não liberar" : d.sit == "warn" ? "Atenção" : "Sem problemas") + '</span>' }

function dash() {
    var tdy = today(),
        last = {};
    ALL.forEach(function(d) { var k = d.placa; if (!last[k] || d.ts > last[k].ts) last[k] = d });
    var L = Object.keys(last).map(function(k) { return last[k] });
    var prob = L.filter(function(d) { return d.nprob > 0 }),
        cr = L.filter(function(d) { return d.crit }),
        pe = L.filter(function(d) { return d.dia != tdy });
    var h = '<div class="kp"><div><b>' + ALL.length + '</b><span>Inspeções realizadas</span></div><div><b>' + pe.length + '</b><span>Ônibus sem inspeção hoje</span></div><div><b>' + prob.length + '</b><span>Veículos com problemas</span></div><div><b style="color:var(--ba)">' + cr.length + '</b><span>Críticos (não liberar)</span></div></div>';
    h += '<div class="card"><h2>Exigem atenção</h2>' + (cr.length ? cr.map(function(d) { return '<p><b>' + esc(d.placa) + '</b> · Frota ' + esc(d.frota) + ' · ' + esc(d.dt) + '</p>' }).join("") : '<p class="mu">Nenhum problema crítico na última inspeção de cada ônibus.</p>') + '</div>';
    h += '<div class="card"><h2>Pendentes hoje</h2><p class="mu">Considera os ônibus que já têm histórico e ainda não foram inspecionados hoje.</p>' + (pe.length ? pe.map(function(d) { return esc(d.placa) + ' (frota ' + esc(d.frota) + ')' }).join(" · ") : '<p>Nenhum.</p>') + '</div><div class="card"><h2>Inspeções recentes</h2>' + tbl(ALL.slice(0, 8)) + '</div>';
    $("v-painel").innerHTML = h
}

function tbl(L) {
    if (!L.length) return '<p class="mu">Nenhuma inspeção registrada.</p>';
    var h = '<div class="sc"><table><tr><th>Vistoria</th><th>Envio</th><th>Placa</th><th>Frota</th><th>KM</th><th>Responsável</th><th>Probl.</th><th>Situação</th></tr>';
    L.forEach(function(d) { h += '<tr class="cl" onclick="det(\'' + d.id + '\')"><td>' + br(d.dia) + '</td><td>' + esc(d.dt) + '</td><td>' + esc(d.placa) + '</td><td>' + esc(d.frota) + '</td><td>' + esc(d.km) + '</td><td>' + esc(d.resp) + '</td><td>' + d.nprob + '</td><td>' + pill(d) + '</td></tr>' });
    return h + '</table></div>'
}

function hist() {
    var h = '<div class="card"><h2>Histórico de inspeções</h2><div class="g2"><input id="qp" placeholder="Buscar por placa" oninput="hl()"><input id="qf" placeholder="Número de frota" oninput="hl()"></div><label>Data</label><input id="qd" type="date" onchange="hl()"></div><div class="card" id="hl"></div>';
    $("v-hist").innerHTML = h;
    hl()
}

function hl() {
    var p = ($("qp") || { value: "" }).value.toUpperCase(),
        fr = $("qf").value.toLowerCase(),
        dt = $("qd").value;
    $("hl").innerHTML = tbl(ALL.filter(function(d) { return (!p || d.placa.indexOf(p) >= 0) && (!fr || String(d.frota).toLowerCase().indexOf(fr) >= 0) && (!dt || d.dia == dt) }))
}

function det(id) {
    D = ALL.filter(function(d) { return d.id == id })[0];
    show("det");
    $("v-det").innerHTML = '<div class="card">' + summ(D) + '<div class="row"><button class="btn" onclick="prn()">Gerar PDF / imprimir</button><button class="btn sec" onclick="baixar()">Baixar relatório</button><button class="btn sec" onclick="show(\'hist\')">Voltar</button></div></div>'
}

function show(v) {
    ["painel", "nova", "hist", "det"].forEach(function(x) { $("v-" + x).classList.toggle("hide", x != v) });
    document.querySelectorAll("nav button").forEach(function(b) { b.classList.toggle("on", b.dataset.v == v) });
    if (v == "hist") hist();
    if (v == "painel") dash();
    window.scrollTo(0, 0)
}
document.querySelectorAll("nav button").forEach(function(b) { b.onclick = function() { show(b.dataset.v) } });
$("logo").onclick = function() { $("lf").click() };
$("lf").onchange = function() {
    var f0 = this.files[0];
    if (!f0) return;
    var r = new FileReader();
    r.onload = function() { $("logo").innerHTML = '<img src="' + r.result + '" alt="Logotipo">'; try { localStorage.setItem("cavalini-logo", r.result) } catch (e) {} };
    r.readAsDataURL(f0)
};
try { var lg = localStorage.getItem("cavalini-logo"); if (lg) $("logo").innerHTML = '<img src="' + lg + '" alt="Logotipo">' } catch (e) {}
S = Object.assign(fresh(), load() || {});
form();
dash();
var SB = window.supabase.createClient("https://vhvewkfcewiaqllwgjpr.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodmV3a2ZjZXdpYXFsbHdnanByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5ODQ1NjQsImV4cCI6MjEwODU2MDU2NH0.ewu_8Oh896cUZLWNJiY3VMqbUcxcjMkbvADyvubRiec");

function lgv(on) {
    $("lg").style.display = on ? "flex" : "none";
    $("lo").style.display = on ? "none" : ""
}
async function login() {
    var r = await SB.auth.signInWithPassword({ email: $("le").value.trim(), password: $("lp").value });
    if (r.error) { $("lm").textContent = "E-mail ou senha incorretos."; return }
    $("lm").textContent = "";
    $("lp").value = "";
    start(r.data.user)
}
async function logout() {
    await SB.auth.signOut();
    ALL = [];
    UID = null;
    DB = null;
    lgv(true);
    dash()
}

function rowToD(r) {
    var d = r.dados || {};
    d.id = r.id;
    d.ts = new Date(r.criado_em).getTime();
    d.dt = new Date(r.criado_em).toLocaleString("pt-BR");
    d.dia = r.dia;
    return d
}
async function reload() {
    var r = await SB.from("inspecoes").select("*").order("criado_em", { ascending: false }).limit(500);
    if (r.error) { toast("Erro ao carregar histórico: " + r.error.message, 1); return }
    ALL = r.data.map(rowToD);
    dash();
    if (!$("v-hist").classList.contains("hide")) hl()
}

function start(u) {
    UID = u.id;
    DB = SB;
    lgv(false);
    reload()
}
(async function() {
    try {
        var g = await SB.auth.getSession();
        if (g.data && g.data.session) start(g.data.session.user);
        else lgv(true)
    } catch (e) { lgv(true) }
})();
setInterval(function() { if (DB && UID) reload() }, 60000);
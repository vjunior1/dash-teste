// ==========================================
// CONFIGURAÇÕES E GIDS DAS ABAS DO GOOGLE SHEETS
// ==========================================
const SHEET_ID = '10Lts1kA9GD1bjSlR1HoLi3mIJBBCXc58tf-jCgOq-lc';
const GID_CAPTACAO_POLO = '680288164';
const GID_CAPTACAO_CONSOLIDADO = '298804678';

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================
function parseBRNumber(value) {
    if (!value) return 0;
    const cleanVal = value.toString().trim()
        .replace(/\./g, '')
        .replace('%', '')
        .replace(',', '.');
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed;
}

function formatBRInteger(num) {
    return Math.round(num).toLocaleString('pt-BR');
}

function formatBRPct(num) {
    return (num * 100).toFixed(2).replace('.', ',') + '%';
}

function getPctColorClass(pctValue) {
    if (pctValue >= 100) return 'pct-ok';
    if (pctValue >= 80) return 'pct-warn';
    return 'pct-danger';
}

// Parser CSV simples com suporte a aspas
function parseCSV(text) {
    const lines = text.split(/\r\n|\n/);
    return lines.map(line => {
        const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^,]+)/g;
        const row = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            const val = match[1] ? match[1].replace(/\"\"/g, '"') : match[2];
            row.push(val ? val.trim() : '');
        }
        return row;
    }).filter(row => row.length > 1);
}

// ==========================================
// CARREGAMENTO DOS DADOS (GOOGLE SHEETS)
// ==========================================
async function fetchSheetData(gid) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    try {
        const response = await fetch(url);
        return parseCSV(await response.text());
    } catch (error) {
        console.error('Erro ao carregar aba com GID ' + gid, error);
        return [];
    }
}

// ==========================================
// PROCESSAMENTO E RENDERIZAÇÃO DOS KPIs
// ==========================================
// Mapeamento de colunas — aba CAPTAÇÃO POLO:
// 0: COD_POLO | 1: POLO | 2: ESTADO | 3: REGIÃO | 4: PARCEIRO | 5: CARTEIRA | 6: ANALISTA
// 7: INSCRITO | 8: MATRICULADO | 9: META MOVEL INSCRIÇÃO | 10: % META MOVEL INSC
// 11: META MOVEL MATRICULADO | 12: % META MOVEL MATR | 13: META EDITAL INSC
// 14: % META EDITAL INSC | 15: META EDITAL MATR | 16: % META EDITAL MATR

function processAndRenderTopKPIs(consolidadoData) {
    // Busca a linha do total geral
    const totalRow = consolidadoData.find(row =>
        row[0] && row[0].toString().toUpperCase().includes('GERAL')
    );
    if (!totalRow) return console.warn('Linha GERAL não encontrada.');

    const inscritos = parseBRNumber(totalRow[1]);
    const metaMovelInsc = parseBRNumber(totalRow[2]);
    const pctMovelInsc = parseBRNumber(totalRow[3]) / 100;
    const metaEditalInsc = parseBRNumber(totalRow[4]);
    const pctEditalInsc = parseBRNumber(totalRow[5]) / 100;

    const matriculados = parseBRNumber(totalRow[6]);
    const metaMovelMatr = parseBRNumber(totalRow[7]);
    const pctMovelMatr = parseBRNumber(totalRow[8]) / 100;
    const metaEditalMatr = parseBRNumber(totalRow[9]);
    const pctEditalMatr = parseBRNumber(totalRow[10]) / 100;

    // Inscrições
    document.getElementById('val-inscritos-total').innerText = formatBRInteger(inscritos);
    document.getElementById('val-insc-movel-esperado').innerText = formatBRInteger(metaMovelInsc);
    document.getElementById('val-insc-edital-alvo').innerText = formatBRInteger(metaEditalInsc);

    const elPctMovelInsc = document.getElementById('val-insc-movel-pct');
    elPctMovelInsc.innerText = formatBRPct(pctMovelInsc);
    elPctMovelInsc.className = 'val ' + getPctColorClass(pctMovelInsc * 100);

    const elPctEditalInsc = document.getElementById('val-insc-edital-pct');
    elPctEditalInsc.innerText = formatBRPct(pctEditalInsc);
    elPctEditalInsc.className = 'val ' + getPctColorClass(pctEditalInsc * 100);

    // Matrículas
    document.getElementById('val-matriculas-total').innerText = formatBRInteger(matriculados);
    document.getElementById('val-matr-movel-esperado').innerText = formatBRInteger(metaMovelMatr);
    document.getElementById('val-matr-edital-alvo').innerText = formatBRInteger(metaEditalMatr);

    const elPctMovelMatr = document.getElementById('val-matr-movel-pct');
    elPctMovelMatr.innerText = formatBRPct(pctMovelMatr);
    elPctMovelMatr.className = 'val ' + getPctColorClass(pctMovelMatr * 100);

    const elPctEditalMatr = document.getElementById('val-matr-edital-pct');
    elPctEditalMatr.innerText = formatBRPct(pctEditalMatr);
    elPctEditalMatr.className = 'val ' + getPctColorClass(pctEditalMatr * 100);
}

// ==========================================
// CARTEIRAS & GERÊNCIAS
// ==========================================
const CARTEIRAS = [
    { key: 'florenca', match: 'Florença' },
    { key: 'genova', match: 'Gênova' },
    { key: 'milao', match: 'Milão' },
    { key: 'roma', match: 'Roma' },
];

const GERENCIAS = [
    { key: 'diretoria', match: 'Diretoria OP' },
    { key: 'op1', match: 'Operações I -' },
    { key: 'op2', match: 'Operações II -' },
];

const NOMES_CURTOS_GRUPO = {
    florenca: 'Florença',
    genova: 'Gênova',
    milao: 'Milão',
    roma: 'Roma',
    diretoria: 'Diretoria OP',
    op1: 'Operações I',
    op2: 'Operações II',
};

function buildCGCard(row, nomeExibido, carteiraExport = null) {
    const inscritos = formatBRInteger(parseBRNumber(row[1]));
    const metaMovelInsc = formatBRInteger(parseBRNumber(row[2]));
    const pctMovelInsc = parseBRNumber(row[3]);
    const metaEditalInsc = formatBRInteger(parseBRNumber(row[4]));
    const pctEditalInsc = parseBRNumber(row[5]);

    const matriculados = formatBRInteger(parseBRNumber(row[6]));
    const metaMovelMatr = formatBRInteger(parseBRNumber(row[7]));
    const pctMovelMatr = parseBRNumber(row[8]);
    const metaEditalMatr = formatBRInteger(parseBRNumber(row[9]));
    const pctEditalMatr = parseBRNumber(row[10]);

    const colorInscMovel = getPctColorClass(pctMovelInsc);
    const colorInscEdital = getPctColorClass(pctEditalInsc);
    const colorMatrMovel = getPctColorClass(pctMovelMatr);
    const colorMatrEdital = getPctColorClass(pctEditalMatr);

    const fmtPct = v => v.toFixed(2).replace('.', ',') + '%';

    return `
    <div class="cg-card">
      <div class="cg-card-title">
        ${nomeExibido}
        ${carteiraExport ? `<button class="cg-export-btn" onclick="exportCarteiraPolo('${carteiraExport}')" title="Exportar polos desta carteira">⬇</button>` : ''}
      </div>

      <div class="cg-linha">
        <span class="cg-linha-label">Inscrição</span>
        <div class="cg-vsep"></div>
        <div class="cg-volume">
          <span class="val">${inscritos}</span>
          <span class="lbl">Inscritos</span>
        </div>
        <div class="cg-vsep"></div>
        <div class="cg-metas">
          <div class="cg-meta-grupo">
            <div class="cg-meta-titulo">Meta Móvel</div>
            <div class="cg-meta-inner">
              <div class="cg-stat"><span class="val">${metaMovelInsc}</span><span class="lbl">Esperado</span></div>
              <div class="cg-stat"><span class="val ${colorInscMovel}">${fmtPct(pctMovelInsc)}</span><span class="lbl">Atingido</span></div>
            </div>
          </div>
          <div class="cg-meta-grupo">
            <div class="cg-meta-titulo">Meta Edital</div>
            <div class="cg-meta-inner">
              <div class="cg-stat"><span class="val">${metaEditalInsc}</span><span class="lbl">Alvo</span></div>
              <div class="cg-stat"><span class="val ${colorInscEdital}">${fmtPct(pctEditalInsc)}</span><span class="lbl">Progresso</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="cg-linha">
        <span class="cg-linha-label">Matrícula</span>
        <div class="cg-vsep"></div>
        <div class="cg-volume">
          <span class="val">${matriculados}</span>
          <span class="lbl">Matriculados</span>
        </div>
        <div class="cg-vsep"></div>
        <div class="cg-metas">
          <div class="cg-meta-grupo">
            <div class="cg-meta-titulo">Meta Móvel</div>
            <div class="cg-meta-inner">
              <div class="cg-stat"><span class="val">${metaMovelMatr}</span><span class="lbl">Esperado</span></div>
              <div class="cg-stat"><span class="val ${colorMatrMovel}">${fmtPct(pctMovelMatr)}</span><span class="lbl">Atingido</span></div>
            </div>
          </div>
          <div class="cg-meta-grupo">
            <div class="cg-meta-titulo">Meta Edital</div>
            <div class="cg-meta-inner">
              <div class="cg-stat"><span class="val">${metaEditalMatr}</span><span class="lbl">Alvo</span></div>
              <div class="cg-stat"><span class="val ${colorMatrEdital}">${fmtPct(pctEditalMatr)}</span><span class="lbl">Progresso</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

function exportCarteiraPolo(nomeCarteira) {
    if (!polosDetalheData || polosDetalheData.length === 0) return;

    const alvo = normalizeStr(nomeCarteira);
    const itens = polosDetalheData.filter(item => normalizeStr(item.carteira) === alvo)
    if (itens.length === 0) return;

    const header = [
        'Cód. Polo', 'Polo', 'Estado', 'Região', 'Parceiro', 'Carteira', 'Analista',
        'Inscritos', 'Matriculados',
        'Meta Móvel Inscrição', '% Meta Móvel Insc',
        'Meta Móvel Matriculado', '% Meta Móvel Matr',
        'Meta Edital Inscrição', '% Meta Edital Insc',
        'Meta Edital Matriculado', '% Meta Edital Matr'
    ];

    const linhas = itens.map(item => [
        item.codPolo, item.polo, item.estado, item.regiao, item.parceiro, item.carteira, item.analista,
        item.inscritos, item.matriculados,
        item.metaMovelInsc, formatBRPctDirect(item.pctMovelInsc),
        item.metaMovelMatr, formatBRPctDirect(item.pctMovelMatr),
        item.metaEditalInsc, formatBRPctDirect(item.pctEditalInsc),
        item.metaEditalMatr, formatBRPctDirect(item.pctEditalMatr)
    ]);

    const csv = [header, ...linhas]
        .map(cols => cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polos_${nomeCarteira.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function processAndRenderCarteiras(consolidadoData) {

    let htmlCarteiras = '';
    let htmlGerencias = '';

    for (const row of consolidadoData) {
        const col0 = row[0] ? row[0].toString() : '';

        for (const c of CARTEIRAS) {
            if (col0.includes(c.match)) {
                htmlCarteiras += buildCGCard(row, NOMES_CURTOS_GRUPO[c.key], NOMES_CURTOS_GRUPO[c.key]);
            }
        }
        for (const g of GERENCIAS) {
            if (col0.includes(g.match)) {
                htmlGerencias += buildCGCard(row, NOMES_CURTOS_GRUPO[g.key], NOMES_CURTOS_GRUPO[g.key]);
            }
        }
    }

    document.getElementById('grid-carteiras').innerHTML = htmlCarteiras;
    document.getElementById('grid-gerencias').innerHTML = htmlGerencias;
}

// ==========================================
// TOTALIZADORES POR REGIÃO (aba CAPTAÇÃO POLO)
// ==========================================
const ORDEM_REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

let regiaoPolosData = [];
let regiaoCarteirasSelecionadas = new Set();
let insightsCarteirasSelecionadas = new Set();
let insightsPolosData = [];
let estadosPolosData = [];
let estadosCarteirasSelecionadas = new Set();


function renderRegioesFiltradas() {
    const filtroAtivo = regiaoCarteirasSelecionadas.size > 0;
    const REGIOES_INVALIDAS = ['REGIÃO', '#N/D', '#N/A', ''];
    const pctOrZero = (num, den) => (den > 0 ? (num / den) * 100 : 0);
    const toBR = (num) => num.toFixed(2).replace('.', ',');

    const regioesMap = {};
    for (const row of regiaoPolosData) {
        const regiao = (row[3] || '').toString().trim();
        if (REGIOES_INVALIDAS.includes(regiao.toUpperCase())) continue;
        if (!isLinhaPoloValida(row)) continue;
        if (filtroAtivo && !regiaoCarteirasSelecionadas.has(extractCarteiraLimpa(row))) continue;

        if (!regioesMap[regiao]) {
            regioesMap[regiao] = { inscritos: 0, matriculados: 0, metaMovelInsc: 0, metaMovelMatr: 0, metaEditalInsc: 0, metaEditalMatr: 0 };
        }
        const r = regioesMap[regiao];
        r.inscritos += parseBRNumber(row[7]);
        r.matriculados += parseBRNumber(row[8]);
        r.metaMovelInsc += parseBRNumber(row[9]);
        r.metaMovelMatr += parseBRNumber(row[11]);
        r.metaEditalInsc += parseBRNumber(row[13]);
        r.metaEditalMatr += parseBRNumber(row[15]);
    }

    const regioesOrdenadas = Object.keys(regioesMap).sort((a, b) => {
        const ia = ORDEM_REGIOES.indexOf(a), ib = ORDEM_REGIOES.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1; if (ib === -1) return -1;
        return ia - ib;
    });

    let html = '';
    for (const regiao of regioesOrdenadas) {
        const r = regioesMap[regiao];
        if (r.inscritos === 0 && r.matriculados === 0) continue;

        const syntheticRow = [
            null,
            r.inscritos,
            r.metaMovelInsc, toBR(pctOrZero(r.inscritos, r.metaMovelInsc)),
            r.metaEditalInsc, toBR(pctOrZero(r.inscritos, r.metaEditalInsc)),
            r.matriculados,
            r.metaMovelMatr, toBR(pctOrZero(r.matriculados, r.metaMovelMatr)),
            r.metaEditalMatr, toBR(pctOrZero(r.matriculados, r.metaEditalMatr)),
        ];
        html += buildCGCard(syntheticRow, regiao);
    }

    document.getElementById('grid-regioes').innerHTML = html || '<p style="color:var(--muted)">Nenhuma região com dados para a seleção.</p>';
}

function processAndRenderRegioes(polosData) {
    regiaoPolosData = polosData;

    const carteiras = [...new Set(
        polosData
            .filter(row => isLinhaPoloValida(row))
            .map(row => extractCarteiraLimpa(row))
    )].sort((a, b) => a.localeCompare(b));

    const optionsWrapper = document.getElementById('regiao-carteira-options');
    const carteiraLabel = document.getElementById('regiaoCarteiraLabel');
    const dropdown = document.getElementById('regiaoCarteiraDropdown');
    const btn = document.getElementById('regiaoCarteiraBtn');

    function updateLabel() {
        carteiraLabel.textContent =
            regiaoCarteirasSelecionadas.size === 0 || regiaoCarteirasSelecionadas.size === carteiras.length
                ? 'Todas as carteiras'
                : `${regiaoCarteirasSelecionadas.size} carteira(s) selecionada(s)`;
    }

    function buildOptions() {
        optionsWrapper.innerHTML = carteiras.map(c => `
            <label class="uf-chip">
                <input type="checkbox" value="${c}" ${regiaoCarteirasSelecionadas.has(c) ? 'checked' : ''}>
                <span>${c}</span>
            </label>`).join('');

        optionsWrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) regiaoCarteirasSelecionadas.add(cb.value);
                else regiaoCarteirasSelecionadas.delete(cb.value);
                updateLabel();
                renderRegioesFiltradas();
            });
        });
    }

    buildOptions();

    document.getElementById('regiaoCarteiraSelectAll').addEventListener('click', () => {
        carteiras.forEach(c => regiaoCarteirasSelecionadas.add(c));
        buildOptions(); updateLabel(); renderRegioesFiltradas();
    });
    document.getElementById('regiaoCarteiraClearAll').addEventListener('click', () => {
        regiaoCarteirasSelecionadas.clear();
        buildOptions(); updateLabel(); renderRegioesFiltradas();
    });

    btn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    renderRegioesFiltradas();
}

function renderRegioesFiltradas() {
    const filtroAtivo = regiaoCarteirasSelecionadas.size > 0;
    const REGIOES_INVALIDAS = ['REGIÃO', '#N/D', '#N/A', ''];
    const pctOrZero = (num, den) => (den > 0 ? (num / den) * 100 : 0);
    const toBR = (num) => num.toFixed(2).replace('.', ',');

    const regioesMap = {};
    for (const row of regiaoPolosData) {
        const regiao = (row[3] || '').toString().trim();
        if (REGIOES_INVALIDAS.includes(regiao.toUpperCase())) continue;
        if (!isLinhaPoloValida(row)) continue;

        // aplica filtro de carteira
        if (filtroAtivo && !regiaoCarteirasSelecionadas.has(extractCarteiraLimpa(row))) continue;

        if (!regioesMap[regiao]) {
            regioesMap[regiao] = { inscritos: 0, matriculados: 0, metaMovelInsc: 0, metaMovelMatr: 0, metaEditalInsc: 0, metaEditalMatr: 0 };
        }
        const r = regioesMap[regiao];
        r.inscritos += parseBRNumber(row[7]);
        r.matriculados += parseBRNumber(row[8]);
        r.metaMovelInsc += parseBRNumber(row[9]);
        r.metaMovelMatr += parseBRNumber(row[11]);
        r.metaEditalInsc += parseBRNumber(row[13]);
        r.metaEditalMatr += parseBRNumber(row[15]);
    }

    const regioesOrdenadas = Object.keys(regioesMap).sort((a, b) => {
        const ia = ORDEM_REGIOES.indexOf(a), ib = ORDEM_REGIOES.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1; if (ib === -1) return -1;
        return ia - ib;
    });

    let html = '';
    for (const regiao of regioesOrdenadas) {
        const r = regioesMap[regiao];

        // oculta cards zerados
        if (r.inscritos === 0 && r.matriculados === 0) continue;

        const syntheticRow = [
            null,
            r.inscritos,
            r.metaMovelInsc, toBR(pctOrZero(r.inscritos, r.metaMovelInsc)),
            r.metaEditalInsc, toBR(pctOrZero(r.inscritos, r.metaEditalInsc)),
            r.matriculados,
            r.metaMovelMatr, toBR(pctOrZero(r.matriculados, r.metaMovelMatr)),
            r.metaEditalMatr, toBR(pctOrZero(r.matriculados, r.metaEditalMatr)),
        ];
        html += buildCGCard(syntheticRow, regiao);
    }

    document.getElementById('grid-regioes').innerHTML = html || '<p style="color:var(--muted)">Nenhuma região com dados para a seleção.</p>';
}

// ==========================================
// TOTALIZADORES POR ESTADO (aba CAPTAÇÃO POLO)
// ==========================================
function renderEstadosFiltrados() {
    const filtroAtivo = estadosCarteirasSelecionadas.size > 0;
    const estadosMap = {};
    const REGIOES_INVALIDAS = ['REGIÃO', 'ESTADO', 'UF', '#N/D', '#N/A', ''];

    for (const row of estadosPolosData) {
        const estado = (row[2] || '').toString().trim().toUpperCase();
        if (REGIOES_INVALIDAS.includes(estado)) continue;
        if (filtroAtivo && !estadosCarteirasSelecionadas.has(extractCarteiraLimpa(row))) continue;

        if (!estadosMap[estado]) {
            estadosMap[estado] = {
                inscritos: 0, matriculados: 0,
                metaMovelInsc: 0, metaMovelMatr: 0,
                metaEditalInsc: 0, metaEditalMatr: 0,
            };
        }
        const e = estadosMap[estado];
        e.inscritos += parseBRNumber(row[7]);
        e.matriculados += parseBRNumber(row[8]);
        e.metaMovelInsc += parseBRNumber(row[9]);
        e.metaMovelMatr += parseBRNumber(row[11]);
        e.metaEditalInsc += parseBRNumber(row[13]);
        e.metaEditalMatr += parseBRNumber(row[15]);
    }

    const pctOrZero = (num, den) => (den > 0 ? (num / den) * 100 : 0);
    const toBR = (num) => num.toFixed(2).replace('.', ',');

    const estadosOrdenados = Object.keys(estadosMap).sort((a, b) => a.localeCompare(b));

    let htmlCards = '';
    let htmlChips = '';

    for (const uf of estadosOrdenados) {
        const e = estadosMap[uf];
        if (e.inscritos === 0 && e.matriculados === 0) continue;

        const syntheticRow = [
            null,
            e.inscritos,
            e.metaMovelInsc,
            toBR(pctOrZero(e.inscritos, e.metaMovelInsc)),
            e.metaEditalInsc,
            toBR(pctOrZero(e.inscritos, e.metaEditalInsc)),
            e.matriculados,
            e.metaMovelMatr,
            toBR(pctOrZero(e.matriculados, e.metaMovelMatr)),
            e.metaEditalMatr,
            toBR(pctOrZero(e.matriculados, e.metaEditalMatr)),
        ];

        htmlCards += `<div class="filter-item" data-uf="${uf}">${buildCGCard(syntheticRow, uf)}</div>`;
        htmlChips += `
          <label class="uf-chip">
            <input type="checkbox" value="${uf}" class="uf-checkbox">
            <span>${uf}</span>
          </label>`;
    }

    document.getElementById('grid-estados').innerHTML = htmlCards || '<p style="color:var(--muted)">Nenhum estado com dados para a seleção.</p>';
    document.getElementById('estados-checkboxes').innerHTML = htmlChips;

    document.querySelectorAll('.uf-checkbox').forEach(cb => cb.addEventListener('change', () => {
        updateUfDropdownLabel();
        filterEstados();
    }));

    updateUfDropdownLabel();
    filterEstados();
}

function processAndRenderEstados(polosData) {
    estadosPolosData = polosData;

    const carteiras = [...new Set(
        polosData.filter(row => isLinhaPoloValida(row)).map(row => extractCarteiraLimpa(row))
    )].sort((a, b) => a.localeCompare(b));

    const optionsWrapper = document.getElementById('estados-carteira-options');
    const carteiraLabel = document.getElementById('estadosCarteiraLabel');
    const dropdown = document.getElementById('estadosCarteiraDropdown');
    const btn = document.getElementById('estadosCarteiraBtn');

    function updateLabel() {
        carteiraLabel.textContent =
            estadosCarteirasSelecionadas.size === 0 || estadosCarteirasSelecionadas.size === carteiras.length
                ? 'Todas as carteiras'
                : `${estadosCarteirasSelecionadas.size} carteira(s) selecionada(s)`;
    }

    function buildOptions() {
        optionsWrapper.innerHTML = carteiras.map(c => `
            <label class="uf-chip">
                <input type="checkbox" value="${c}" ${estadosCarteirasSelecionadas.has(c) ? 'checked' : ''}>
                <span>${c}</span>
            </label>`).join('');

        optionsWrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) estadosCarteirasSelecionadas.add(cb.value);
                else estadosCarteirasSelecionadas.delete(cb.value);
                updateLabel();
                renderEstadosFiltrados();
            });
        });
    }

    buildOptions();

    document.getElementById('estadosCarteiraSelectAll').addEventListener('click', () => {
        carteiras.forEach(c => estadosCarteirasSelecionadas.add(c));
        buildOptions(); updateLabel(); renderEstadosFiltrados();
    });
    document.getElementById('estadosCarteiraClearAll').addEventListener('click', () => {
        estadosCarteirasSelecionadas.clear();
        buildOptions(); updateLabel(); renderEstadosFiltrados();
    });

    btn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    document.getElementById('estados-search').addEventListener('input', filterEstados);

    renderEstadosFiltrados();
    initUfDropdown();
}

function filterEstados() {
    const termo = (document.getElementById('estados-search').value || '').trim().toUpperCase();
    const marcados = Array.from(document.querySelectorAll('.uf-checkbox:checked')).map(cb => cb.value);

    document.querySelectorAll('#grid-estados .filter-item').forEach(item => {
        const uf = item.getAttribute('data-uf');
        const passaTexto = !termo || uf.includes(termo);
        const passaCheckbox = marcados.length === 0 || marcados.includes(uf);
        item.style.display = (passaTexto && passaCheckbox) ? '' : 'none';
    });
}

// ==========================================
// DROPDOWN DE UFs (Totalizadores por Estado)
// ==========================================
function updateUfDropdownLabel() {
    const label = document.getElementById('ufDropdownLabel');
    const marcados = document.querySelectorAll('.uf-checkbox:checked');

    if (marcados.length === 0) {
        label.textContent = 'Filtrar por UF';
    } else if (marcados.length === 1) {
        label.textContent = marcados[0].value;
    } else {
        label.textContent = `${marcados.length} UFs selecionadas`;
    }
}

function initUfDropdown() {
    const dropdown = document.getElementById('ufDropdown');
    const btn = document.getElementById('ufDropdownBtn');
    const selectAllBtn = document.getElementById('ufSelectAll');
    const clearAllBtn = document.getElementById('ufClearAll');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    document.getElementById('ufDropdownPanel').addEventListener('click', (e) => e.stopPropagation());

    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.uf-checkbox').forEach(cb => cb.checked = true);
        updateUfDropdownLabel();
        filterEstados();
    });

    clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.uf-checkbox').forEach(cb => cb.checked = false);
        updateUfDropdownLabel();
        filterEstados();
    });

    updateUfDropdownLabel();
}

// ==========================================
// INSIGHTS DOS POLOS (aba CAPTAÇÃO POLO)
// ==========================================
const META_EDITAL_INSC_MINIMA = 200; // recorte: só considera polos com Meta Edital Inscrição >= 100

function normalizeStr(str) {
    return (str || '').toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase();
}

function formatBRPctDirect(num) {
    return num.toFixed(2).replace('.', ',') + '%';
}

function getPolosFiltrados(polosData) {
    return polosData.filter(row => parseBRNumber(row[13]) >= META_EDITAL_INSC_MINIMA);
}

function extractCarteiraLimpa(row) {
    const raw = (row[5] || '').toString();
    for (const g of [...CARTEIRAS, ...GERENCIAS]) {
        if (raw.includes(g.match)) return NOMES_CURTOS_GRUPO[g.key];
    }
    return raw.replace(/^gerente\s+/i, '').split(' - ')[0].trim();
}

function buildGerenteLabel(row) {
    return `${extractCarteiraLimpa(row)}`;
}

function buildInsightItem({ icon, title, desc, meta }) {
    return `
    <div class="insight-item">
      <span class="insight-icon">${icon}</span>
      <div class="insight-body">
        <div class="insight-title">${title}</div>
        <div class="insight-desc">${desc}</div>
        ${meta ? `<div class="insight-meta">${meta}</div>` : ''}
      </div>
    </div>`;
}

function renderInsights() {
    const filtroAtivo = insightsCarteirasSelecionadas.size > 0;
    const polosFiltrados = insightsPolosData.filter(row =>
        !filtroAtivo || insightsCarteirasSelecionadas.has(extractCarteiraLimpa(row))
    );
    const polos = getPolosFiltrados(polosFiltrados);
    const listPos = document.getElementById('insights-positivos-list');
    const listNeg = document.getElementById('insights-melhoria-list');

    if (polos.length === 0) {
        const msg = '<p class="insight-empty">Sem polos elegíveis (Meta Edital Inscrição ≥ 100) no momento.</p>';
        listPos.innerHTML = msg;
        listNeg.innerHTML = msg;
        return;
    }

    const withPct = (idx) => polos.map(row => ({ row, pct: parseBRNumber(row[idx]) }));

    // ---------- DESTAQUES POSITIVOS ----------
    const acimaMeta = polos.filter(r => parseBRNumber(r[10]) >= 100);
    const pctAcimaMeta = (acimaMeta.length / polos.length) * 100;

    const destaqueMovel = withPct(10).reduce((a, b) => (b.pct > a.pct ? b : a));
    const maiorVolume = polos.reduce((a, b) => (parseBRNumber(b[7]) > parseBRNumber(a[7]) ? b : a));
    const melhorEdital = withPct(14).reduce((a, b) => (b.pct > a.pct ? b : a));
    const liderMatricula = withPct(12).reduce((a, b) => (b.pct > a.pct ? b : a));

    const carteiraContagemPositiva = {};
    acimaMeta.forEach(r => { carteiraContagemPositiva[r[5]] = (carteiraContagemPositiva[r[5]] || 0) + 1; });
    const carteiraDestaque = Object.entries(carteiraContagemPositiva).sort((a, b) => b[1] - a[1])[0];
    const analistaCarteiraDestaque = carteiraDestaque
        ? (polos.find(r => r[5] === carteiraDestaque[0]) || [])[6] : '';

    const positivos = [
        buildInsightItem({
            icon: '✅',
            title: `${acimaMeta.length} polos atingiram 100% da Meta Móvel de Inscrição`,
            desc: `${pctAcimaMeta.toFixed(1).replace('.', ',')}% do total de polos elegíveis estão na meta`
        }),
        buildInsightItem({
            icon: '🏅',
            title: `Destaque Meta Móvel Inscrição: ${destaqueMovel.row[1]}`,
            desc: `${formatBRPctDirect(destaqueMovel.pct)} atingido — ${formatBRInteger(parseBRNumber(destaqueMovel.row[7]))} inscritos`,
            meta: buildGerenteLabel(destaqueMovel.row)
        }),
        buildInsightItem({
            icon: '📈',
            title: `Maior volume: ${maiorVolume[1]}`,
            desc: `${formatBRInteger(parseBRNumber(maiorVolume[7]))} inscritos — ${formatBRPctDirect(parseBRNumber(maiorVolume[10]))} da Meta Móvel de Inscrição`,
            meta: buildGerenteLabel(maiorVolume)
        }),
        buildInsightItem({
            icon: '📋',
            title: `Melhor % Meta Edital Inscrição: ${melhorEdital.row[1]}`,
            desc: `${formatBRPctDirect(melhorEdital.pct)} da Meta Edital atingido`,
            meta: buildGerenteLabel(melhorEdital.row)
        }),
        buildInsightItem({
            icon: '🎓',
            title: `Líder em Matrículas: ${liderMatricula.row[1]}`,
            desc: `${formatBRPctDirect(liderMatricula.pct)} da Meta Móvel Matrícula — ${formatBRInteger(parseBRNumber(liderMatricula.row[8]))} matriculados`,
            meta: buildGerenteLabel(liderMatricula.row)
        }),
        buildInsightItem({
            icon: '🗂️',
            title: carteiraDestaque ? `Carteira destaque: ${carteiraDestaque[0]}` : 'Carteira destaque: sem dados',
            desc: carteiraDestaque ? `${carteiraDestaque[1]} polos acima de 100% da Meta Móvel de Inscrição` : '',
        }),
    ].join('');

    // ---------- PONTOS DE MELHORIA ----------
    const abaixoMeta = polos.filter(r => parseBRNumber(r[10]) < 50);
    const pctAbaixoMeta = (abaixoMeta.length / polos.length) * 100;

    const situacaoCritica = withPct(10).reduce((a, b) => (b.pct < a.pct ? b : a));
    const faltamCritica = Math.max(0, Math.round(parseBRNumber(situacaoCritica.row[9]) - parseBRNumber(situacaoCritica.row[7])));

    const maiorGap = polos.reduce((a, b) => {
        const gapA = parseBRNumber(a[9]) - parseBRNumber(a[7]);
        const gapB = parseBRNumber(b[9]) - parseBRNumber(b[7]);
        return gapB > gapA ? b : a;
    });
    const gapValor = Math.max(0, Math.round(parseBRNumber(maiorGap[9]) - parseBRNumber(maiorGap[7])));

    const potencialNaoAproveitado = abaixoMeta.length > 0
        ? abaixoMeta.reduce((a, b) => (parseBRNumber(b[9]) > parseBRNumber(a[9]) ? b : a))
        : polos[0];

    const carteiraContagemNegativa = {};
    abaixoMeta.forEach(r => { carteiraContagemNegativa[r[5]] = (carteiraContagemNegativa[r[5]] || 0) + 1; });
    const carteiraCritica = Object.entries(carteiraContagemNegativa).sort((a, b) => b[1] - a[1])[0];
    const analistaCarteiraCritica = carteiraCritica
        ? (polos.find(r => r[5] === carteiraCritica[0]) || [])[6] : '';

    const outrosAbaixo = Math.max(0, abaixoMeta.length - 1);

    const melhorias = [
        buildInsightItem({
            icon: '⚠️',
            title: `${abaixoMeta.length} polos abaixo de 50% da Meta Móvel de Inscrição`,
            desc: `${pctAbaixoMeta.toFixed(1).replace('.', ',')}% dos polos elegíveis precisam de atenção prioritária`
        }),
        buildInsightItem({
            icon: '🔴',
            title: `Situação crítica (Meta Móvel Inscrição): ${situacaoCritica.row[1]}`,
            desc: `${formatBRPctDirect(situacaoCritica.pct)} atingido — faltam ${formatBRInteger(faltamCritica)} inscritos para a meta`,
            meta: buildGerenteLabel(situacaoCritica.row)
        }),
        buildInsightItem({
            icon: '📍',
            title: `Maior gap absoluto: ${maiorGap[1]}`,
            desc: `Faltam ${formatBRInteger(gapValor)} inscritos para atingir a Meta Móvel de Inscrição`,
            meta: buildGerenteLabel(maiorGap)
        }),
        buildInsightItem({
            icon: '⚡',
            title: `Potencial não aproveitado: ${potencialNaoAproveitado[1]}`,
            desc: `Meta Móvel de Inscrição de ${formatBRInteger(parseBRNumber(potencialNaoAproveitado[9]))} inscritos, mas apenas ${formatBRPctDirect(parseBRNumber(potencialNaoAproveitado[10]))} atingido`,
            meta: buildGerenteLabel(potencialNaoAproveitado)
        }),
        buildInsightItem({
            icon: '🗂️',
            title: carteiraCritica ? `Carteira com mais críticos: Gerente ${carteiraCritica[0]}` : 'Carteira crítica: sem dados',
            desc: carteiraCritica ? `${carteiraCritica[1]} polos abaixo de 50% da Meta Móvel de Inscrição nesta carteira` : '',
        }),
        buildInsightItem({
            icon: '📋',
            title: `${outrosAbaixo} outros polos abaixo de 50% da Meta Móvel de Inscrição`,
            desc: `Use a busca na tabela abaixo para localizar e filtrar por carteira`
        }),
    ].join('');

    listPos.innerHTML = positivos;
    listNeg.innerHTML = melhorias;
}

function processAndRenderInsights(polosData) {
    insightsPolosData = polosData;

    const carteiras = [...new Set(
        polosData.filter(row => isLinhaPoloValida(row)).map(row => extractCarteiraLimpa(row))
    )].sort((a, b) => a.localeCompare(b));

    const optionsWrapper = document.getElementById('insights-carteira-options');
    const carteiraLabel = document.getElementById('insightsCarteiraLabel');
    const dropdown = document.getElementById('insightsCarteiraDropdown');
    const btn = document.getElementById('insightsCarteiraBtn');

    function updateLabel() {
        carteiraLabel.textContent =
            insightsCarteirasSelecionadas.size === 0 || insightsCarteirasSelecionadas.size === carteiras.length
                ? 'Todas as carteiras'
                : `${insightsCarteirasSelecionadas.size} carteira(s) selecionada(s)`;
    }

    function buildOptions() {
        optionsWrapper.innerHTML = carteiras.map(c => `
            <label class="uf-chip">
                <input type="checkbox" value="${c}" ${insightsCarteirasSelecionadas.has(c) ? 'checked' : ''}>
                <span>${c}</span>
            </label>`).join('');

        optionsWrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) insightsCarteirasSelecionadas.add(cb.value);
                else insightsCarteirasSelecionadas.delete(cb.value);
                updateLabel();
                renderInsights();
            });
        });
    }

    buildOptions();

    document.getElementById('insightsCarteiraSelectAll').addEventListener('click', () => {
        carteiras.forEach(c => insightsCarteirasSelecionadas.add(c));
        buildOptions(); updateLabel(); renderInsights();
    });
    document.getElementById('insightsCarteiraClearAll').addEventListener('click', () => {
        insightsCarteirasSelecionadas.clear();
        buildOptions(); updateLabel(); renderInsights();
    });

    btn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    renderInsights();
}

// ==========================================
// VISÃO DETALHADA DOS POLOS
// ==========================================
let polosDetalheData = [];
let carteiraAtiva = '';
let carteirasSelecionadas = new Set();

function buildPolosRow(row) {
    return {
        codPolo: row[0] || '',
        polo: row[1] || '',
        carteira: extractCarteiraLimpa(row),
        estado: row[2] || '',
        regiao: row[3] || '',
        parceiro: row[4] || '',
        analista: row[6] || '',
        inscritos: parseBRNumber(row[7]),
        matriculados: parseBRNumber(row[8]),
        metaMovelInsc: parseBRNumber(row[9]),
        pctMovelInsc: parseBRNumber(row[10]),
        metaMovelMatr: parseBRNumber(row[11]),
        pctMovelMatr: parseBRNumber(row[12]),
        metaEditalInsc: parseBRNumber(row[13]),
        pctEditalInsc: parseBRNumber(row[14]),
        metaEditalMatr: parseBRNumber(row[15]),
        pctEditalMatr: parseBRNumber(row[16]),
    };
}

function renderPolosTable(items) {
    const tbody = document.getElementById('polos-table-body');

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="polos-empty">Nenhum polo encontrado.</td></tr>';
        document.getElementById('polosExportCount').innerText = 0;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
        <td class="polos-nome">${item.polo}</td>
        <td>${item.carteira}</td>
        <td class="num td-insc-start">${formatBRInteger(item.inscritos)}</td>
        <td class="td-insc">${formatBRInteger(item.metaMovelInsc)}</td>
        <td class="td-insc-end ${getPctColorClass(item.pctMovelInsc)}">${formatBRPctDirect(item.pctMovelInsc)}</td>
        <td class="num td-matr-start">${formatBRInteger(item.matriculados)}</td>
        <td class="td-matr">${formatBRInteger(item.metaMovelMatr)}</td>
        <td class="td-matr-end ${getPctColorClass(item.pctMovelMatr)}">${formatBRPctDirect(item.pctMovelMatr)}</td>
        </tr>`).join('');

    document.getElementById('polosExportCount').innerText = items.length;
}

function filterPolosTable() {
    const termo = (document.getElementById('polos-search').value || '').trim().toLowerCase();
    const carteiraSelecionada = carteirasSelecionadas.size > 0 ? carteirasSelecionadas : null;

    const filtrados = polosDetalheData.filter(item => {
        const passaTexto = !termo ||
            item.polo.toLowerCase().includes(termo) ||
            item.carteira.toLowerCase().includes(termo) ||
            item.analista.toLowerCase().includes(termo);
        const passaCarteira = !carteiraSelecionada || carteiraSelecionada.has(item.carteira);
        return passaTexto && passaCarteira;
    });

    renderPolosTable(filtrados);
    return filtrados;
}

function exportPolosCSV(items) {
    const header = ['Polo', 'Carteira', 'Estado', 'Região', 'Parceiro', 'Analista', 'Inscritos', 'Meta Móvel Insc', '% Meta Móvel Insc', 'Matriculados', 'Meta Móvel Matr', '% Meta Móvel Matr', 'Meta Edital Insc', '% Meta Edital Insc', 'Meta Edital Matr', '% Meta Edital Matr'];
    const linhas = items.map(item => [
        item.polo, item.carteira, item.estado, item.regiao, item.parceiro, item.analista,
        item.inscritos, item.metaMovelInsc, formatBRPctDirect(item.pctMovelInsc),
        item.matriculados, item.metaMovelMatr, formatBRPctDirect(item.pctMovelMatr),
        item.metaEditalInsc, formatBRPctDirect(item.pctEditalInsc),
        item.metaEditalMatr, formatBRPctDirect(item.pctEditalMatr)
    ]);

    const csv = [header, ...linhas]
        .map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polos_inscricoes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function isLinhaPoloValida(row) {
    const nome = (row[1] || '').toString().trim();
    if (!nome || !row[5]) return false;                          // sem nome ou carteira
    if (nome.toUpperCase() === 'POLO') return false;             // cabeçalho da planilha
    if (nome.includes('#N/D')) return false;                     // célula sem valor no Sheets
    if ((row[5] || '').toString().includes('#N/D')) return false; // carteira inválida
    return true;
}

function processAndRenderPolosDetalhe(polosData) {
    polosDetalheData = polosData
        .filter(isLinhaPoloValida)
        .map(buildPolosRow)
        .sort((a, b) => a.polo.localeCompare(b.polo));

    const carteiras = [...new Set(polosDetalheData.map(item => item.carteira))].sort((a, b) => a.localeCompare(b));

    const optionsWrapper = document.getElementById('polos-carteira-options');
    const carteiraLabel = document.getElementById('polosCarteiraLabel');
    const carteiraDropdown = document.getElementById('polosCarteiraDropdown');
    const carteiraBtn = document.getElementById('polosCarteiraBtn');

    function updateCarteiraLabel() {
        if (carteirasSelecionadas.size === 0 || carteirasSelecionadas.size === carteiras.length) {
            carteiraLabel.textContent = 'Todas as carteiras';
        } else {
            carteiraLabel.textContent = `${carteirasSelecionadas.size} carteira(s) selecionada(s)`;
        }
    }

    function buildCarteiraOptions() {
        optionsWrapper.innerHTML = carteiras.map(c => `
        <label class="uf-chip">
            <input type="checkbox" value="${c}" ${carteirasSelecionadas.has(c) ? 'checked' : ''}>
            <span>${c}</span>
        </label>
    `).join('');

        optionsWrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) carteirasSelecionadas.add(cb.value);
                else carteirasSelecionadas.delete(cb.value);
                updateCarteiraLabel();
                filterPolosTable();
            });
        });
    }

    buildCarteiraOptions();

    document.getElementById('carteiraSelectAll').addEventListener('click', () => {
        carteiras.forEach(c => carteirasSelecionadas.add(c));
        buildCarteiraOptions();
        updateCarteiraLabel();
        filterPolosTable();
    });

    document.getElementById('carteiraClearAll').addEventListener('click', () => {
        carteirasSelecionadas.clear();
        buildCarteiraOptions();
        updateCarteiraLabel();
        filterPolosTable();
    });

    carteiraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        carteiraDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => carteiraDropdown.classList.remove('open'));

    renderPolosTable(polosDetalheData);

    document.getElementById('polos-search').addEventListener('input', filterPolosTable);

    document.getElementById('polosClearBtn').addEventListener('click', () => {
        document.getElementById('polos-search').value = '';
        carteirasSelecionadas.clear();
        buildCarteiraOptions();
        updateCarteiraLabel();
        filterPolosTable();
    });

    document.getElementById('polosExportBtn').addEventListener('click', () => {
        exportPolosCSV(filterPolosTable());
    });
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
async function initDashboardInscricoes() {
    console.log('Iniciando Dashboard de Inscrições...');
    const consolidadoData = await fetchSheetData(GID_CAPTACAO_CONSOLIDADO);
    if (consolidadoData.length > 0) {
        processAndRenderTopKPIs(consolidadoData);
        processAndRenderCarteiras(consolidadoData);
    }

    const polosData = await fetchSheetData(GID_CAPTACAO_POLO);
    if (polosData.length > 0) {
        processAndRenderInsights(polosData);
        processAndRenderRegioes(polosData);
        processAndRenderEstados(polosData)
        processAndRenderPolosDetalhe(polosData);
    }

    const now = new Date();
    document.getElementById('statusText').innerText =
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('statusDot').className = 'status-dot ok';
}

document.addEventListener('DOMContentLoaded', initDashboardInscricoes);

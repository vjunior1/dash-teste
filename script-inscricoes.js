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

function buildCGCard(row, nomeExibido) {
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
      <div class="cg-card-title">${nomeExibido}</div>

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

function processAndRenderCarteiras(consolidadoData) {
    const nomesCurtosCarteira = {
        'florenca': 'Florença',
        'genova': 'Gênova',
        'milao': 'Milão',
        'roma': 'Roma',
    };

    const nomesCurtosGerencia = {
        'diretoria': 'Diretoria OP',
        'op1': 'Operações I',
        'op2': 'Operações II',
    };

    let htmlCarteiras = '';
    let htmlGerencias = '';

    for (const row of consolidadoData) {
        const col0 = row[0] ? row[0].toString() : '';

        for (const c of CARTEIRAS) {
            if (col0.includes(c.match)) {
                htmlCarteiras += buildCGCard(row, nomesCurtosCarteira[c.key]);
            }
        }
        for (const g of GERENCIAS) {
            if (col0.includes(g.match)) {
                htmlGerencias += buildCGCard(row, nomesCurtosGerencia[g.key]);
            }
        }
    }

    document.getElementById('grid-carteiras').innerHTML = htmlCarteiras;
    document.getElementById('grid-gerencias').innerHTML = htmlGerencias;
}

// ==========================================
// INSIGHTS DOS POLOS (aba CAPTAÇÃO POLO)
// ==========================================
const META_EDITAL_INSC_MINIMA = 200; // recorte: só considera polos com Meta Edital Inscrição >= 100

function formatBRPctDirect(num) {
    return num.toFixed(2).replace('.', ',') + '%';
}

function getPolosFiltrados(polosData) {
    return polosData.filter(row => parseBRNumber(row[13]) >= META_EDITAL_INSC_MINIMA);
}

function extractCarteiraLimpa(row) {
  return (row[5] || '').toString().replace(/^gerente\s+/i, '').trim();
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

function processAndRenderInsights(polosData) {
    const polos = getPolosFiltrados(polosData);
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
            title: carteiraDestaque ? `Carteira destaque: Gerente ${carteiraDestaque[0]}` : 'Carteira destaque: sem dados',
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

    const polosData = await fetchSheetData(GID_CAPTACAO_POLO);   // <- adicionar
    if (polosData.length > 0) {                                   // <- adicionar
        processAndRenderInsights(polosData);                      // <- adicionar
    }                                                              // <- adicionar
}
const now = new Date();

document.addEventListener('DOMContentLoaded', initDashboardInscricoes);

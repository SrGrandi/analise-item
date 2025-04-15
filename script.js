// =============================================
// FUNÇÕES AUXILIARES (definir no início do arquivo)
// =============================================
function showNotification(type, message, solution = '') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  notification.innerHTML = `
    <div class="notification-header">
      ${type === 'error' ? '⚠️ Erro' : 'ℹ️ Informação'}
    </div>
    <div class="notification-message">${message}</div>
    ${solution ? `<div class="notification-solution">Solução: ${solution}</div>` : ''}
    <button class="notification-close">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 10000);
  notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
}

function updateFileProgress(container, loaded, total, currentFile = '') {
  const progress = Math.round((loaded / total) * 100);
  
  container.innerHTML = `
    <div class="file-loading-container">
      <div class="file-progress-bar">
        <div class="file-progress" style="width: ${progress}%"></div>
      </div>
      <div class="file-progress-text">
        ${loaded} de ${total} arquivos processados
        ${currentFile ? `<div class="current-file">${currentFile}</div>` : ''}
      </div>
    </div>
  `;
}

function renderFileList(container) {
  if (xmlContents.length === 0) {
    container.innerHTML = "<div class='notification-info'>Nenhum arquivo válido foi carregado</div>";
    return;
  }
  
  const list = document.createElement('div');
  list.className = 'file-list';
  
  const header = document.createElement('div');
  header.className = 'file-list-header';
  header.textContent = `Arquivos carregados (${xmlContents.length}):`;
  list.appendChild(header);
  
  xmlContents.forEach((file, index) => {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-list-item';
    fileElement.innerHTML = `
      <span class="file-index">${index + 1}.</span>
      <span class="file-name">${file.name}</span>
      <span class="file-status">✅</span>
    `;
    list.appendChild(fileElement);
  });
  
  container.innerHTML = '';
  container.appendChild(list);
}

function showTooltip(message) {
  let tooltip = document.getElementById("analysis-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "analysis-tooltip";
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = message;
  tooltip.style.display = "block";
}

function hideTooltip() {
  const tooltip = document.getElementById("analysis-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

function handleFetch(response) {
  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao carregar ${response.url}`);
  }
  return response.json();
}

function updateAnalysisProgress(current, total, message = '') {
  const progress = Math.round((current / total) * 100);
  const progressBar = document.querySelector(".analysis-progress .progress");
  const progressText = document.querySelector(".analysis-progress .progress-text");
  const currentItem = document.querySelector(".analysis-progress .current-item");
  
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Processando (${current}/${total})`;
  if (currentItem && message) currentItem.textContent = message;
}

// =============================================
// CÓDIGO PRINCIPAL
// =============================================
let xmlContents = []; // Array para armazenar múltiplos XMLs
let produtoGlobal = null;

// Carregar múltiplos XMLs
document.getElementById("xmlFiles").addEventListener("change", function (e) {
  const files = e.target.files;
  const fileNamesDiv = document.getElementById("selectedFileNames");
  
  fileNamesDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>Preparando para carregar ${files.length} arquivo(s)...</span>
    </div>
  `;
  
  if (files.length === 0) {
    fileNamesDiv.innerHTML = "<div class='notification-info'>Nenhum arquivo selecionado</div>";
    return;
  }

  xmlContents = [];
  document.getElementById("analyzeBtn").disabled = true;
  
  let filesLoaded = 0;
  const totalFiles = files.length;
  
  updateFileProgress(fileNamesDiv, filesLoaded, totalFiles);
  
  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    
    reader.onloadstart = function() {
      updateFileProgress(fileNamesDiv, filesLoaded, totalFiles, `Lendo ${file.name}...`);
    };
    
    reader.onload = function() {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(reader.result, "application/xml");
        
        const errorNode = xmlDoc.querySelector("parsererror");
        if (errorNode) {
          throw new Error("Arquivo XML inválido");
        }
        
        xmlContents.push({
          name: file.name,
          doc: xmlDoc
        });
        
        filesLoaded++;
        updateFileProgress(fileNamesDiv, filesLoaded, totalFiles, `Processado: ${file.name}`);
        
        if (filesLoaded === totalFiles) {
          showNotification('success', 'Carregamento concluído', `${totalFiles} arquivo(s) XML foram carregados com sucesso.`);
          renderFileList(fileNamesDiv);
          document.getElementById("analyzeBtn").disabled = false;
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", file.name, error);
        showNotification('error', `Erro no arquivo ${file.name}`, 'O arquivo pode estar corrompido ou não é um XML válido. Verifique e tente novamente.');
        filesLoaded++;
        updateFileProgress(fileNamesDiv, filesLoaded, totalFiles);
      }
    };
    
    reader.onerror = function() {
      showNotification('error', `Falha ao ler o arquivo ${file.name}`, 'O arquivo pode estar inacessível. Verifique as permissões e tente novamente.');
      filesLoaded++;
      updateFileProgress(fileNamesDiv, filesLoaded, totalFiles);
    };
    
    reader.readAsText(file);
  });
});

document.getElementById("analyzeBtn").addEventListener("click", function () {
  const container = document.getElementById("results");
  container.innerHTML = `
    <div class="analysis-progress">
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" style="width: 0%"></div>
        </div>
        <div class="progress-text">Preparando análise (0/${document.querySelectorAll(".item-input").length})</div>
        <div class="current-item"></div>
      </div>
    </div>
  `;
  
  const itens = document.querySelectorAll(".item-input");
  const totalItens = itens.length;
  let itensProcessados = 0;
  
  document.getElementById("analyzeBtn").disabled = true;
  document.getElementById("addItemBtn").disabled = true;
  
  itens.forEach((item, index) => {
    const codigo = String(Number(item.querySelector(".codigo-input").value));
    const convenio = item.querySelector(".convenio-select").value;
    
    updateAnalysisProgress(index + 1, totalItens, `Processando item ${codigo}...`);
    
    if (isNaN(Number(codigo)) || codigo === "0") {
      showNotification('error', 'Código inválido', `O item na posição ${index + 1} contém um código inválido`);
      itensProcessados++;
      updateAnalysisProgress(itensProcessados, totalItens);
      return;
    }
    
    processarItem(codigo, convenio, index)
      .finally(() => {
        itensProcessados++;
        if (itensProcessados === totalItens) {
          document.getElementById("analyzeBtn").disabled = false;
          document.getElementById("addItemBtn").disabled = false;
          document.querySelector(".analysis-progress").innerHTML += `
            <div class="analysis-complete">
              ✅ Análise concluída - ${totalItens} itens processados
            </div>
          `;
        }
      });
  });
});

async function processarItem(codigo, convenio, index) {
  try {
    showTooltip(`Buscando produto ${codigo} na base de dados...`);
    
    const [dadosProdutos, dadosAnvisa, tabelaIpi] = await Promise.all([
      fetch('./assets/exportardados.json').then(handleFetch),
      fetch('./assets/anvisa.json').then(handleFetch),
      fetch('./assets/tabelatipi.json').then(handleFetch)
    ]);
    
    showTooltip(`Analisando tributação para ${codigo}...`);
    
    const produto = dadosProdutos.find(p => p.Codigo === codigo);
    produtoGlobal = produto;
    const descricao = produto ? produto.Descrição : "Descrição não encontrada";

    const { 
      ncmFormatado, 
      cestFormatado, 
      cestStyle, 
      alertaCest, 
      nFCI, 
      origem, 
      fciParaExibir, 
      xmlEncontrado 
    } = buscarNCMECest(produto, dadosAnvisa);

    let precoMonitorado = "Produto não cadastrado na CMED";
    if (produto && produto["Cód. Barras"] && dadosAnvisa) {
      const produtoAnvisa = dadosAnvisa.find(item =>
        item["EAN 1"] === produto["Cód. Barras"] ||
        item["EAN 2"] === produto["Cód. Barras"] ||
        item["EAN 3"] === produto["Cód. Barras"]
      );

      if (produtoAnvisa && produtoAnvisa["PF 20,5 %"]) {
        precoMonitorado = `R$: ${produtoAnvisa["PF 20,5 %"]}`;
      }
    }

    const tabela = gerarTabela({
      index,
      codigo,
      descricao,
      ncmFormatado,
      cestFormatado,
      cestStyle,
      alertaCest,
      convenio,
      tabelaIpi,
      nFCI,
      precoMonitorado,
      xmlEncontrado,
      origem,
      fciParaExibir
    });

    document.getElementById("results").appendChild(tabela);
    document.getElementById("results").appendChild(criarBotaoCopiar(tabela, index));
    showCopyAllButton();
  } catch (err) {
    console.error("Erro ao processar item:", err);
    showNotification('error', `Falha no item ${codigo}`, err.message);
  } finally {
    hideTooltip();
  }
}

function determinarClassificacaoTributaria(convenio, cestFormatado, origem, debitoCredito, ncmFormatado) {
    // Remove pontos do CEST para comparação
    const cestNumerico = cestFormatado.replace(/\./g, '');
    const origemNum = origem.charAt(0); // Pega apenas o primeiro caractere da origem (0, 1, 2, etc.)
    
    // Verifica se é nacional (0,4,5,7,3,8) ou importado (1,2)
    const isNacional = ['0', '4', '5', '7', '3', '8'].includes(origemNum);
    const isImportado = ['1', '2'].includes(origemNum);
    const isNacionalizado = ['3', '8'].includes(origemNum);
    
    // 1. Verifica Convênio 87/02 primeiro
    if (convenio === "Convênio 87/02") {
        if (isNacional && !isNacionalizado) {
            // A1-A9
            if (cestNumerico === '1300100') return 'A1 - Convênio 87 - Etic/Nac/Pos';
            if (cestNumerico === '1300101') return 'A2 - Convênio 87 - Etic/Nac/Neg';
            if (cestNumerico === '1300300') return 'A3 - Convênio 87 - Sim/Nac/Pos';
            if (cestNumerico === '1300301') return 'A4 - Convênio 87 - Sim/Nac/Neg';
            if (cestNumerico === '1300200') return 'A5 - Convênio 87 - Gen/Nac/Pos';
            if (cestNumerico === '1300201') return 'A6 - Convênio 87 - Gen/Nac/Neg';
            if (cestNumerico === '1300400') return 'A7 - Convênio 87 - Out/Nac/Pos';
            if (cestNumerico === '1300401') return 'A8 - Convênio 87 - Out/Nac/Neg';
            if (cestNumerico === '1300402') return 'A9 - Convênio 87 - Out/Nac/Neu';
        } 
        else if (isImportado) {
            // B1-B9
            if (cestNumerico === '1300100') return 'B1 - Convênio 87 - Etic/Imp/Pos';
            if (cestNumerico === '1300101') return 'B2 - Convênio 87 - Etic/Imp/Neg';
            if (cestNumerico === '1300300') return 'B3 - Convênio 87 - Sim/Imp/Pos';
            if (cestNumerico === '1300301') return 'B4 - Convênio 87 - Sim/Imp/Neg';
            if (cestNumerico === '1300200') return 'B5 - Convênio 87 - Gen/Imp/Pos';
            if (cestNumerico === '1300201') return 'B6 - Convênio 87 - Gen/Imp/Neg';
            if (cestNumerico === '1300400') return 'B7 - Convênio 87 - Out/Imp/Pos';
            if (cestNumerico === '1300401') return 'B8 - Convênio 87 - Out/Imp/Neg';
            if (cestNumerico === '1300402') return 'B9 - Convênio 87 - Out/Imp/Neu';
        }
        else if (isNacionalizado) {
            // I7-J5
            if (cestNumerico === '1300200') return 'I7 - NACIONALIZADO - CONV. 87 GEN/POS';
            if (cestNumerico === '1300201') return 'I8 - NACIONALIZADO - CONV. 87 GEN/NEG';
            if (cestNumerico === '1300300') return 'I9 - NACIONALIZADO - CONV. 87 SIM/POS';
            if (cestNumerico === '1300301') return 'J1 - NACIONALIZADO - CONV. 87 SIM/NEG';
            if (cestNumerico === '1300100') return 'J2 - NACIONALIZADO - CONV. 87 ETIC/POS';
            if (cestNumerico === '1300101') return 'J3 - NACIONALIZADO - CONV. 87 ETIC/NEG';
            if (cestNumerico === '1300400') return 'J4 - NACIONALIZADO - CONV. 87 OUT/POS';
            if (cestNumerico === '1300401') return 'J5 - NACIONALIZADO - CONV. 87 OUT/NEG';
        }
        
        // C1-C4 (Débito e Crédito)
        if (debitoCredito === 'SIM') {
            if (isNacional) return 'C1 - Convênio 87 - DC/Nac/Pos';
            if (isImportado) return 'C3 - Convênio 87 - DC/Imp/Pos';
        }
    }
    
    // 2. Verifica outros convênios
    if (convenio === "Convênio 162/94") return 'C5 - Convênio 162/94';
    if (convenio === "Convênio 140/01") return 'C6 - Convênio 140/01';
    if (convenio === "Convênio 01/99") return 'C7 - Convênio 01/99';
    if (convenio === "Convênio 126/10") return 'C8 - Convênio 126/10';
    if (convenio === "Convênio 10/02") return 'C9 - Convênio 10/02';
    
    // 3. Verifica CEST específicos sem convênio
    if (debitoCredito === 'SIM') {
        // Fraldas
        if (cestNumerico === '2004800') {
            return isNacional ? 'D3 - Fraldas Nac' : 'D4 - Fraldas Imp';
        }
        
        // Tampões e Absorventes
        if (cestNumerico === '2004900') {
            return isNacional ? 'I1 - Tampões e Absorv. Hig. Nac' : 'I2 - Tampões e Absorv. Hig. Imp';
        }
        
        // Débito/Crédito genérico
        return isNacional ? 'D1 - Deb/Cred Nac' : 'D2 - Deb/Cred Imp';
    }
    
    // 4. Verifica NCM específicos (Luvas)
    const ncmNumerico = ncmFormatado.replace(/\./g, '');
    if (ncmNumerico.startsWith('401511') || ncmNumerico.startsWith('401512') || ncmNumerico.startsWith('401519')) {
        return isNacional ? 'F3 - Luva proced. Nac' : 'F4 - Luva proced. Imp';
    }
    
    // 5. Verifica CEST sem convênio
    if (isNacional && !isNacionalizado) {
        if (cestNumerico === '1300100') return 'F5 - Ético Pos/Nac';
        if (cestNumerico === '1300101') return 'F6 - Ético Neg/Nac';
        if (cestNumerico === '1300200') return 'F7 - Genérico Pos/Nac';
        if (cestNumerico === '1300201') return 'F8 - Genérico Neg/Nac';
        if (cestNumerico === '1300300') return 'F9 - Similar Pos/Nac';
        if (cestNumerico === '1300301') return 'G1 - Similar Neg/Nac';
        if (cestNumerico === '1300400') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1300401') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1300402') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1300500') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1300501') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1300600') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1300700') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1300701') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1300800') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1300801') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1300900') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1300901') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1301000') return 'G2 - Outros Pos/Nac';
        if (cestNumerico === '1301001') return 'G3 - Outros Neg/Nac';
        if (cestNumerico === '1301100') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1301200') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1301300') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1301400') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1301500') return 'G4 - Outros Neu/Nac';
        if (cestNumerico === '1301600') return 'G4 - Outros Neu/Nac';
    } 
    else if (isImportado) {
        if (cestNumerico === '1300100') return 'G5 - Ético Pos/Imp';
        if (cestNumerico === '1300101') return 'G6 - Ético Neg/Imp';
        if (cestNumerico === '1300200') return 'G7 - Genérico Pos/Imp';
        if (cestNumerico === '1300201') return 'G8 - Genérico Neg/Imp';
        if (cestNumerico === '1300300') return 'G9 - Similar Pos/Imp';
        if (cestNumerico === '1300301') return 'H1 - Similar Neg/Imp';
        if (cestNumerico === '1300400') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1300401') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1300402') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1300500') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1300501') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1300600') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1300700') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1300701') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1300800') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1300801') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1300900') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1300901') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1301000') return 'H2 - Outros Pos/Imp';
        if (cestNumerico === '1301001') return 'H3 - Outros Neg/Imp';
        if (cestNumerico === '1301100') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1301200') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1301300') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1301400') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1301500') return 'H4 - Outros Neu/Imp';
        if (cestNumerico === '1301600') return 'H4 - Outros Neu/Imp';
    }
    else if (isNacionalizado) {
        if (cestNumerico === '1300200') return 'J6 - NACIONALIZADO - GEN/POS';
        if (cestNumerico === '1300201') return 'J7 - NACIONALIZADO - GEN/NEG';
        if (cestNumerico === '1300300') return 'J8 - NACIONALIZADO - SIM/POS';
        if (cestNumerico === '1300301') return 'J9 - NACIONALIZADO - SIM/NEG';
        if (cestNumerico === '1300100') return 'K1 - NACIONALIZADO - ETIC/POS';
        if (cestNumerico === '1300101') return 'K2 - NACIONALIZADO - ETIC/NEG';
        if (cestNumerico === '1300400') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1300401') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1300402') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1300500') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1300501') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1300600') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1300700') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1300701') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1300800') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1300801') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1300900') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1300901') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1301000') return 'K3 - NACIONALIZADO - OUT/POS';
        if (cestNumerico === '1301001') return 'K4 - NACIONALIZADO - OUT/NEG';
        if (cestNumerico === '1301100') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1301200') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1301300') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1301400') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1301500') return 'K5 - NACIONALIZADO - OUT/NEU';
        if (cestNumerico === '1301600') return 'K5 - NACIONALIZADO - OUT/NEU';
    }
    
    // Se nenhum caso acima for atendido
    return 'Classificação não encontrada';
}

function verificarSubstituicaoTributaria(ncm, cest) {
  const ncmNumerico = ncm.replace(/\./g, '');
  const cestNumerico = cest.replace(/\./g, '');

  const combinacoesST = {
    '3003': ['1300100', '1300101', '1300102', '1300200', '1300201', '1300202',
             '1300300', '1300301', '1300302', '1300400', '1300401', '1300402'],
    '3004': ['1300100', '1300101', '1300102', '1300200', '1300201', '1300202',
             '1300300', '1300301', '1300302', '1300400', '1300401', '1300402'],
    '30066000': ['1300500', '1300501'],
    '2936': ['1300600'],
    '300630': ['1300700', '1300701'],
    '3002': ['1300800', '1300801', '1300901'],
    '30051010': ['1301000', '1301001'],
    '3005': ['1301100'],
    '40151100': ['1301200'],
    '40151900': ['1301200'],
    '40141000': ['1301300'],
    '901831': ['1301400'],
    '901832': ['1301500'],
    '39269090': ['1301600'],
    '90189099': ['1301600']
  };

  if (ncmNumerico.length < 4) return false;

  if (combinacoesST[ncmNumerico]) {
    return combinacoesST[ncmNumerico].includes(cestNumerico);
  }

  const ncmBase = ncmNumerico.substring(0, 4);
  if (combinacoesST[ncmBase]) {
    return combinacoesST[ncmBase].includes(cestNumerico);
  }

  return false;
}

function verificarPisCofins(ncmFormatado) {
  const ncmNumerico = ncmFormatado.replace(/\./g, '');

  const tabelaPisCofins = {
    '30051090': { saida: 'SIM', entrada: 'SIM' },
    '3004': { saida: 'NÃO', entrada: 'NÃO' },
    '3003': { saida: 'NÃO', entrada: 'NÃO' },
    '21069030': { saida: 'SIM', entrada: 'SIM' },
    '96190000': { saida: 'SIM', entrada: 'SIM' },
    '30059090': { saida: 'SIM', entrada: 'SIM' },
    '90183929': { saida: 'SIM', entrada: 'SIM' },
    '87131000': { saida: 'NÃO', entrada: 'NÃO' },
    '90189099': { saida: 'SIM', entrada: 'SIM' },
    '90211099': { saida: 'SIM', entrada: 'SIM' },
    '30021520': { saida: 'NÃO', entrada: 'NÃO' },
    '48195000': { saida: 'SIM', entrada: 'SIM' },
    '38089429': { saida: 'SIM', entrada: 'SIM' },
    '63079010': { saida: 'SIM', entrada: 'SIM' },
    '90189010': { saida: 'SIM', entrada: 'SIM' },
    '33069000': { saida: 'NÃO', entrada: 'NÃO' },
    '34029019': { saida: 'SIM', entrada: 'SIM' },
    '40151200': { saida: 'SIM', entrada: 'SIM' },
    '90183921': { saida: 'SIM', entrada: 'SIM' },
    '48191000': { saida: 'SIM', entrada: 'SIM' },
    '90183119': { saida: 'SIM', entrada: 'SIM' },
    '90183219': { saida: 'SIM', entrada: 'SIM' },
    '90211020': { saida: 'NÃO', entrada: 'NÃO' },
    '39269030': { saida: 'SIM', entrada: 'SIM' },
    '30051030': { saida: 'SIM', entrada: 'SIM' },
    '90211010': { saida: 'NÃO', entrada: 'NÃO' },
    '38089919': { saida: 'SIM', entrada: 'SIM' },
    '30066000': { saida: 'SIM', entrada: 'SIM', aliquota: '2,10% e 9,90%' },
    '52030000': { saida: 'SIM', entrada: 'SIM' },
    '35079049': { saida: 'SIM', entrada: 'SIM' }
  };

  if (tabelaPisCofins[ncmNumerico]) {
    return tabelaPisCofins[ncmNumerico];
  }

  const ncmBase4 = ncmNumerico.substring(0, 4);
  if (tabelaPisCofins[ncmBase4]) {
    return tabelaPisCofins[ncmBase4];
  }

  const ncmBase6 = ncmNumerico.substring(0, 6);
  if (tabelaPisCofins[ncmBase6]) {
    return tabelaPisCofins[ncmBase6];
  }

  return null;
}

function verificarIpi(ncmFormatado, tabelaIpi) {
  if (!ncmFormatado || !tabelaIpi) return { temIpi: false, aliquota: 0 };

  const ncmNumerico = ncmFormatado.replace(/\./g, '');
  
  if (ncmNumerico.length >= 8) {
    const ncm8digitos = ncmNumerico.substring(0, 8);
    const entradaIpi = tabelaIpi.find(item => item.NCM === ncm8digitos);
    if (entradaIpi) {
      return {
        temIpi: entradaIpi["ALÍQUOTA (%)"] > 0,
        aliquota: entradaIpi["ALÍQUOTA (%)"]
      };
    }
  }

  if (ncmNumerico.length >= 6) {
    const ncm6digitos = ncmNumerico.substring(0, 6);
    const entradaIpi = tabelaIpi.find(item => item.NCM === ncm6digitos);
    if (entradaIpi) {
      return {
        temIpi: entradaIpi["ALÍQUOTA (%)"] > 0,
        aliquota: entradaIpi["ALÍQUOTA (%)"]
      };
    }
  }

  if (ncmNumerico.length >= 4) {
    const ncm4digitos = ncmNumerico.substring(0, 4);
    const entradaIpi = tabelaIpi.find(item => item.NCM === ncm4digitos);
    if (entradaIpi) {
      return {
        temIpi: entradaIpi["ALÍQUOTA (%)"] > 0,
        aliquota: entradaIpi["ALÍQUOTA (%)"]
      };
    }
  }

  return { temIpi: false, aliquota: 0 };
}

function buscarNCMECest(produto, dadosAnvisa) {
  let ncmFormatado = "NCM não encontrado";
  let cestFormatado = "CEST não encontrado";
  let cestStyle = "";
  let alertaCest = "";
  let nFCI = "";
  let origem = "0";
  let fciParaExibir = "";
  let xmlEncontrado = "Não encontrado em nenhum XML";

  if (produto && produto["Cód. Barras"] && xmlContents.length > 0) {
    // Procura em todos os XMLs
    for (const xmlData of xmlContents) {
      const xmlContent = xmlData.doc;
      const ceans = xmlContent.getElementsByTagName("cEAN");
      
      for (let i = 0; i < ceans.length; i++) {
        const cean = ceans[i].textContent.trim();
        if (cean === produto["Cód. Barras"]) {
          const ncms = xmlContent.getElementsByTagName("NCM");
          const cests = xmlContent.getElementsByTagName("CEST");
          const nFCIs = xmlContent.getElementsByTagName("nFCI");
          const origTags = xmlContent.getElementsByTagName("orig");

          // Processa NCM
          const ncmRaw = ncms[i]?.textContent.trim() || "";
          if (ncmRaw.length === 8) {
            ncmFormatado = `${ncmRaw.slice(0, 4)}.${ncmRaw.slice(4, 6)}.${ncmRaw.slice(6, 8)}`;
          } else {
            ncmFormatado = ncmRaw;
          }

          // Processa CEST
          const cestRaw = cests[i]?.textContent.trim() || "";
          const ncmComecaCom30 = ncmRaw.startsWith("30");

          if (cestRaw.length === 7) {
            if (cestRaw === "0000000") {
              cestFormatado = "Sem CEST";
            } else {
              cestFormatado = `${cestRaw.slice(0, 2)}.${cestRaw.slice(2, 5)}.${cestRaw.slice(5, 7)}`;
            }
          } else {
            if (ncmComecaCom30) {
              cestFormatado = "🔴 Obrigatório - Não informado";
              cestStyle = 'style="color: red; font-weight: bold;"';
            } else {
              cestFormatado = "Sem CEST";
            }
          }

          // Processa FCI e Origem
          if (nFCIs.length > i) {
            nFCI = nFCIs[i]?.textContent.trim() || "";
          }

          if (origTags.length > i) {
            origem = origTags[i].textContent.trim();
            
            // AJUSTE DA ORIGEM CONFORME SOLICITADO
            if (origem === "1") {
              origem = "2"; // Muda de 1 para 2
            } else if (origem === "6") {
              origem = "7"; // Muda de 6 para 7
            }
            
            if (origem === "5") {
              const fciTags = xmlContent.getElementsByTagName("nFCI");
              if (fciTags.length > i) {
                fciParaExibir = fciTags[i]?.textContent.trim() || "";
              }
            }
          }

          // Validação do CEST
          const podeValidarCEST = !cestFormatado.includes("🔴") && cestFormatado !== "Sem CEST";

          if (podeValidarCEST) {
            const entradaAnvisa = dadosAnvisa.find(entry =>
              [entry["EAN 1"], entry["EAN 2"], entry["EAN 3"]].includes(cean)
            );

            if (entradaAnvisa) {
              const tipo = (entradaAnvisa["TIPO DE PRODUTO (STATUS DO PRODUTO)"] || "").trim();
              const lista = (entradaAnvisa["LISTA DE CONCESSÃO DE CRÉDITO TRIBUTÁRIO (PIS/COFINS)"] || "").trim();
              const combinacao = `${tipo || "Vazio"}, ${lista || "Vazio"}`;

              const permitido = {
              "Biológico, Positiva": ["13.001.00", "13.004.00"],
              "Biológico, Negativa": ["13.001.01", "13.004.01"],
              "Biológico, Neutra": ["13.001.02", "13.004.02"],
              "Biológico, Vazio": ["13.001.00", "13.001.01", "13.001.02", "13.004.00", "13.004.01", "13.004.02"],
              "Específico, Positiva": ["13.001.00", "13.004.00"],
              "Específico, Negativa": ["13.001.01", "13.004.01"],
              "Específico, Neutra": ["13.001.02", "13.004.02"],
              "Específico, Vazio": ["13.001.00", "13.001.01", "13.001.02", "13.004.00", "13.004.01", "13.004.02"],
              "Fitoterápico, Positiva": /00$/,
              "Fitoterápico, Negativa": /01$/,
              "Fitoterápico, Neutra": /02$/,
              "Fitoterápico, Vazio": /(00|01|02)$/,
              "Genérico, Positiva": ["13.002.00"],
              "Genérico, Negativa": ["13.002.01"],
              "Genérico, Neutra": ["13.002.02"],
              "Genérico, Vazio": ["13.002.00", "13.002.01", "13.002.02"],
              "Novo, Positiva": ["13.001.00", "13.004.00"],
              "Novo, Negativa": ["13.001.01", "13.004.01"],
              "Novo, Neutra": ["13.001.02", "13.004.02"],
              "Novo, Vazio": ["13.001.00", "13.001.01", "13.001.02", "13.004.00", "13.004.01", "13.004.02"],
              "Produtos de Terapia Avançada, Positiva": /00$/,
              "Produtos de Terapia Avançada, Negativa": /01$/,
              "Produtos de Terapia Avançada, Neutra": /02$/,
              "Produtos de Terapia Avançada, Vazio": /(00|01|02)$/,
              "Radiofármaco, Positiva": /00$/,
              "Radiofármaco, Negativa": /01$/,
              "Radiofármaco, Neutra": /02$/,
              "Radiofármaco, Vazio": /(00|01|02)$/,
              "Similar, Positiva": ["13.003.00"],
              "Similar, Negativa": ["13.003.01"],
              "Similar, Neutra": ["13.003.02"],
              "Similar, Vazio": ["13.003.00", "13.003.01", "13.003.02"],
              "-, Positiva": /00$/,
              "-, Negativa": /01$/,
              "-, Neutra": /02$/,
              "-, Vazio": /(00|01|02)$/,
              "Vazio, Positiva": /00$/,
              "Vazio, Negativa": /01$/,
              "Vazio, Neutra": /02$/,
              "Vazio, Vazio": /(00|01|02)$/,
            };

            const regra = permitido[combinacao];
              const validado = Array.isArray(regra)
                ? regra.includes(cestFormatado)
                : regra?.test?.(cestFormatado);

              if (regra && !validado) {
                alertaCest = "⚠️ CEST incompatível com tipo/lista";
                cestStyle = 'style="color: red; font-weight: bold;"';
              }
            }
          }

          xmlEncontrado = xmlData.name;
          
          // Retorna ao encontrar o primeiro registro
          return { 
            ncmFormatado, 
            cestFormatado, 
            cestStyle, 
            alertaCest, 
            nFCI,
            origem,
            fciParaExibir,
            xmlEncontrado
          };
        }
      }
    }
  }

  return { 
    ncmFormatado, 
    cestFormatado, 
    cestStyle, 
    alertaCest, 
    nFCI,
    origem,
    fciParaExibir,
    xmlEncontrado
  };
}

function determinarLista(cestFormatado) {
  if (!cestFormatado || cestFormatado === "Sem CEST") return "NEUTRA";
  
  const cestNumerico = cestFormatado.replace(/\./g, '');
  
  // Verifica se o CEST está entre 13.001.00 e 13.010.02
  const prefixoValido = cestNumerico.startsWith('13') && 
                       parseInt(cestNumerico.substring(2, 5)) >= 1 && 
                       parseInt(cestNumerico.substring(2, 5)) <= 10;
  
  if (prefixoValido) {
      const final = cestNumerico.substring(5);
      if (final === '00') return "POSITIVA";
      if (final === '01') return "NEGATIVA";
      if (final === '02') return "NEUTRA";
  }
  
  return "NEUTRA";
}

function gerarTabela({ 
  index, 
  codigo, 
  descricao, 
  ncmFormatado, 
  cestFormatado, 
  cestStyle, 
  alertaCest, 
  convenio, 
  tabelaIpi, 
  nFCI, 
  precoMonitorado, 
  xmlEncontrado,
  origem,
  fciParaExibir
}) {
  const temST = verificarSubstituicaoTributaria(ncmFormatado, cestFormatado);
  const debitoCredito = temST ? 'NÃO' : 'SIM';
  
  const pisCofins = verificarPisCofins(ncmFormatado);
  let statusPisCofins = "NÃO";
  let alertaPisCofins = "";
  
  if (pisCofins) {
    statusPisCofins = pisCofins.saida;
    if (pisCofins.aliquota) {
      statusPisCofins += ` (${pisCofins.aliquota})`;
    }
  } else {
    statusPisCofins = "🔴 NCM não cadastrado no PIS/COFINS";
    alertaPisCofins = 'style="color: red; font-weight: bold;"';
  }

  const { temIpi, aliquota } = verificarIpi(ncmFormatado, tabelaIpi);
  const statusIpi = temIpi ? `SIM (${aliquota}%)` : 'NÃO';

  let finalCST = "00";
  if (convenio !== "Não") {
    finalCST = "40";
  } else if (debitoCredito === 'NÃO') {
    finalCST = "60";
  }

  const cstCompleto = origem + finalCST;

  const descricaoOrigem = 
    origem === "0" ? "0 - Nacional, exceto as indicadas nos códigos 3,4,5 e 8" :
    origem === "1" ? "1 - Estrangeira- importação direta, exceto a indicada no codigo 6" :
    origem === "2" ? "2 - Estrangeira- Adquirida no mercado interno, Exceto a indicada no codigo 7" :
    origem === "3" ? "3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%" :
    origem === "4" ? "4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos de que tratam o Decreto-Lei no 288/67, e as Leis nos 8.248/91, 8.387/91, 10.176/01 e 11.484/07." :
    origem === "5" ? "5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%(quarenta por cento)" :
    origem === "6" ? "6 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista de Resolução CAMEX e gás natural." :
    origem === "7" ? "7 - Estrangeira- Adquirida no mercado interno, sem similar nacional, constante em lista de Resolução CAMEX e gás natural." :
    origem === "8" ? "Nacional, mercadoira ou bem com Conteúdo de Importação superior a 70%(setenta por cento)." :
    origem;

  const classificacaoTributaria = determinarClassificacaoTributaria(
    convenio, 
    cestFormatado, 
    origem, 
    debitoCredito, 
    ncmFormatado
  );

  const lista = determinarLista(cestFormatado);
  const temProblema = alertaCest || cestFormatado.includes("🔴") || ncmFormatado === "NCM não encontrado";

  const container = document.createElement("div");
  container.className = `result-container ${temProblema ? 'has-issue' : ''}`;
  
  container.innerHTML = `
    <div class="result-header">
      <span class="result-status">${temProblema ? '⚠️' : '✅'}</span>
      <span class="result-title">Item ${index + 1} - Cód. ${codigo}</span>
      <span class="result-time">${new Date().toLocaleTimeString()}</span>
    </div>
    <table class="result-table" id="resultTable${index}">
      <tr><td>Código</td><td>${codigo}</td></tr>
      <tr><td>Desc. Item</td><td>${descricao}</td></tr>
      <tr><td>NCM</td><td>${ncmFormatado}</td></tr>
      <tr><td>CEST</td><td ${cestStyle}>${cestFormatado} ${alertaCest}</td></tr>
      <tr><td>Substituição Tributária</td><td>${temST ? 'SIM' : 'NÃO'}</td></tr>
      <tr><td>Débito e Crédito</td><td>${debitoCredito}</td></tr>
      <tr><td>PIS/COFINS</td><td ${alertaPisCofins}>${statusPisCofins}</td></tr>
      <tr><td>IPI</td><td>${statusIpi}</td></tr>
      <tr><td>CST</td><td>${cstCompleto}</td></tr>
      <tr><td>Número do FCI</td><td>${fciParaExibir}</td></tr>
      <tr><td>Convênio</td><td>${convenio !== "Não" ? "SIM - " + convenio : "NÃO"}</td></tr>
      <tr><td>Origem</td><td>${descricaoOrigem}</td></tr>
      <tr><td>Preço (Monitorado - PF 20,5%)</td><td>${precoMonitorado}</td></tr>
      <tr><td>Lista</td><td>${lista}</td></tr>
      <tr><td>Classificação Tributária</td><td>${classificacaoTributaria}</td></tr>
      <tr><td>XML Encontrado</td><td>${xmlEncontrado}</td></tr>
    </table>
  `;
  
  return container;
}

function criarBotaoCopiar(tabela, index) {
  const copiarBtn = document.createElement("button");
  copiarBtn.className = "copy-button";
  copiarBtn.id = `copyBtn${index}`;
  copiarBtn.textContent = "Copiar";
  copiarBtn.onclick = () => copiarTabela(tabela, copiarBtn);
  return copiarBtn;
}

function copiarTabela(tabela, botao) {
  // Criar uma versão formatada para o Outlook
  const rows = tabela.querySelectorAll("tr");
  let textoFormatado = "";
  
  rows.forEach(row => {
    const cols = row.querySelectorAll("td");
    if (cols.length === 2) {
      textoFormatado += `${cols[0].textContent}: ${cols[1].textContent}\n`;
    }
  });
  
  // Copiar para área de transferência
  const temp = document.createElement("textarea");
  temp.value = textoFormatado;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  
  // Feedback visual
  botao.classList.add("copiado");
  botao.textContent = "✅ Copiado";
  setTimeout(() => {
    botao.classList.remove("copiado");
    botao.textContent = "Copiar";
  }, 1500);
}

// Copiar todos os resultados
document.getElementById("copyAllBtn").addEventListener("click", function() {
  const tabelas = document.querySelectorAll(".result-table");
  let textoFormatado = "";
  
  tabelas.forEach(tabela => {
    const rows = tabela.querySelectorAll("tr");
    rows.forEach(row => {
      const cols = row.querySelectorAll("td");
      if (cols.length === 2) {
        textoFormatado += `${cols[0].textContent}: ${cols[1].textContent}\n`;
      }
    });
    textoFormatado += "\n"; // Espaço entre itens
  });
  
  const temp = document.createElement("textarea");
  temp.value = textoFormatado;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  
  const botao = document.getElementById("copyAllBtn");
  botao.classList.add("copiado");
  botao.textContent = "✅ Copiado Todos";
  setTimeout(() => {
    botao.classList.remove("copiado");
    botao.textContent = "Copiar Todos";
  }, 1500);
});

// Adicionar novo item - Versão corrigida
document.getElementById("addItemBtn").addEventListener("click", function() {
  const newItem = document.createElement("div");
  newItem.className = "item-input";
  newItem.innerHTML = `
    <input type="number" placeholder="Código do Produto" class="codigo-input" min="1">
    <select class="convenio-select">
      <option value="Não" selected>Não</option>
      <option value="Convênio 10/02">Convênio 10/02</option>
      <option value="Convênio 01/99">Convênio 01/99</option>
      <option value="Convênio 87/02">Convênio 87/02</option>
      <option value="Convênio 126/10">Convênio 126/10</option>
      <option value="Convênio 162/94">Convênio 162/94</option>
      <option value="Convênio 140/01">Convênio 140/01</option>
    </select>
    <button type="button" class="removeBtn">Remover</button>
  `;
  
  document.getElementById("itemsContainer").appendChild(newItem);
  
  newItem.querySelector(".removeBtn").addEventListener("click", function() {
    const itens = document.querySelectorAll(".item-input");
    if (itens.length > 1) {
      newItem.remove();
    } else {
      alert("Você precisa ter pelo menos um item na lista.");
    }
  });
});

// Remover item
function removeItem(button) {
  const item = button.parentNode;
  if (document.querySelectorAll(".item-input").length > 1) {
    item.remove();
  } else {
    alert("Você precisa ter pelo menos um item na lista.");
  }
}

// Mostrar botão "Copiar Todos" quando houver resultados
function showCopyAllButton() {
  const copyAllBtn = document.getElementById("copyAllBtn");
  if (document.querySelectorAll(".result-container").length > 0) {
    copyAllBtn.style.display = "inline-block";
  } else {
    copyAllBtn.style.display = "none";
  }
}

// Adiciona eventos de clique a todos os botões de remover existentes
document.querySelectorAll(".removeBtn").forEach(btn => {
  btn.addEventListener("click", function() {
    removeItem(this);
  });
});
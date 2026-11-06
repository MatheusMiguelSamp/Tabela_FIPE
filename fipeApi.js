const BASE_URL = "https://brasilapi.com.br/api/fipe";

/* ---------- utilitários ---------- */

// Mostra o indicador de processamento, executa a tarefa e limpa/mostra erro no fim
async function comStatus(mensagem, tarefa) {
    const status = document.getElementById("status");
    status.className = "";
    status.innerHTML = `<span class="spinner"></span>⏳ ${mensagem}`;
    try {
        await tarefa();
        status.textContent = "";
    }
    catch (error) {
        console.error(error);
        status.className = "erro";
        status.textContent = error.message;
    }
}

// fetch + validação + JSON, com limite de tempo para não travar em "Consultando..."
async function buscarJson(url, tempoLimiteMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), tempoLimiteMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao consultar a API da FIPE.`);
        }
        return await response.json();
    }
    catch (error) {
        if (error.name === "AbortError") {
            throw new Error("A API demorou demais para responder. Tente novamente.");
        }
        throw error;
    }
    finally {
        clearTimeout(timer);
    }
}

// Zera um <select> e deixa só a opção de placeholder
function resetarSelect(id, textoPadrao, desabilitar = true) {
    const select = document.getElementById(id);
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = textoPadrao;
    select.appendChild(option);
    select.disabled = desabilitar;
    return select;
}

function preencherSelect(select, itens, campoValor, campoTexto) {
    itens.forEach(item => {
        const option = document.createElement("option");
        option.value = item[campoValor];
        option.textContent = item[campoTexto];
        select.appendChild(option);
    });
    select.disabled = false;
}

/* ---------- fluxo: tipo -> marca -> modelo -> ano -> detalhes ---------- */

async function filtrarMarcas() {
    const tipo = document.getElementById("tipo").value;

    // Mudou o tipo: limpa tudo que depende dele
    const selectMarca = resetarSelect("marca", "Selecione a marca...");
    resetarSelect("modelo", "Selecione o modelo...");
    resetarSelect("ano", "Selecione o ano...");
    document.getElementById("btnConsultar").disabled = true;

    await comStatus("Carregando marcas...", async () => {
        const data = await buscarJson(`${BASE_URL}/marcas/v1/${tipo}`);
        preencherSelect(selectMarca, data, "valor", "nome");
    });
}

async function filtrarModelos() {
    const tipo = document.getElementById("tipo").value;
    const marca = document.getElementById("marca").value;

    const selectModelo = resetarSelect("modelo", "Selecione o modelo...");
    resetarSelect("ano", "Selecione o ano...");
    document.getElementById("btnConsultar").disabled = true;
    if (!marca) return;

    await comStatus("Carregando modelos...", async () => {
        const data = await buscarJson(`${BASE_URL}/veiculos/v1/${tipo}/${marca}`);
        preencherSelect(selectModelo, data, "valor", "modelo");
    });
}

async function filtrarAnos() {
    const tipo = document.getElementById("tipo").value;
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("modelo").value;

    const selectAno = resetarSelect("ano", "Selecione o ano...");
    document.getElementById("btnConsultar").disabled = true;
    if (!modelo) return;

    await comStatus("Carregando anos...", async () => {
        const data = await buscarJson(`${BASE_URL}/anos/v1/${tipo}/${marca}/${modelo}`);
        preencherSelect(selectAno, data, "valor", "nome");
    });
}

function confirmarAno() {
    const ano = document.getElementById("ano").value;
    console.log("Ano confirmado:", ano);
    // Só libera o botão quando há um ano escolhido
    document.getElementById("btnConsultar").disabled = !ano;
}

async function buscarDetalhes() {
    const tipo = document.getElementById("tipo").value;
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("modelo").value;
    const ano = document.getElementById("ano").value;
    const botao = document.getElementById("btnConsultar");

    if (!marca || !modelo || !ano) {
        const status = document.getElementById("status");
        status.className = "erro";
        status.textContent = "Selecione marca, modelo e ano.";
        return;
    }

    botao.disabled = true;
    await comStatus("Consultando preço...", async () => {
        const data = await buscarJson(`${BASE_URL}/detalhes/v1/${tipo}/${marca}/${modelo}/${ano}`);
        adicionarLinha(data);
    });
    botao.disabled = false;
}

function adicionarLinha(data) {
    const corpoTabela = document.getElementById("corpoTabela");

    //<tr><td>...</td><td>...</td><td>...</td></tr>
    const tr = document.createElement("tr");

    const tdModelo = document.createElement("td");
    tdModelo.textContent = data.modelo;

    const tdAno = document.createElement("td");
    tdAno.textContent = data.anoModelo;

    const tdValor = document.createElement("td");
    tdValor.textContent = data.valor;

    tr.appendChild(tdModelo);
    tr.appendChild(tdAno);
    tr.appendChild(tdValor);

    corpoTabela.appendChild(tr);
}

// Carrega as marcas de carros assim que a página abre
filtrarMarcas();
const API_BASE_URL = 'http://localhost:5000';


const MOCKAROO_API_KEY = ''; // Altere aqui APIKEY

const URL_LISTAR_MOCKAROO = `https://api.mockaroo.com/api/6ac3abc0?&key=${MOCKAROO_API_KEY}`;
const URL_CRIAR_MOCKAROO  = `https://api.mockaroo.com/api/datasets/CARROS?key=${MOCKAROO_API_KEY}`;

let listaVeiculosAtual = [];

async function carregarProdutos() {
    try {
        const response = await fetch(URL_LISTAR_MOCKAROO);
        const data = await response.json();

        listaVeiculosAtual = Array.isArray(data) ? data : [];

        const lista      = document.getElementById('lista-produtos');
        const selectOrdem = document.getElementById('select-produto-ordem');

        lista.innerHTML = '';
        if (selectOrdem) {
            selectOrdem.innerHTML = '<option selected disabled>Selecione um veículo...</option>';
        }

        listaVeiculosAtual.forEach(v => {
            const { id, Montadora: montadora, Modelo: veiculo, Ano_Fabricacao: ano, FaceliftID: facelift } = v;

            lista.innerHTML += `
                <div class="produto-item row align-items-center py-2 border-bottom">
                    <div class="col-1 text-muted small">#${id}</div>
                    <div class="col-2"><strong>${montadora}</strong></div>
                    <div class="col-3">${veiculo}</div>
                    <div class="col-2 text-center"><span class="badge bg-secondary">${ano}</span></div>
                    <div class="col-2 text-muted small">F.Lift: ${facelift}</div>
                    <div class="col-2 text-end">
                        <button onclick="deletarVeiculoExterno('${id}')" class="btn btn-sm btn-outline-danger">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>`;

            if (selectOrdem) {
                selectOrdem.innerHTML += `<option value="${id}">${montadora} ${veiculo} (${ano})</option>`;
            }
        });

    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
    }
}

async function salvarProduto() {
    const inputMontadora = document.getElementById('prod-marca');
    const inputVeiculo   = document.getElementById('prod-nome');
    const inputAno       = document.getElementById('prod-desc');

    const montadora = inputMontadora.value;
    const modelo    = inputVeiculo.value;
    const ano       = inputAno.value;

    if (!montadora || !modelo) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    const idMockaroo = Math.floor(100 + Math.random() * 900);
    const facelift   = `FL${idMockaroo}`;

    const rawText  = `id,Montadora,Modelo,Ano_Fabricacao\n${idMockaroo},${montadora},${modelo},${ano}`;
    const dadosLocal = { id: idMockaroo, veiculo: montadora, modelo, facelift };

    try {
        const [resMock, resLocal] = await Promise.all([
            fetch(URL_CRIAR_MOCKAROO, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: rawText
            }),
            fetch(`${API_BASE_URL}/produto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosLocal)
            })
        ]);

        if (resMock.ok && resLocal.ok) {
            alert("Produto registrado!");
            inputMontadora.value = "";
            inputVeiculo.value   = "";
            inputAno.value       = "";
            carregarProdutos();
        } else {
            alert("Erro ao sincronizar produto entre as bases.");
        }

    } catch (err) {
        console.error("Erro ao salvar produto:", err);
    }
}

async function deletarVeiculoExterno(id) {
    if (!confirm("Deseja remover o veículo?")) return;

    try {
        const [resDelete, resLimpa, resLocal] = await Promise.all([
            fetch('https://my.api.mockaroo.com/deletecar', {
                method: 'DELETE',
                headers: { 'X-API-Key': MOCKAROO_API_KEY }
            }),
            fetch(`https://api.mockaroo.com/api/datasets/CARROS?key=${MOCKAROO_API_KEY}`, {
                method: 'POST',
                headers: { 'content-type': 'text/plain' },
                body: 'id,Montadora,Modelo,Ano_Fabricacao'
            }),
            fetch(`${API_BASE_URL}/produto?id=${id}`, {
                method: 'DELETE'
            })
        ]);

        if (resDelete.ok && resLimpa.ok && resLocal.ok) {
            alert("Veículo deletado do Mockaroo e do banco local.");
            carregarProdutos();
        } else {
            console.error("Mockaroo delete:", resDelete.status, "Limpar:", resLimpa.status, "Local:", resLocal.status);
            alert("Erro na requisição. Verifique o console.");
        }

    } catch (err) {
        console.error("Erro ao deletar veículo:", err);
    }
}

async function carregarOrdens() {
    const response = await fetch(`${API_BASE_URL}/ordens_producao`);
    const data     = await response.json();
    const tabela   = document.getElementById('tabela-ordens');

    tabela.innerHTML = '';
    data.ordens.forEach(ordem => {
        tabela.innerHTML += `
            <tr>
                <td class="text-muted container-inicial">${ordem.id}</td>
                <td class="text-muted container-inicial">${ordem.veiculo}</td>
                <td class="text-muted container-inicial">${ordem.quantidade_prevista}</td>
                <td class="text-muted container-inicial">${ordem.status}</td>
                <td class="text-muted container-inicial">${ordem.data_criacao}</td>
            </tr>`;
    });
}

async function handleAddOP(event) {
    event.preventDefault();

    const select    = document.getElementById('select-produto-ordem');
    const produtoId = select.value;
    const quantidade = document.getElementById('input-qtd-ordem').value;

    if (!produtoId) {
        alert("Selecione um produto.");
        return;
    }

    const veiculo = listaVeiculosAtual.find(v => String(v.id) === String(produtoId));

    try {
        const response = await fetch(`${API_BASE_URL}/ordem_producao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                produto_id:          parseInt(produtoId),
                quantidade_prevista: parseFloat(quantidade),
                veiculo:  veiculo ? veiculo.Montadora  : "Desconhecido",
                modelo:   veiculo ? veiculo.Modelo     : "Desconhecido",
                facelift: veiculo ? veiculo.FaceliftID : "N/A"
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`OP criada com sucesso! ID: ${result.id}`);
            carregarOrdens();
        } else {
            alert("Erro ao criar OP: " + result.message);
        }

    } catch (err) {
        console.error("Erro de conexão:", err);
    }
}

async function gerarChassisMockaroo() {
    const container = document.getElementById('lista-chassis-externos');
    container.innerHTML = '<tr><td colspan="3" class="text-center">Solicitando chassis...</td></tr>';

    try {
        const responseBack = await fetch(`${API_BASE_URL}/ordens_producao`);
        const dataBack     = await responseBack.json();
        const ordens       = dataBack.ordens || [];

        container.innerHTML = '';
        let numeroOrdemGlobal = 1;

        for (const ordem of ordens) {
            try {
                const resMock = await fetch('https://my.api.mockaroo.com/GenerateChassis', {
                    method: 'PUT',
                    headers: {
                        'X-API-Key': MOCKAROO_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderQuantity: ordem.quantidade_prevista.toString() })
                });

                const csvText = await resMock.text();
                const linhas  = csvText.trim().split('\n').slice(1);

                for (const linha of linhas) {
                    const chassi = linha.split(',')[0];

                    await fetch(`${API_BASE_URL}/chassi`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            numero_ordem: numeroOrdemGlobal,
                            ordem_id:     ordem.id,
                            codigo_chassi: chassi
                        })
                    });

                    container.innerHTML += `
                        <tr>
                            <td>${ordem.id}</td>
                            <td>${ordem.veiculo}</td>
                            <td class="font-monospace text-primary text-uppercase">${chassi}</td>
                        </tr>`;

                    numeroOrdemGlobal++;
                }

            } catch (err) {
                console.error(`Erro ao processar OP ${ordem.id}:`, err);
            }
        }

    } catch (err) {
        console.error("Erro ao buscar OPs:", err);
        container.innerHTML = '<tr><td colspan="3" class="text-danger">Erro ao conectar com o servidor local.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    carregarOrdens();
    document.getElementById('tab-orders').addEventListener('click', carregarOrdens);
});
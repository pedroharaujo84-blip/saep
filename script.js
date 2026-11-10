
const equipamentos = [
    "Teclado Logitech",
    "Mouse Logitech",
    "Computador Dell",
    "Notebook Lenovo",
    "Impressora HP",
    "Monitor Samsung",
    "Servidor de Rede",
    "Roteador Wi-Fi",
];

const CHAVE_USUARIOS = "techsupport_usuarios";
const CHAVE_CHAMADOS = "techsupport_chamados";
const CHAVE_SESSAO = "techsupport_sessao";

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function obterUsuarios() {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIOS) || "[]");
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
}

function obterChamados() {
    return JSON.parse(localStorage.getItem(CHAVE_CHAMADOS) || "[]");
}

function salvarChamados(chamados) {
    localStorage.setItem(CHAVE_CHAMADOS, JSON.stringify(chamados));
}

function mostrarMensagem(texto, erro = false) {
    const elemento = document.getElementById("mensagem");

    elemento.textContent = texto;
    elemento.style.color = erro ? "#dc2626" : "#15803d";

    setTimeout(() => {
        elemento.textContent = "";
    }, 4000);
}

function mostrarTela(tela) {
    document.getElementById("cadastro").classList.add("hidden");
    document.getElementById("login").classList.add("hidden");
    document.getElementById("painel").classList.add("hidden");

    document.getElementById(tela).classList.remove("hidden");
}

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

// =====================================
// PROTEÇÃO DE SENHA
// =====================================

// Utiliza PBKDF2 e SHA-256 para gerar um hash.
// A senha original não é armazenada.

function gerarHash(senha, salt) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(senha),
        "PBKDF2",
        false,
        ["deriveBits"]
    ).then(chave => {
        return crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 310000,
                hash: "SHA-256"
            },
            chave,
            256
        );
    }).then(resultado => {
        return Array.from(new Uint8Array(resultado))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    });
}

function gerarSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    return Array.from(salt)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function hexParaBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    return bytes;
}

// =====================================
// CADASTRO DE USUÁRIO
// =====================================

document.getElementById("formCadastro")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    try {
        const nome = document.getElementById("nome")
            .value.trim();

        const email = document.getElementById("emailCadastro")
            .value.trim().toLowerCase();

        const senha = document.getElementById("senhaCadastro")
            .value;

        if (!nome || !email || !senha) {
            mostrarMensagem("Preencha todos os campos!", true);
            return;
        }

        if (senha.length < 8) {
            mostrarMensagem(
                "A senha deve possuir pelo menos 8 caracteres!",
                true
            );
            return;
        }

        const usuarios = obterUsuarios();

        // Verifica se o e-mail já está cadastrado.

        const emailExiste = usuarios.some(
            usuario => usuario.email === email
        );

        if (emailExiste) {
            mostrarMensagem(
                "Este e-mail já está cadastrado!",
                true
            );
            return;
        }

        // Gera salt individual e hash da senha.

        const salt = gerarSalt();
        const hash = await gerarHash(senha, hexParaBytes(salt));

        const novoUsuario = {
            id: crypto.randomUUID(),
            nome: nome,
            email: email,
            salt: salt,
            senhaHash: hash
        };

        usuarios.push(novoUsuario);

        salvarUsuarios(usuarios);

        document.getElementById("formCadastro").reset();

        mostrarTela("login");

        mostrarMensagem(
            "Cadastro realizado com sucesso!"
        );

    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao realizar cadastro.", true);
    }
});

// =====================================
// LOGIN
// =====================================

document.getElementById("formLogin")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    try {
        const email = document.getElementById("emailLogin")
            .value.trim().toLowerCase();

        const senha = document.getElementById("senhaLogin")
            .value;

        const usuarios = obterUsuarios();

        const usuario = usuarios.find(
            usuario => usuario.email === email
        );

        if (!usuario) {
            mostrarMensagem("E-mail ou senha incorretos!", true);
            return;
        }

        const hashDigitado = await gerarHash(
            senha,
            hexParaBytes(usuario.salt)
        );

        if (hashDigitado !== usuario.senhaHash) {
            mostrarMensagem("E-mail ou senha incorretos!", true);
            return;
        }

        // Guarda apenas o identificador do usuário na sessão.

        sessionStorage.setItem(CHAVE_SESSAO, usuario.id);

        document.getElementById("formLogin").reset();

        abrirPainel();

    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao realizar login.", true);
    }
});

// =====================================
// NAVEGAÇÃO ENTRE CADASTRO E LOGIN
// =====================================

document.getElementById("irLogin")
.addEventListener("click", function(event) {
    event.preventDefault();
    mostrarTela("login");
});

document.getElementById("irCadastro")
.addEventListener("click", function(event) {
    event.preventDefault();
    mostrarTela("cadastro");
});

// =====================================
// AUTENTICAÇÃO E PAINEL
// =====================================

function obterUsuarioLogado() {

    const id = sessionStorage.getItem(CHAVE_SESSAO);

    if (!id) {
        return null;
    }

    const usuarios = obterUsuarios();

    return usuarios.find(usuario => usuario.id === id) || null;
}

function abrirPainel() {

    const usuario = obterUsuarioLogado();

    // Bloqueia o painel quando não existe usuário autenticado.

    if (!usuario) {
        sessionStorage.removeItem(CHAVE_SESSAO);
        mostrarTela("login");
        return;
    }

    mostrarTela("painel");

    document.getElementById("nomeUsuario").textContent =
        usuario.nome;

    carregarEquipamentos();
    atualizarChamados();
}

// =====================================
// LISTA DE EQUIPAMENTOS
// =====================================

function carregarEquipamentos() {

    const select = document.getElementById("equipamento");

    select.innerHTML =
        '<option value="">Selecione um equipamento</option>';

    equipamentos.forEach(equipamento => {

        const option = document.createElement("option");

        option.value = equipamento;
        option.textContent = equipamento;

        select.appendChild(option);
    });
}

// =====================================
// ABERTURA DE CHAMADOS
// =====================================

document.getElementById("formChamado")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const usuario = obterUsuarioLogado();

    // Verifica autenticação novamente.

    if (!usuario) {
        sessionStorage.removeItem(CHAVE_SESSAO);
        mostrarTela("login");
        mostrarMensagem("Faça login para continuar!", true);
        return;
    }

    const equipamento = document.getElementById("equipamento")
        .value;

    const descricao = document.getElementById("descricao")
        .value.trim();

    const prioridade = document.getElementById("prioridade")
        .value;

    // Não permite equipamento inexistente.

    if (!equipamentos.includes(equipamento)) {
        mostrarMensagem(
            "Selecione um equipamento válido!",
            true
        );
        return;
    }

    if (!descricao) {
        mostrarMensagem("Informe a descrição do problema!", true);
        return;
    }

    if (!["Baixa", "Média", "Alta"].includes(prioridade)) {
        mostrarMensagem("Selecione uma prioridade válida!", true);
        return;
    }

    const chamados = obterChamados();

    const novoChamado = {

        id: crypto.randomUUID(),

        usuarioId: usuario.id,

        equipamento: equipamento,

        descricao: descricao,

        prioridade: prioridade,

        status: "Aberto",

        data: new Date().toLocaleDateString("pt-BR")
    };

    chamados.push(novoChamado);

    salvarChamados(chamados);

    document.getElementById("formChamado").reset();

    atualizarChamados();

    mostrarMensagem("Chamado aberto com sucesso!");
});

// =====================================
// EXIBIR CHAMADOS
// =====================================

function atualizarChamados() {

    const usuario = obterUsuarioLogado();

    if (!usuario) {
        mostrarTela("login");
        return;
    }

    const chamados = obterChamados();

    // Cada usuário visualiza somente seus chamados.

    const meusChamados = chamados.filter(
        chamado => chamado.usuarioId === usuario.id
    );

    const lista = document.getElementById("listaChamados");

    lista.innerHTML = "";

    meusChamados.forEach(chamado => {

        const linha = document.createElement("tr");

        let classePrioridade = "";

        if (chamado.prioridade === "Alta") {
            classePrioridade = "prioridade-alta";
        } else if (chamado.prioridade === "Média") {
            classePrioridade = "prioridade-media";
        } else {
            classePrioridade = "prioridade-baixa";
        }

        linha.innerHTML = `
            <td>${escaparHTML(chamado.equipamento)}</td>

            <td>${escaparHTML(chamado.descricao)}</td>

            <td class="${classePrioridade}">
                ${escaparHTML(chamado.prioridade)}
            </td>

            <td>
                <span class="status">
                    ${escaparHTML(chamado.status)}
                </span>
            </td>
        `;

        lista.appendChild(linha);
    });

    document.getElementById("totalChamados").textContent =
        meusChamados.length;

    document.getElementById("totalAbertos").textContent =
        meusChamados.filter(
            chamado => chamado.status === "Aberto"
        ).length;
}

// =====================================
// SAIR DO SISTEMA
// =====================================

document.getElementById("btnSair")
.addEventListener("click", function() {

    sessionStorage.removeItem(CHAVE_SESSAO);

    mostrarTela("login");

    mostrarMensagem("Você saiu do sistema!");
});

// =====================================
// INICIALIZAÇÃO
// =====================================

// Ao atualizar a página, verifica se existe
// uma sessão válida antes de mostrar o painel.

window.addEventListener("DOMContentLoaded", function() {

    if (obterUsuarioLogado()) {
        abrirPainel();
    } else {
        mostrarTela("cadastro");
    }

});

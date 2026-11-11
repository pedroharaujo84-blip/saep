CREATE DATABASE saep_simulado;

USE saep_simulado;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE equipamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255)
);

CREATE TABLE chamados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    descricao TEXT NOT NULL,
    prioridade ENUM('Baixa', 'Média', 'Alta') NOT NULL,
    status ENUM('Aberto', 'Em andamento', 'Concluído')
        NOT NULL DEFAULT 'Aberto',
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (equipamento_id)
        REFERENCES equipamentos(id),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
);

INSERT INTO equipamentos (nome, descricao) VALUES
('Computador Dell', 'Computador do laboratório'),
('Impressora HP', 'Impressora da secretaria'),
('Notebook Lenovo', 'Notebook administrativo'),
('Projetor Epson', 'Projetor da sala de aula');

SELECT * FROM equipamentos;

SELECT
    c.id AS numero_chamado,
    c.descricao,
    e.nome AS nome_equipamento
FROM chamados c
INNER JOIN equipamentos e
    ON c.equipamento_id = e.id;

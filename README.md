# Sizing de Aplicações

Aplicação web para criar, editar e visualizar sizings de projetos, permitindo:

* Adicionar tarefas com início e duração (em dias ou horas).
* **Linguagem Intermediária (DSL)**: Defina tarefas usando um editor de código simplificado.
* Visualizar gráfico Gantt simplificado (Chart.js).
* CRUD completo de sizings salvos (LocalStorage).
* Editar/excluir tarefas individuais.
* Redefinir total de dias e redistribuir durações proporcionalmente.
* **Drawer de tarefa** (tecla `N`): formulário lateral animado, com subtarefas, prioridade, "Adicionar e criar outra" e aviso de alterações não salvas. Tudo em horas, com totais e datas calculados automaticamente.
* **Checklist por tarefa**: subtarefas com descrição detalhada, horas e "OK"; mostra horas totais e % concluído.
* Exportar dados em CSV, JSON, PNG e **Excel (.xlsx)** com fórmulas (horas totais e % recalculam ao marcar OK).
* Tema Claro/Escuro.

---

## Estrutura de Arquivos

```
project-root/
├── index.html     # Página principal
├── style.css      # Estilos CSS
├── script.js      # Lógica JavaScript
└── README.md      # Documentação (este arquivo)
```

## Pré-requisitos

* Navegador moderno com suporte a JavaScript.
* Conexão para carregar Chart.js via CDN.

## Instalação e Uso

1. **Clone ou baixe** este repositório.
2. **Abra** o `index.html` em seu navegador.
3. **Interaja**:

   * Preencha **Nome do Sizing** e defina tarefas via formulário.
   * Clique em **Adicionar Tarefa** para inserir na lista.
   * **Editar**: use o botão ✏️ ao lado de cada tarefa para recarregar nos campos e alterar.
   * **Excluir**: use o botão 🗑️ para remover uma tarefa.
   * **Salvar Sizing**: armazena no LocalStorage.
   * **Salvar como...**: copia o sizing atual para um novo nome.
   * **Galeria**: botões representam sizings salvos; clique para carregar.
   * **Novo**: limpa o formulário e tarefas.
   * **Exportar CSV**: gera arquivo `tasks.csv` com nome, início e duração.
   * **Tema**: alterna clara/escura.


## Personalização

* **Cores**: defina no `:root` do `style.css`.
* **Estilos**: ajuste classes `.btn`, `.container`, etc.
* **Persistência**: atualmente usa `localStorage`; possível adaptar para API.



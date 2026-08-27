# Floating Notes — English

## How to open

No installation required. Inside the folder, double-click **`index.html`** — it opens directly in your browser.

> If the page opens without styling or doesn't work, make sure `index.html`, `style.css`, and `script.js` are all in the **same folder**.

---

## What you can do

### Notes
* **+ New Note** — creates a note in the visible area, or **double-click** any empty space on the board
* **Drag** — click and hold the top bar to move a note. With multiple notes selected, dragging one moves all of them
* **Resize** — drag the bottom-right corner of a note
* **Color** — click 🎨 to choose from 6 colors (works with dark mode)
* **Pin** 📌 — locks the note in place so it can't be accidentally moved or deleted

### Multi-selection
* **Shift + drag the background** — draws a selection rectangle and selects all notes inside it
* **Shift + click a note** — adds or removes that note from the current selection
* **Drag** one of the selected notes — moves all selected notes together
* **Delete** or **Backspace** — deletes all selected notes at once (confirmation required)
* Clicking the background without Shift — clears the selection

### Note connections
* **🔗 Connect** (or press **L**) — enters link mode. Click one note, then another to connect them with a line. Click the line to label it
* To remove a connection, enter link mode and click the same two notes again
* **Esc** — cancels link mode

### Links and URLs
* **🔗 Link button** on the note's top bar — opens a field to paste a URL or local path (`file://`)
  * If text is selected in the note, it becomes the link label
  * If no text is selected, the link appears only as a clickable badge
* Links appear as **badges** at the bottom of the note. Each badge has a **×** button to remove the link without deleting the note text
* **Click a badge** — opens the link in the built-in viewer
* **Shift + click a badge** — opens in the browser
* Local paths (e.g. `C:\Users\Desktop\file.pdf`) are shown in a shortened format in the badge

### Files and images
* **Drag a file** onto the board to attach it to a note
* Text files (`.txt`, `.md`, `.csv`, `.json`) appear with their content fully editable inside the note
* Click **👁 View** to open the file in a full editor; edit and click **💾 Save changes to note** to update
* Images (`.jpg`, `.png`, etc.) appear directly inside the note
* Drag a **folder** from Explorer/Finder to create a shortcut that opens that directory

### Calendar 📅
* Click 📅 in the toolbar to open the floating calendar
* Click a day to insert the date into the active note

### Search
* Type in the search box — matching notes are highlighted
* Press **Enter** to jump between results

### Zoom and navigation
* **Mouse scroll** — zoom centered on cursor
* **−** / **+** and **⤾** buttons to control and reset zoom
* **Click + drag the background** — pan the board

### Copy and paste
* **Ctrl+C** — copies the active note (or all selected notes), including color, size, and internal connections
* **Ctrl+V** — pastes with a 24 px offset (paste multiple times to stack)

### Undo / Redo
* **Ctrl+Z** — undo last action
* **Ctrl+Shift+Z** or **Ctrl+Y** — redo

### Boards
* Use the dropdown at the top to have multiple independent boards (e.g. work and personal)
* **+ Board** — create a new board
* **✎** — rename the current board
* **🗑** — delete the entire board (confirmation required)

### Dark mode 🌙
* Toggles between light and dark theme. Preference is saved automatically.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `L` | Toggle connection mode |
| `Delete` / `Backspace` | Delete selected notes |
| `Ctrl+C` | Copy active / selected note(s) |
| `Ctrl+V` | Paste copied note(s) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Esc` | Cancel link mode / close panels |
| `Shift+drag background` | Select multiple notes with a rectangle |
| `Shift+click note` | Add / remove from selection |

---

## Are notes saved?

Yes, automatically — but only **in that browser, on that computer**. In another browser or computer, the app starts empty.

To take your notes with you:

1. Click **⬇ Export** — downloads a single `.json` with **all your boards**, including names, notes, connections, images, and files
2. On the destination, open the app and click **⬆ Import**, select the file — all boards are restored automatically

> The app can also import files exported by older versions (single-board format).

### Clearing everything
The **🗑 Clear** button deletes all notes on the current board (confirmation required).

---

## License

MIT License — see the `LICENSE` file for details.

---

# Notas Flutuantes

## Como abrir

Nenhuma instalação necessária. Dentro da pasta, dê duplo clique em **`index.html`** — ele abre direto no navegador.

> Se a página abrir sem estilo ou sem funcionar, verifique se `index.html`, `style.css` e `script.js` estão todos na **mesma pasta**.

---

## O que dá pra fazer

### Notas
* **+ Nova nota** — cria uma nota na área visível, ou dê **duplo clique** em qualquer espaço vazio do quadro
* **Arrastar** — clique e segure a barra superior da nota para mover. Com várias notas selecionadas, arrastar uma move todas juntas
* **Redimensionar** — arraste o canto inferior direito da nota
* **Cor** — clique no ícone 🎨 para escolher entre 6 cores (funciona com modo escuro)
* **Fixar** 📌 — trava a nota no lugar; ela não pode ser arrastada nem apagada por acidente

### Seleção múltipla
* **Shift + arrastar o fundo** — desenha um retângulo e seleciona todas as notas dentro dele
* **Shift + clique numa nota** — adiciona ou remove a nota da seleção atual
* **Arrastar** uma das notas selecionadas — move todas as notas da seleção juntas
* **Delete** ou **Backspace** — apaga todas as notas selecionadas de uma vez (pede confirmação)
* Clicar no fundo sem Shift — limpa a seleção

### Ligações entre notas
* **🔗 Ligar** (ou tecla **L**) — ativa o modo ligação. Clique numa nota, depois em outra para conectá-las com uma linha. Clique na linha para dar um nome a ela
* Para remover uma ligação, ative o modo Ligar e clique nas mesmas duas notas novamente
* **Esc** — cancela o modo ligação

### Links e URLs
* **Botão 🔗 Link** na barra da nota — abre um campo para colar um endereço (URL ou caminho local como `file://`)
  * Se houver texto selecionado na nota, ele vira o rótulo do link
  * Se não houver texto selecionado, o link aparece somente como um badge clicável
* Os links aparecem como **badges** na parte inferior da nota. Cada badge tem um botão **×** para remover o link sem apagar o texto
* **Clique no badge** — abre o link no visualizador interno
* **Shift + clique no badge** — abre no navegador
* Caminhos locais (ex.: `C:\Usuário\Desktop\Arquivo.pdf`) são formatados de forma abreviada no badge

### Arquivos e imagens
* **Arraste um arquivo** para o quadro para anexá-lo a uma nota
* Arquivos de texto (`.txt`, `.md`, `.csv`, `.json`) aparecem com o conteúdo editável diretamente na nota
* Clique em **👁 Ver** para abrir o arquivo num editor ampliado; edite e clique em **💾 Salvar alterações na nota** para atualizar
* Imagens (`.jpg`, `.png` etc.) aparecem diretamente dentro da nota
* Arraste uma **pasta** do Explorer/Finder para criar um atalho que abre aquele diretório

### Calendário 📅
* Clique em 📅 na barra superior para abrir o calendário flutuante
* Clique em um dia para inserir a data na nota ativa

### Busca
* Digite na caixa de busca — as notas que correspondem ficam destacadas
* Pressione **Enter** para pular entre os resultados

### Zoom e navegação
* **Scroll do mouse** — zoom centrado no cursor
* Botões **−** / **+** e **⤾** para controlar e redefinir o zoom
* **Clique + arrastar o fundo** — navega pelo quadro (pan)

### Copiar e colar
* **Ctrl+C** — copia a nota ativa (ou todas as notas selecionadas), incluindo cor, tamanho e ligações internas ao grupo
* **Ctrl+V** — cola as notas com um deslocamento de 24 px (colar várias vezes empilha)

### Desfazer / Refazer
* **Ctrl+Z** — desfaz a última ação
* **Ctrl+Shift+Z** ou **Ctrl+Y** — refaz

### Quadros
* Use o menu suspenso no topo para ter vários quadros independentes (ex.: trabalho e pessoal)
* **+ Quadro** — cria um novo
* **✎** — renomeia o quadro atual
* **🗑** — apaga o quadro inteiro (pede confirmação)

### Modo escuro 🌙
* Alterna entre tema claro e escuro. A preferência é salva automaticamente.

---

## Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `L` | Ativar / desativar modo Ligação |
| `Delete` / `Backspace` | Apagar notas selecionadas |
| `Ctrl+C` | Copiar nota(s) ativa(s) / selecionadas |
| `Ctrl+V` | Colar nota(s) copiadas |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Refazer |
| `Esc` | Cancelar modo ligação / fechar painéis |
| `Shift+arrastar fundo` | Selecionar múltiplas notas por retângulo |
| `Shift+clique na nota` | Adicionar / remover da seleção |

---

## As notas ficam salvas?

Sim, automaticamente — mas apenas **nesse navegador, nesse computador**. Em outro navegador ou computador, o app começa vazio.

Para levar suas notas:

1. Clique em **⬇ Exportar** — baixa um único `.json` com **todos os seus quadros**, incluindo nomes, notas, ligações, imagens e arquivos
2. No destino, abra o app e clique em **⬆ Importar**, selecione o arquivo — todos os quadros serão restaurados automaticamente

> O app também consegue importar arquivos exportados por versões antigas (de um único quadro).

### Apagando tudo
O botão **🗑 Limpar** apaga todas as notas do quadro atual (pede confirmação).

---

## Licença

MIT License — consulte o arquivo `LICENSE` para detalhes.


# Adega & Receitas

App pessoal para **registrar e avaliar bebidas** (vinho, cerveja, destilados, coquetéis, saquê, café, chá e outras) e manter um **livro de receitas** com histórico de preparos.

- Funciona **offline** e guarda tudo **no próprio aparelho** (IndexedDB).
- Roda em **PC, Android e iOS** como app instalado (PWA), a partir de um único código.
- **Backup em arquivo `.json`** (com fotos) para passar os dados de um aparelho para outro.

## Funcionalidades

**Início**
- Mostra a última bebida cadastrada, a última receita cadastrada (e a última feita) e o último restaurante visitado.
- Tem atalhos para criar registros e um resumo com totais.

**Bebidas**
- Campos comuns: nome, produtor, país, região, teor alcoólico, volume, preço, data, local, ocasião e fotos.
- Campos específicos por tipo. Por exemplo: uvas, safra e barrica no vinho; estilo, IBU e espuma na cerveja; idade, madeira e cask strength nos destilados; processo, torra e método no café.
- Perfil sensorial com eixos próprios de cada tipo, roda de aromas, nota de 0,5 a 5 estrelas, "compraria de novo", harmonização e favoritos.
- "Provar de novo": duplica a ficha para registrar uma nova degustação.

**Receitas**
- Fotos, categoria, porções, tempos, dificuldade, ingredientes com seções, modo de preparo e utensílios recomendados.
- Escala automática de porções (entende `1/2`, `½`, `1 1/2` e `2-3`).
- Modo cozinha: letras maiores e tela acesa. Dá para marcar ingredientes e passos já feitos.
- **Registro de preparos**: data, nota, porções, fotos, ajustes realizados, acompanhamentos e **bebidas que acompanharam**, sejam elas já cadastradas ou criadas na hora.
- **Importar do Instagram / texto**: cole a legenda e o app separa título, ingredientes, preparo, dicas, porções, tempo e hashtags para você revisar. No Android, o app instalado também aparece em *Compartilhar*.

**Restaurantes**
- Cadastro com fotos, tipo de cozinha, faixa de preço, cidade, bairro, endereço (com link para o mapa), telefone, site ou Instagram e características.
- Lista "📌 Quero conhecer" para lugares que você ainda não visitou.
- **Histórico de visitas**: data, refeição, companhia, nota geral e notas por critério (comida, bebidas, atendimento, ambiente, custo-benefício). Também registra fotos, pratos pedidos, o destaque da visita, conta e número de pessoas, "voltaria?" e as **bebidas consumidas**, que ficam ligadas à aba Bebidas.

**Estatísticas**
- Visão geral: total por tipo, ranking, atividade mensal e gastos.
- Por tipo: nota média, % que compraria de novo, preço e teor médios, e um radar sensorial médio comparado ao das suas favoritas. Também mostra distribuição por estilo, uva, país, região e outros, além dos aromas mais frequentes.
- Receitas: mais feitas, melhor avaliadas, bebidas mais usadas nas harmonizações e utensílios.
- Restaurantes: mais visitados, melhor avaliados, gasto médio por visita e por pessoa, média por critério, visitas por cozinha e por bairro, e pratos mais pedidos.

## Como publicar (uma vez) e instalar

O app precisa ser aberto **uma vez** a partir de um endereço HTTPS para poder ser instalado. Depois disso funciona sem internet. A opção gratuita mais simples é o **GitHub Pages**:

1. Crie um repositório no GitHub (pode ser privado só se o seu plano permitir Pages privado; senão, público. Os **dados não vão para o repositório**, só o código).
2. Envie esta pasta:
   ```bash
   git init
   git add .
   git commit -m "Adega & Receitas"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/adega-receitas.git
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
4. Abra `https://SEU_USUARIO.github.io/adega-receitas/` em cada aparelho e instale:
   - **iPhone/iPad (Safari):** Compartilhar → *Adicionar à Tela de Início*
   - **Android (Chrome):** menu ⋮ → *Instalar app*
   - **PC (Chrome/Edge):** ícone de instalar na barra de endereço

> Alternativas igualmente gratuitas: Netlify ou Cloudflare Pages (é só arrastar a pasta).

### Atualizar o app
Depois de alterar o código, aumente a versão em `sw.js` (`adega-receitas-v1` → `v2`) e publique de novo. Os aparelhos baixam a nova versão quando abrirem o app com internet. Os dados não são afetados.

## Rodar no PC sem publicar

Dê dois cliques em `iniciar-local.bat` (precisa de Python) e acesse `http://localhost:8765`.

## Passar dados entre aparelhos

Na aba **Backup**: *Exportar backup* gera um `.json`. No celular, abre a tela de compartilhar para salvar no Drive/Arquivos ou enviar por WhatsApp/e-mail. No outro aparelho, use *Importar*:
- **Mesclar**: junta os dados e mantém a versão mais recente de cada registro.
- **Substituir tudo**: apaga os dados do aparelho e usa só os do arquivo.

⚠️ Como os dados ficam só no aparelho, **faça backups periódicos**. O app avisa quando o último tem mais de 30 dias. No iPhone, use sempre o app **instalado na Tela de Início**: no Safari comum, o iOS pode apagar dados de sites pouco usados.

## Estrutura

```
index.html              página única
css/style.css           visual (tema claro/escuro automático)
js/app.js               telas, rotas, formulários, estatísticas
js/schemas.js           tipos de bebida e seus campos ← edite aqui para adicionar campos/tipos
js/db.js                armazenamento local (IndexedDB)
js/photos.js            compressão de fotos
js/backup.js            exportar/importar
js/recipe-text.js       leitura de legendas e escala de ingredientes
sw.js                   cache offline
manifest.webmanifest    instalação como app
```

Para criar um novo tipo de bebida ou novos campos, basta editar `js/schemas.js`. Formulário, ficha e estatísticas se adaptam sozinhos.

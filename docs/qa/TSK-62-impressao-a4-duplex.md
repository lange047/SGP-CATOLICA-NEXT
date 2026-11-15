# TSK-62 — Roteiro de validação de impressão A4 duplex

## Escopo
RF09 (verso em branco do gabarito) e RNF05 (fidelidade de impressão A4).
Dependências: TSK-52 (lote) e TSK-54 (quebras de questões).

## Correção
- O verso da folha de respostas não contém mais texto, borda ou ícones impressos.
- A folha de verso usa altura de 260 mm, respeitando a área útil A4 com margens de 10 mm.
- Regras de impressão ocultam controles e evitam fragmentação de imagens, listas e tabelas.

## Checklist manual (não executado automaticamente)
| Caso | Chrome | Edge | Impressora física |
| --- | --- | --- | --- |
| A4 retrato, escala 100%, margens e cabeçalhos/rodapés desativados | Pendente | Pendente | Pendente |
| Frente: gabarito legível e sem botões da interface | Pendente | Pendente | Pendente |
| Verso: página 2 totalmente em branco | Pendente | Pendente | Pendente |
| Caderno inicia na página 3 em duplex | Pendente | Pendente | Pendente |
| Prova com questões longas, alternativas e imagens sem cortes | Pendente | Pendente | Pendente |
| Modo apenas frente não insere verso | Pendente | Pendente | Pendente |
| Lote de alunos mantém sequência correta | Pendente | Pendente | Pendente |

### Procedimento
1. Abrir uma prova de teste e ativar **Imprimir Frente e Verso**.
2. Em Chrome e Edge, abrir a prévia de impressão e conferir páginas 1, 2 e 3.
3. Imprimir fisicamente em A4 duplex, virada na borda longa.
4. Repetir com modo apenas frente, prova longa, imagens e lote.
5. Anexar capturas das prévias e fotos da impressão ao PR antes do merge.

**Limitação:** estas verificações não foram realizadas neste ambiente; não marcar a TSK-62 como validada até reunir evidências.

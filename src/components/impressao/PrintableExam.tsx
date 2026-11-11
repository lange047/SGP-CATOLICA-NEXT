'use client';
import React from 'react';
import { AlunoModel } from '@/models/AlunoModel';
import { TurmaModel } from '@/models/TurmaModel';
import { Question, CardPayload, EvaluationStage } from '@/types';
import { QRCodeWrapper } from '@/components/common/QRCodeWrapper';
import { codificarGabaritoQr, sementeGabarito } from '@/lib/answerKey';
import { printedAlternatives } from '@/lib/printVersions';
import { PrintableQuestion } from './PrintableQuestion';
export interface PrintSettings {
  instituicao: string;
  subinstituicao: string;
  escolaCurso: string;
  disciplina: string;
  subtitulo: string;
  dataProva: string;
  duracaoProva: string;
  tituloOrientacoes: string;
  orientacoesProva: string[];
  textoBoaProva: string;
  tituloGabarito: string;
  orientacoesGabarito: string[];
  tituloAcesso: string;
  textoAcessoGabarito: string;
  modoFrenteVerso: boolean;
}

interface Props {
  alunoAtual: AlunoModel;
  selectedVersionIdx: number;
  questoesEmbaralhadas: Question[];
  turmaSelecionadaId: string;
  turmaAtual?: TurmaModel;
  withId: boolean;
  teacherId?: string;
  resolvedStage: EvaluationStage;
  settings: PrintSettings;
  abrirPainel?: (aba: 'cabecalho' | 'orientacoes' | 'gabarito') => void;
}
function renderTextoComVariaveis(texto: string, pontos: string, duracao: string) {
  return texto.split(/(\{pontos\}|\{duracao\})/).map((part, i) => part === '{pontos}' || part === '{duracao}' ? <strong key={i}>{part === '{pontos}' ? pontos : duracao}</strong> : <React.Fragment key={i}>{part}</React.Fragment>);
}
export function PrintableExam({ alunoAtual, selectedVersionIdx, questoesEmbaralhadas, turmaSelecionadaId, turmaAtual, withId, teacherId, resolvedStage, settings, abrirPainel = () => {} }: Props) {
  const { instituicao, subinstituicao, escolaCurso, disciplina, subtitulo, dataProva, duracaoProva, tituloOrientacoes, orientacoesProva, textoBoaProva, tituloGabarito, orientacoesGabarito, tituloAcesso, textoAcessoGabarito, modoFrenteVerso } = settings;
  const nomeTurma = turmaAtual?.nome || 'Turma';
  const versaoLetra = String.fromCharCode(65 + (selectedVersionIdx % 4));
  const examId = `EXAM-${turmaSelecionadaId}-${resolvedStage}`;
  const codigoProvaFormatado = `${alunoAtual?.ra ? alunoAtual.ra.padStart(7, '0') : '2839932'}.${selectedVersionIdx % 4}`;

  const questoesObjetivas = questoesEmbaralhadas.filter(
    q => q.tipo === 'objetiva' || q.type === 'OBJECTIVE'
  ).slice(0, 30);
  const totalQuestoesObjetivas = Math.max(1, questoesObjetivas.length);
  const pontosPorQuestao = (10 / totalQuestoesObjetivas).toFixed(1);

  // Gabarito da folha exatamente como impressa (ordem + embaralhamento desta versão)
  const LETRAS_GAB = ['A', 'B', 'C', 'D', 'E'];
  const alternativasImpressas = questoesObjetivas.map(printedAlternatives);
  const opcoesImpressas = alternativasImpressas.map(alternativas => Math.min(5, alternativas.length || 5));
  const respostasImpressas = alternativasImpressas.map(alternativas => LETRAS_GAB[Math.max(0, Math.min(4, alternativas.findIndex(alt => alt.correct)))]);
  const pontosImpressos = questoesObjetivas.map(q =>
    Number(q.pontuacao ?? q.points ?? 10 / totalQuestoesObjetivas)
  );
  const raQr = withId ? (alunoAtual?.ra || '1328834') : 'ANONIMO';
  const maxOpcoesCol1 = Math.max(4, ...opcoesImpressas.slice(0, 15));
  const letrasCol1 = ['a', 'b', 'c', 'd', 'e'].slice(0, maxOpcoesCol1);
  const maxOpcoesCol2 = Math.max(4, ...opcoesImpressas.slice(15, 30));
  const letrasCol2 = ['a', 'b', 'c', 'd', 'e'].slice(0, maxOpcoesCol2);
  const layoutGabarito = codificarGabaritoQr(
    respostasImpressas,
    opcoesImpressas,
    pontosImpressos,
    sementeGabarito(examId, raQr, versaoLetra)
  );

  const qrPayload: CardPayload = {
    examId,
    classId: turmaSelecionadaId || 't1',
    className: nomeTurma,
    teacherId: teacherId || turmaAtual?.professorId || 'prof-01',
    studentId: alunoAtual?.id || 'alu-01',
    studentName: withId ? (alunoAtual?.nome || 'AGENOR ALVISE') : 'ANONIMO',
    studentRa: raQr,
    stage: resolvedStage,
    system: 'SGP-CATOLICA',
    turmaId: turmaSelecionadaId || 't1',
    name: withId ? (alunoAtual?.nome || 'AGENOR ALVISE') : 'ANONIMO',
    ra: raQr,
    examVersion: versaoLetra,
    ...layoutGabarito
  };

  return (
      <div className="sgp-student-packet space-y-8 print:space-y-0" data-student-id={alunoAtual.id} data-version-index={selectedVersionIdx}>

        {/* ========================================================================= */}
        {/* PÁGINA 1: FOLHA DE RESPOSTAS E GABARITO (IDÊNTICO AO MODELO CATÓLICA SC) */}
        {/* ========================================================================= */}
        <div className="sgp-answer-sheet rounded-xl border-2 border-slate-300 bg-white p-4 shadow-lg print:border-none print:p-0 print:m-0 print:shadow-none sm:p-8 print:break-after-page">
          <div className="mb-4 flex flex-col gap-1 border-b-2 border-dashed border-slate-300 pb-2 text-xs font-bold uppercase text-slate-500 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <span>✂️ Destaque aqui — Entregar somente este gabarito ao professor</span>
            <span className="flex items-center gap-1 text-catolica-primary">
              Clique em &quot;Personalizar Prova & Instruções&quot; acima para alterar textos e orientações
            </span>
          </div>

          <div className="space-y-3 font-sans text-slate-900 print:text-black">

            {/* CABEÇALHO INSTITUCIONAL PERSONALIZÁVEL */}
            <div
              onClick={() => abrirPainel('cabecalho')}
              className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3 print:border-black cursor-pointer group"
              title="Clique para editar o cabeçalho institucional"
            >
              {/* Lado Esquerdo: Logo Católica SC + Escola / Curso */}
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10 text-slate-900 print:text-black shrink-0" viewBox="0 0 48 48" fill="currentColor">
                  <path d="M6 14 L22 6 L22 34 L6 42 Z" opacity="0.95" />
                  <path d="M26 6 L42 14 L42 42 L26 34 Z" opacity="0.8" />
                  <path d="M22 6 L24 4 L26 6 L26 34 L22 34 Z" opacity="0.6" />
                </svg>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-base font-black tracking-tight text-slate-900 print:text-black leading-tight group-hover:text-catolica-primary transition">
                      {instituicao}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider uppercase text-slate-600 print:text-black">
                      {subinstituicao}
                    </span>
                  </div>
                  <div className="h-8 w-[1.5px] bg-slate-400 print:bg-black mx-1" />
                  <div className="text-sm font-black text-slate-900 print:text-black leading-tight">
                    {escolaCurso}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Nome da Disciplina e Avaliação Escrita */}
              <div className="text-right">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 print:text-black tracking-wide group-hover:text-catolica-primary transition">
                  {disciplina.toUpperCase()}
                </h2>
                <p className="text-[11px] font-bold uppercase text-slate-700 print:text-black mt-0.5">
                  {subtitulo.toUpperCase()}
                </p>
              </div>
            </div>

            {/* SEÇÃO DE IDENTIFICAÇÃO DO ESTUDANTE + CAIXA DE NOTA */}
            <div className="flex items-end justify-between gap-4 border-b border-slate-900 pb-2 print:border-black text-xs font-bold text-slate-900 print:text-black">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-6 text-[11px]">
                  <span>DATA: <strong>{dataProva}</strong></span>
                  <span>VERSÃO: <strong>{versaoLetra}</strong></span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 uppercase text-xs">ESTUDANTE:</span>
                  <span className="flex-1 border-b border-slate-900 print:border-black font-semibold text-slate-800 print:text-black pb-0.5 uppercase tracking-wide">
                    {withId && alunoAtual?.nome ? alunoAtual.nome : '____________________________________________________________________'}
                  </span>
                </div>
              </div>

              {/* Caixa de NOTA */}
              <div className="border-2 border-slate-900 print:border-black w-24 h-16 flex flex-col shrink-0 text-center bg-white">
                <div className="bg-slate-100 print:bg-slate-200 border-b border-slate-900 print:border-black text-[10px] font-black uppercase py-0.5">
                  NOTA
                </div>
                <div className="flex-1 flex items-center justify-center font-mono text-xl font-bold text-slate-300 print:text-transparent">
                  {/* Espaço em branco para o professor preencher */}
                </div>
              </div>
            </div>

            {/* CORPO EM DUAS COLUNAS: ORIENTAÇÕES À ESQUERDA | GABARITO & OMR À DIREITA */}
            <div data-two-columns={questoesObjetivas.length > 15} className="sgp-answer-columns grid grid-cols-1 md:grid-cols-12 gap-5 pt-1.5">

              {/* COLUNA ESQUERDA: ORIENTAÇÕES PARA REALIZAÇÃO DA PROVA (5 de 12 colunas) */}
              <div
                onClick={() => abrirPainel('orientacoes')}
                className="md:col-span-5 space-y-2 text-[10px] leading-tight text-slate-800 print:text-black text-justify font-sans cursor-pointer group"
                title="Clique para editar as orientações da prova"
              >
                <p className="font-black uppercase tracking-wide text-slate-900 print:text-black text-[11px] group-hover:text-catolica-primary transition">
                  {tituloOrientacoes}
                </p>
                <ol className="list-decimal pl-3.5 space-y-1.5 marker:font-bold">
                  {orientacoesProva.map((texto, idx) => (
                    <li key={idx}>
                      {renderTextoComVariaveis(texto, `${pontosPorQuestao} ponto(s)`, duracaoProva)}
                    </li>
                  ))}
                </ol>
                {textoBoaProva && (
                  <p className="font-black text-center pt-2 tracking-widest text-slate-900 print:text-black text-xs group-hover:text-catolica-primary transition">
                    {textoBoaProva}
                  </p>
                )}
              </div>

              {/* COLUNA DIREITA: ORIENTAÇÕES GABARITO + QUADRO ÓPTICO (7 de 12 colunas) */}
              <div className="md:col-span-7 space-y-2">

                {/* Box 1: Orientações sobre o preenchimento do gabarito */}
                <div
                  onClick={() => abrirPainel('gabarito')}
                  className="border border-slate-900 print:border-black p-2.5 rounded text-[9.5px] leading-tight text-slate-900 print:text-black space-y-1 cursor-pointer group"
                  title="Clique para editar as instruções do preenchimento"
                >
                  <p className="font-black text-center uppercase tracking-wider text-[10px] pb-1 border-b border-slate-300 print:border-black group-hover:text-catolica-primary transition">
                    {tituloGabarito}
                  </p>
                  <div className="space-y-1 pt-0.5">
                    {orientacoesGabarito.map((regra, idx) => (
                      <p key={idx} className="flex items-start gap-1">
                        <span>✓</span> <span>{regra}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Box 2: Acesse seu gabarito em */}
                <div
                  onClick={() => abrirPainel('gabarito')}
                  className="border border-slate-900 print:border-black p-1.5 rounded text-[8.5px] text-slate-800 print:text-black cursor-pointer group"
                  title="Clique para editar o link do portal"
                >
                  <span className="font-bold uppercase group-hover:text-catolica-primary transition">
                    {tituloAcesso}
                  </span>
                  <p className="font-mono text-[8px] text-slate-600 print:text-black mt-0.5">
                    {textoAcessoGabarito}
                  </p>
                </div>

                {/* QUADRO DE RESPOSTAS ÓPTICO COM 4 MARCADORES DE CANTO */}
                <div className="relative border-2 border-slate-900 print:border-black p-3 pt-3.5 pb-2 bg-white rounded">
                  {/* 4 Marcadores de Calibração */}
                  <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 bg-black print:bg-black" />
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-black print:bg-black" />
                  <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 bg-black print:bg-black" />
                  <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 bg-black print:bg-black" />

                  {/* Miolo: QR Code à esquerda e Grade de Respostas à direita */}
                  <div className="flex items-start justify-between gap-3 px-3">

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center pt-2">
                      <div className="p-1 bg-white border border-slate-200 print:border-none rounded">
                        <QRCodeWrapper
                          value={JSON.stringify(qrPayload)}
                          size={115}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-900 print:text-black mt-1">
                        {withId ? `RA: ${alunoAtual?.ra}` : 'PROVA ANÔNIMA'}
                      </span>
                      <span className="text-[8px] font-mono text-slate-600 print:text-black">
                        Versão {versaoLetra} • {resolvedStage}
                      </span>
                    </div>

                    {/* Grade de Respostas: 1 ou 2 subcolunas para até 30 questões com Marcadores Fiduciais Dedicados */}
                    <div className="relative border border-slate-300 print:border-black p-3 pt-3.5 pb-3 pr-4 bg-white rounded-sm font-mono">
                      {/* 4 Marcadores Fiduciais de Alta Precisão nos cantos da Grade */}
                      <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black print:bg-black" />
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-black print:bg-black" />
                      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 bg-black print:bg-black" />
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-black print:bg-black" />

                      <div className="flex items-start gap-6 px-1">
                        {/* Sub-coluna 1: Questões 1 até 15 (ou todas se <= 15) */}
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-800 print:text-black pb-1">
                            <span className="w-9 inline-block text-right pr-2">Q:</span>
                            {letrasCol1.map(l => (
                              <span key={l} className="w-5 text-center">{l}</span>
                            ))}
                          </div>

                          <div className="space-y-2">
                            {questoesObjetivas.slice(0, questoesObjetivas.length > 15 ? 15 : questoesObjetivas.length).map((q, idx) => {
                              const totalOpcoes = opcoesImpressas[idx];
                              const letras = ['a', 'b', 'c', 'd', 'e'];

                              return (
                                <div key={q.id || idx} className="flex items-center gap-2 text-[9px]">
                                  <span className="w-9 text-right font-black text-slate-900 print:text-black pr-2 select-none shrink-0">
                                    Q.{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}:
                                  </span>
                                  <div className="flex items-center gap-2.5">
                                    {letras.slice(0, totalOpcoes).map(l => (
                                      <div
                                        key={l}
                                        className="w-5 h-4.5 border-[1px] border-slate-700 print:border-black rounded-xs flex items-center justify-center text-[7.5px] font-normal text-slate-400 print:text-slate-500 bg-white"
                                      >
                                        {l}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-800 print:text-black pt-1.5">
                            <span className="w-9 inline-block text-right pr-2">Q:</span>
                            {letrasCol1.map(l => (
                              <span key={l} className="w-5 text-center">{l}</span>
                            ))}
                          </div>
                        </div>

                        {/* Sub-coluna 2: Questões 16 até 30 (renderizada quando há mais de 15 questões) */}
                        {questoesObjetivas.length > 15 && (
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-800 print:text-black pb-1">
                              <span className="w-9 inline-block text-right pr-2">Q:</span>
                              {letrasCol2.map(l => (
                                <span key={l} className="w-5 text-center">{l}</span>
                              ))}
                            </div>

                            <div className="space-y-2">
                              {questoesObjetivas.slice(15, 30).map((q, idxRel) => {
                                const qNum = 16 + idxRel;
                                const totalOpcoes = (q.options && q.options.length > 0)
                                  ? q.options.length
                                  : (q.alternativas && q.alternativas.length > 0)
                                  ? q.alternativas.length
                                  : 5;
                                const letras = ['a', 'b', 'c', 'd', 'e'];

                                return (
                                  <div key={q.id || qNum} className="flex items-center gap-2 text-[9px]">
                                    <span className="w-9 text-right font-black text-slate-900 print:text-black pr-2 select-none shrink-0">
                                      Q.{qNum}:
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                      {letras.slice(0, totalOpcoes).map(l => (
                                        <div
                                          key={l}
                                          className="w-5 h-4.5 border-[1px] border-slate-700 print:border-black rounded-xs flex items-center justify-center text-[7.5px] font-normal text-slate-400 print:text-slate-500 bg-white"
                                        >
                                          {l}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-800 print:text-black pt-1.5">
                              <span className="w-9 inline-block text-right pr-2">Q:</span>
                              {letrasCol2.map(l => (
                                <span key={l} className="w-5 text-center">{l}</span>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Rodapé da prova abaixo da grade */}
                  <div className="text-center pt-1.5 text-[9px] font-mono text-slate-700 print:text-black border-t border-slate-200 mt-1">
                    Prova: {codigoProvaFormatado}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PÁGINA 2: VERSO DO CARTÃO GABARITO (PÁGINA EM BRANCO INTENCIONAL DUPLEX) */}
        {/* ========================================================================= */}
        {modoFrenteVerso && (
          <div className="sgp-answer-sheet-back hidden print:flex print:flex-col print:justify-center print:items-center print:h-[240mm] print:break-after-page">
            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 text-xs uppercase p-8 text-center space-y-3 rounded-2xl">
              <div className="w-12 h-12 rounded-full border-2 border-slate-300 flex items-center justify-center font-bold text-lg">✂️</div>
              <p className="font-bold text-sm tracking-wide text-slate-600">PÁGINA EM BRANCO INTENCIONAL</p>
              <p className="text-[11px] font-bold text-slate-400">VERSO DA FOLHA DE RESPOSTAS</p>
              <p className="text-[10px] text-slate-400 max-w-sm normal-case leading-relaxed">
                Esta página é mantida em branco para que o estudante possa destacar a folha de respostas e entregá-la ao professor sem rasgar o caderno de questões no verso.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PÁGINA 3 EM DIANTE: CADERNO DE QUESTÕES (IDÊNTICO AO MODELO DA IMAGEM 1)   */}
        {/* ========================================================================= */}
        <div className="sgp-question-booklet rounded-xl border border-slate-200 bg-white p-4 shadow-lg print:border-none print:shadow-none print:p-0 sm:p-8">

          {/* Cabeçalho do Caderno de Questões */}
          <div
            onClick={() => abrirPainel('cabecalho')}
            className="mb-6 flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3 print:border-black cursor-pointer group"
            title="Clique para editar o cabeçalho"
          >
            <div className="flex items-center gap-3">
              <svg className="w-9 h-9 text-slate-900 print:text-black shrink-0" viewBox="0 0 48 48" fill="currentColor">
                <path d="M6 14 L22 6 L22 34 L6 42 Z" opacity="0.95" />
                <path d="M26 6 L42 14 L42 42 L26 34 Z" opacity="0.8" />
                <path d="M22 6 L24 4 L26 6 L26 34 L22 34 Z" opacity="0.6" />
              </svg>
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight text-slate-900 print:text-black leading-tight">
                    {instituicao}
                  </span>
                  <span className="text-[9px] font-bold tracking-wider uppercase text-slate-600 print:text-black">
                    {subinstituicao}
                  </span>
                </div>
                <div className="h-7 w-[1.5px] bg-slate-400 print:bg-black mx-1" />
                <div className="text-sm font-black text-slate-900 print:text-black leading-tight">
                  {escolaCurso}
                </div>
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 print:text-black uppercase group-hover:text-catolica-primary transition">
                {disciplina.toUpperCase()}
              </h3>
              <p className="text-[11px] font-bold text-slate-700 print:text-black">
                {subtitulo.toUpperCase()} • Versão {versaoLetra}
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs font-semibold">Estudante: {withId ? alunoAtual.nome : '________________________________'} · RA: {withId ? alunoAtual.ra : '____________'}</p>
          {/* Lista de Questões Formatada (1), 2), 3) com alternativas a), b), c), d), e)) */}
          <div className="space-y-6">
            {questoesEmbaralhadas.map((q, idx) => (
              <PrintableQuestion key={q.id || idx} question={q} number={idx + 1} defaultPoints={pontosPorQuestao} answerNumber={questoesObjetivas.includes(q) ? questoesObjetivas.indexOf(q) + 1 : undefined} />
            ))}
          </div>

        </div>

      </div>
  );
}

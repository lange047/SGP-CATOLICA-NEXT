'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { PrintableExam, PrintSettings } from './PrintableExam';
import { buildClassPrintPackets, preparePrintQuestions, waitForPrintResources, StudentPrintPacket } from '@/lib/printVersions';
import { 
  Printer, 
  CheckSquare, 
  Sliders, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Plus, 
  Trash2, 
  FileText, 
  Layers 
} from 'lucide-react';
import { AlunoModel } from '@/models/AlunoModel';
import { TurmaModel } from '@/models/TurmaModel';
import { Question, EvaluationStage, AvaliacaoCiclo } from '@/types';

// Textos e Orientações Padrão (Modelo Oficial Católica SC)
const DEFAULT_ORIENTACOES_PROVA = [
  'Sobre a mesa, o estudante deverá manter somente o material necessário para a realização da prova, sendo estes caneta, lápis, borracha, corretivo e material admitido para consulta. Todo o restante de material e objetos pessoais deverão ser apostos sob as carteiras. Os celulares deverão ser mantidos desligados e sobre a mesa, com a tela virada para baixo.',
  'Cada questão tem a pontuação de {pontos}.',
  'As questões objetivas deverão ser respondidas no gabarito aposto ao lado, sob pena de serem desconsideradas.',
  'As provas deverão ser respondidas à caneta, preta ou azul, sob pena de serem desconsideradas as respostas, total ou parcialmente, à lápis.',
  'Será admitida a consulta à legislação seca, que não seja anotada e nem comentada.',
  'Não é permitida qualquer consulta a equipamentos eletrônicos para a realização da prova, nem a comunicação entre os estudantes durante a realização da prova. O estudante que for flagrado terá a prova recolhida e será atribuída nota 0 (zero), independentemente das questões já respondidas.',
  'A prova tem prazo de duração de {duracao}.',
  'Os três últimos estudantes deverão permanecer na sala de aula até que o último termine a prova.',
  'Após o início da prova, somente será admitida a entrada de estudantes enquanto ninguém tiver saído.',
  'A interpretação das questões faz parte da prova e da avaliação.'
];

const DEFAULT_ORIENTACOES_GABARITO = [
  'AS RESPOSTAS DEVERÃO SER ASSINALADAS EM CANETA AZUL OU PRETA;',
  'A ÁREA DE RESPOSTA DEVERÁ SER TOTALMENTE PREENCHIDA, SOB PENA DE SER DESCONSIDERADA A RESPOSTA;',
  'ASSINALAR MAIS DO QUE 1 RESPOSTA POR QUESTÃO RESULTARÁ NA ANULAÇÃO DA QUESTÃO.'
];

const DEFAULT_TITULO_ORIENTACOES = '- Orientações para a realização da prova:';
const DEFAULT_FECHAMENTO_ORIENTACOES = 'BOA PROVA!';
const DEFAULT_TITULO_GABARITO = 'ORIENTAÇÕES SOBRE O PREENCHIMENTO DO GABARITO';
const DEFAULT_TITULO_ACESSO = 'ACESSE SEU GABARITO EM:';
const DEFAULT_TEXTO_ACESSO = 'sgp.catolicasc.org.br — Gabaritos — Inserir o número da prova no espaço destinado.';

interface ImpressaoTabProps {
  alunosDaTurmaSelecionada: AlunoModel[];
  selectedVersionIdx: number;
  setSelectedVersionIdx: (idx: number) => void;
  alunoAtual: AlunoModel;
  tituloProva: string;
  turmaSelecionadaId: string;
  withId: boolean;
  questoesSelecionadas: Question[];
  shuffleQ: boolean;
  shuffleAlt: boolean;
  turmas?: TurmaModel[];
  teacherId?: string;
  stage?: EvaluationStage | AvaliacaoCiclo;
}

export function ImpressaoTab({
  alunosDaTurmaSelecionada,
  selectedVersionIdx,
  setSelectedVersionIdx,
  alunoAtual,
  tituloProva,
  turmaSelecionadaId,
  withId,
  questoesSelecionadas,
  shuffleQ,
  shuffleAlt,
  turmas,
  teacherId,
  stage
}: ImpressaoTabProps) {
  // Controle de Frente e Verso (Gera página de verso em branco para destacar o gabarito sem perder questões)
  const [modoFrenteVerso, setModoFrenteVerso] = useState(true);

  // Painel de Personalização e Sub-abas
  const [painelCabecalhoAberto, setPainelCabecalhoAberto] = useState(false);
  const [subAbaEdicao, setSubAbaEdicao] = useState<'cabecalho' | 'orientacoes' | 'gabarito'>('cabecalho');

  const turmaAtual = turmas?.find(t => t.id === turmaSelecionadaId);
  const defaultEscola = turmaAtual?.curso 
    ? (turmaAtual.curso.toLowerCase().includes('direito') ? 'Escola de Direito' : turmaAtual.curso) 
    : 'Escola de Direito';

  const resolvedStage: EvaluationStage = (stage === 'N1' || stage === 'N2' || stage === 'N3' || stage === 'N-1') ? stage : 'N1';

  const defaultSubtitulo = resolvedStage === 'N-1' 
    ? 'AVALIAÇÃO ESCRITA (EXAME / N-1)' 
    : `AVALIAÇÃO ESCRITA ${resolvedStage === 'N1' ? '01' : resolvedStage === 'N2' ? '02' : '03'}`;

  // Estados Editáveis do Cabeçalho
  const [instituicao, setInstituicao] = useState('Católica SC');
  const [subinstituicao, setSubinstituicao] = useState('Centro Universitário');
  const [escolaCurso, setEscolaCurso] = useState(defaultEscola);
  const [disciplina, setDisciplina] = useState(tituloProva || 'DIREITO DE PROPRIEDADE E RESPONSABILIDADE CIVIL');
  const [subtitulo, setSubtitulo] = useState(defaultSubtitulo);
  const [dataProva, setDataProva] = useState(new Date().toLocaleDateString('pt-BR'));
  const [duracaoProva, setDuracaoProva] = useState('3 (três) horas');

  // Estados Editáveis das Orientações da Prova
  const [tituloOrientacoes, setTituloOrientacoes] = useState(DEFAULT_TITULO_ORIENTACOES);
  const [orientacoesProva, setOrientacoesProva] = useState<string[]>([...DEFAULT_ORIENTACOES_PROVA]);
  const [textoBoaProva, setTextoBoaProva] = useState(DEFAULT_FECHAMENTO_ORIENTACOES);

  // Estados Editáveis do Gabarito & Portal
  const [tituloGabarito, setTituloGabarito] = useState(DEFAULT_TITULO_GABARITO);
  const [orientacoesGabarito, setOrientacoesGabarito] = useState<string[]>([...DEFAULT_ORIENTACOES_GABARITO]);
  const [tituloAcesso, setTituloAcesso] = useState(DEFAULT_TITULO_ACESSO);
  const [textoAcessoGabarito, setTextoAcessoGabarito] = useState(DEFAULT_TEXTO_ACESSO);

  const [modoImpressao, setModoImpressao] = useState<'individual' | 'turma'>('individual');
  const [preparando, setPreparando] = useState(false);
  const [erroImpressao, setErroImpressao] = useState('');
  const [printPackets, setPrintPackets] = useState<StudentPrintPacket[] | null>(null);
  const printRoot = useRef<HTMLDivElement>(null);
  const alunosDaTurma = alunosDaTurmaSelecionada.filter(aluno => aluno.turmaId === turmaSelecionadaId);
  const safeSelectedIndex = Math.max(0, alunosDaTurma.findIndex(aluno => aluno.id === alunoAtual?.id));
  const previewQuestions = useMemo(() => preparePrintQuestions(questoesSelecionadas, safeSelectedIndex, shuffleQ, shuffleAlt), [questoesSelecionadas, safeSelectedIndex, shuffleQ, shuffleAlt]);
  const pontosPorQuestao = (10 / Math.max(1, questoesSelecionadas.filter(q => q.tipo === 'objetiva' || q.type === 'OBJECTIVE').length)).toFixed(1);
  const settings: PrintSettings = { instituicao, subinstituicao, escolaCurso, disciplina, subtitulo, dataProva, duracaoProva, tituloOrientacoes, orientacoesProva, textoBoaProva, tituloGabarito, orientacoesGabarito, tituloAcesso, textoAcessoGabarito, modoFrenteVerso };
  const commonPrintProps = { turmaSelecionadaId, turmaAtual, teacherId, resolvedStage, settings };
  const printJobProps = useRef({ ...commonPrintProps, withId });
  useEffect(() => {
    const finished = () => setPrintPackets(null);
    window.addEventListener('afterprint', finished);
    return () => window.removeEventListener('afterprint', finished);
  }, []);
  async function imprimir() {
    setErroImpressao('');
    if (modoImpressao === 'individual') {
      window.print();
      return;
    }

    setPreparando(true);
    try {
      const packets = buildClassPrintPackets(alunosDaTurma, turmaSelecionadaId, questoesSelecionadas, shuffleQ, shuffleAlt);
      printJobProps.current = { ...commonPrintProps, withId: true };
      flushSync(() => setPrintPackets(packets));
      if (!printRoot.current) throw new Error('Não foi possível preparar a impressão.');
      await waitForPrintResources(printRoot.current);
      window.print();
    } catch (error) {
      setPrintPackets(null);
      setErroImpressao(error instanceof Error ? error.message : 'Não foi possível preparar a impressão.');
    } finally { setPreparando(false); }
  }

  // Manipuladores de Orientações da Prova
  const handleUpdateOrientacao = (index: number, value: string) => {
    const updated = [...orientacoesProva];
    updated[index] = value;
    setOrientacoesProva(updated);
  };

  const handleAddOrientacao = () => {
    setOrientacoesProva([...orientacoesProva, 'Nova orientação para a realização da prova...']);
  };

  const handleRemoveOrientacao = (index: number) => {
    if (orientacoesProva.length <= 1) return;
    setOrientacoesProva(orientacoesProva.filter((_, i) => i !== index));
  };

  // Manipuladores de Instruções do Gabarito
  const handleUpdateGabaritoInstrucao = (index: number, value: string) => {
    const updated = [...orientacoesGabarito];
    updated[index] = value;
    setOrientacoesGabarito(updated);
  };

  const handleAddGabaritoInstrucao = () => {
    setOrientacoesGabarito([...orientacoesGabarito, 'NOVA REGRA SOBRE O PREENCHIMENTO DO GABARITO;']);
  };

  const handleRemoveGabaritoInstrucao = (index: number) => {
    if (orientacoesGabarito.length <= 1) return;
    setOrientacoesGabarito(orientacoesGabarito.filter((_, i) => i !== index));
  };

  // Restauração de todos os padrões
  const handleRestaurarPadrao = () => {
    setInstituicao('Católica SC');
    setSubinstituicao('Centro Universitário');
    setEscolaCurso(defaultEscola);
    setDisciplina(tituloProva || 'DIREITO DE PROPRIEDADE E RESPONSABILIDADE CIVIL');
    setSubtitulo(defaultSubtitulo);
    setDataProva(new Date().toLocaleDateString('pt-BR'));
    setDuracaoProva('3 (três) horas');
    setTituloOrientacoes(DEFAULT_TITULO_ORIENTACOES);
    setOrientacoesProva([...DEFAULT_ORIENTACOES_PROVA]);
    setTextoBoaProva(DEFAULT_FECHAMENTO_ORIENTACOES);
    setTituloGabarito(DEFAULT_TITULO_GABARITO);
    setOrientacoesGabarito([...DEFAULT_ORIENTACOES_GABARITO]);
    setTituloAcesso(DEFAULT_TITULO_ACESSO);
    setTextoAcessoGabarito(DEFAULT_TEXTO_ACESSO);
  };

  const abrirPainel = (aba: 'cabecalho' | 'orientacoes' | 'gabarito') => {
    setSubAbaEdicao(aba);
    setPainelCabecalhoAberto(true);
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR DE CONTROLES (OCULTA NA IMPRESSÃO) */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 flex-wrap">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="print-student" className="text-xs font-bold text-slate-700 uppercase">Estudante / Versão:</label>
            <select
              id="print-student"
              value={selectedVersionIdx}
              onChange={(e) => setSelectedVersionIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none sm:w-auto cursor-pointer"
            >
              {alunosDaTurmaSelecionada.map((aluno, idx) => (
                <option key={aluno.id} value={idx}>
                  {aluno.nome} — RA: {aluno.ra} (Versão {String.fromCharCode(65 + (idx % 4))})
                </option>
              ))}
            </select>
          </div>

          <label className="text-xs font-bold text-slate-700">Imprimir:
            <select aria-label="Modo de impressão" value={modoImpressao} onChange={event => setModoImpressao(event.target.value as 'individual' | 'turma')} className="ml-2 rounded-xl border border-slate-200 p-2">
              <option value="individual">Aluno selecionado</option><option value="turma">Turma inteira</option>
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900 transition">
            <input
              type="checkbox"
              checked={modoFrenteVerso}
              onChange={(e) => setModoFrenteVerso(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-catolica-primary focus:ring-catolica-primary cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-catolica-primary" />
              Imprimir Frente e Verso (Duplex)
            </span>
          </label>

          {/* BOTÃO PARA EDITAR CABEÇALHO & ORIENTAÇÕES */}
          <button
            onClick={() => setPainelCabecalhoAberto(!painelCabecalhoAberto)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              painelCabecalhoAberto
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-catolica-primary" />
            {painelCabecalhoAberto ? 'Fechar Personalização' : 'Personalizar Prova & Instruções'}
          </button>
        </div>

        <button
          onClick={imprimir}
          disabled={preparando || !alunosDaTurma.length || !questoesSelecionadas.length}
          className="flex items-center justify-center gap-2 rounded-xl bg-catolica-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-catolica-primary/20 transition hover:bg-catolica-dark cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" /> {preparando ? 'Preparando impressão...' : modoImpressao === 'turma' ? `Imprimir turma inteira (${alunosDaTurma.length} alunos)` : 'Imprimir aluno selecionado'}
        </button>
      </div>

      <div className="print:hidden text-sm text-slate-600" role="status">
        {erroImpressao ? <p role="alert" className="text-red-700">{erroImpressao}</p> : <p>{modoImpressao === 'turma' ? 'O lote inclui somente esta turma. Cada aluno recebe caderno e folha de respostas com nome, RA e QR Code nominal. A prévia abaixo mostra o aluno selecionado.' : 'A prévia e a impressão usam a mesma ordem de questões e alternativas.'}</p>}

      </div>

      {/* PAINEL DE PERSONALIZAÇÃO COMPLETO (EXPANSÍVEL E OCULTO NA IMPRESSÃO) */}
      {painelCabecalhoAberto && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-catolica-primary/30 shadow-lg space-y-4 print:hidden animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-catolica-primary" />
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                Personalização de Cabeçalho & Descritivos da Avaliação
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Alterações refletidas em tempo real na folha de respostas e no caderno
            </span>
          </div>

          {/* SUB-ABAS DE NAVEGAÇÃO DO PAINEL */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubAbaEdicao('cabecalho')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subAbaEdicao === 'cabecalho'
                  ? 'bg-catolica-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Cabeçalho & Instituição
            </button>

            <button
              type="button"
              onClick={() => setSubAbaEdicao('orientacoes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subAbaEdicao === 'orientacoes'
                  ? 'bg-catolica-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Orientações da Prova ({orientacoesProva.length} itens)
            </button>

            <button
              type="button"
              onClick={() => setSubAbaEdicao('gabarito')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subAbaEdicao === 'gabarito'
                  ? 'bg-catolica-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Regras do Gabarito & Portal
            </button>
          </div>

          {/* ABA 1: CABEÇALHO */}
          {subAbaEdicao === 'cabecalho' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instituição de Ensino:</label>
                <input
                  type="text"
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                  placeholder="Ex: Católica SC"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo Institucional:</label>
                <input
                  type="text"
                  value={subinstituicao}
                  onChange={(e) => setSubinstituicao(e.target.value)}
                  placeholder="Ex: Centro Universitário"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Escola / Unidade / Curso:</label>
                <input
                  type="text"
                  value={escolaCurso}
                  onChange={(e) => setEscolaCurso(e.target.value)}
                  placeholder="Ex: Escola de Direito ou Engenharia de Software"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disciplina / Nome da Avaliação:</label>
                <input
                  type="text"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: DIREITO DE PROPRIEDADE E RESPONSABILIDADE CIVIL"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Tipo da Prova:</label>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Ex: AVALIAÇÃO ESCRITA 01 ou N1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data da Prova:</label>
                <input
                  type="text"
                  value={dataProva}
                  onChange={(e) => setDataProva(e.target.value)}
                  placeholder="Ex: 23/03/2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-catolica-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duração da Avaliação:</label>
                <input
                  type="text"
                  value={duracaoProva}
                  onChange={(e) => setDuracaoProva(e.target.value)}
                  placeholder="Ex: 3 (três) horas"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-catolica-primary"
                />
              </div>
            </div>
          )}

          {/* ABA 2: ORIENTAÇÕES DA PROVA (DESCRITIVOS) */}
          {subAbaEdicao === 'orientacoes' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título da Seção de Orientações:</label>
                  <input
                    type="text"
                    value={tituloOrientacoes}
                    onChange={(e) => setTituloOrientacoes(e.target.value)}
                    placeholder="Ex: - Orientações para a realização da prova:"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mensagem Final de Encerramento:</label>
                  <input
                    type="text"
                    value={textoBoaProva}
                    onChange={(e) => setTextoBoaProva(e.target.value)}
                    placeholder="Ex: BOA PROVA!"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-center justify-between">
                <span>
                  💡 <strong>Dica de Automação:</strong> Use <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">{"{pontos}"}</code> para exibir os pontos por questão ({pontosPorQuestao} pts) e <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">{"{duracao}"}</code> para o tempo ({duracaoProva}).
                </span>
                <button
                  type="button"
                  onClick={handleAddOrientacao}
                  className="px-3 py-1.5 bg-catolica-primary text-white rounded-lg font-bold text-xs hover:bg-catolica-dark transition cursor-pointer flex items-center gap-1 shrink-0 ml-3 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Item
                </button>
              </div>

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {orientacoesProva.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-black text-slate-600 w-6 pt-2 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <textarea
                      rows={2}
                      value={item}
                      onChange={(e) => handleUpdateOrientacao(idx, e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-catolica-primary resize-y leading-snug"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOrientacao(idx)}
                      title="Remover este item"
                      disabled={orientacoesProva.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: REGRAS DO GABARITO & PORTAL */}
          {subAbaEdicao === 'gabarito' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex-1 max-w-md">
                  <label className="block font-bold text-slate-700 mb-1">Título do Quadro de Preenchimento:</label>
                  <input
                    type="text"
                    value={tituloGabarito}
                    onChange={(e) => setTituloGabarito(e.target.value)}
                    placeholder="Ex: ORIENTAÇÕES SOBRE O PREENCHIMENTO DO GABARITO"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddGabaritoInstrucao}
                  className="px-3 py-1.5 bg-catolica-primary text-white rounded-lg font-bold text-xs hover:bg-catolica-dark transition cursor-pointer flex items-center gap-1 shadow-sm mt-4"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Regra
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {orientacoesGabarito.map((regra, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-catolica-primary w-5 text-center shrink-0">✓</span>
                    <input
                      type="text"
                      value={regra}
                      onChange={(e) => handleUpdateGabaritoInstrucao(idx, e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-catolica-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGabaritoInstrucao(idx)}
                      title="Remover esta regra"
                      disabled={orientacoesGabarito.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Box de Acesso ao Gabarito */}
              <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título do Box de Acesso:</label>
                  <input
                    type="text"
                    value={tituloAcesso}
                    onChange={(e) => setTituloAcesso(e.target.value)}
                    placeholder="Ex: ACESSE SEU GABARITO EM:"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-catolica-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Texto de Instrução / URL do Portal:</label>
                  <input
                    type="text"
                    value={textoAcessoGabarito}
                    onChange={(e) => setTextoAcessoGabarito(e.target.value)}
                    placeholder="Ex: sgp.catolicasc.org.br — Gabaritos — Inserir o número da prova no espaço destinado."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-catolica-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* RODAPÉ DO PAINEL DE CONTROLE */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRestaurarPadrao}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar Todos os Textos Padrão
            </button>
            <button
              type="button"
              onClick={() => setPainelCabecalhoAberto(false)}
              className="px-5 py-2.5 bg-catolica-primary hover:bg-catolica-dark text-white rounded-xl font-bold text-xs shadow-md shadow-catolica-primary/20 transition cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <Check className="w-4 h-4" /> Concluir Edição
            </button>
          </div>
        </div>
      )}

      <div className={printPackets ? 'print:hidden' : ''}>
        {alunoAtual && <PrintableExam {...commonPrintProps} alunoAtual={alunoAtual} selectedVersionIdx={safeSelectedIndex} questoesEmbaralhadas={previewQuestions} withId={withId} abrirPainel={abrirPainel} />}
      </div>
      {printPackets && <div ref={printRoot} className="hidden print:block sgp-print-batch">
        {printPackets.map(packet => <PrintableExam key={packet.student.id} {...printJobProps.current} alunoAtual={packet.student} selectedVersionIdx={packet.versionIndex} questoesEmbaralhadas={packet.questions} />)}
      </div>}

    </div>
  );
}

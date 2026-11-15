'use client';

import React, { useState } from 'react';
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
import { Question, CardPayload, EvaluationStage, AvaliacaoCiclo } from '@/types';
import { QRCodeWrapper } from '@/components/common/QRCodeWrapper';
import { codificarGabaritoQr, sementeGabarito } from '@/lib/answerKey';

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

function renderTextoComVariaveis(texto: string, pontos: string, duracao: string) {
  if (texto.includes('{pontos}')) {
    const parts = texto.split('{pontos}');
    return (
      <span>
        {parts[0]}<strong>{pontos}</strong>{parts[1]}
      </span>
    );
  }
  if (texto.includes('{duracao}')) {
    const parts = texto.split('{duracao}');
    return (
      <span>
        {parts[0]}<strong>{duracao}</strong>{parts[1]}
      </span>
    );
  }
  return <span>{texto}</span>;
}

interface ImpressaoTabProps {
  alunosDaTurmaSelecionada: AlunoModel[];
  selectedVersionIdx: number;
  setSelectedVersionIdx: (idx: number) => void;
  alunoAtual: AlunoModel;
  tituloProva: string;
  turmaSelecionadaId: string;
  withId: boolean;
  questoesEmbaralhadas: Question[];
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
  questoesEmbaralhadas,
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
  const nomeTurma = turmaAtual?.nome || 'Turma Padrão';
  const defaultEscola = turmaAtual?.curso 
    ? (turmaAtual.curso.toLowerCase().includes('direito') ? 'Escola de Direito' : turmaAtual.curso) 
    : 'Escola de Direito';

  const resolvedStage: EvaluationStage = (stage === 'N1' || stage === 'N2' || stage === 'N3' || stage === 'N-1') ? stage : 'N1';
  const versaoLetra = String.fromCharCode(65 + (selectedVersionIdx % 4));
  const examId = `EXAM-${turmaSelecionadaId || 'T1'}-${resolvedStage}`;

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

  const codigoProvaFormatado = `${alunoAtual?.ra ? alunoAtual.ra.padStart(7, '0') : '2839932'}.${selectedVersionIdx % 4}`;

  const questoesObjetivas = questoesEmbaralhadas.filter(
    q => q.tipo === 'objetiva' || q.type === 'OBJECTIVE'
  ).slice(0, 30);
  const totalQuestoesObjetivas = Math.max(1, questoesObjetivas.length);
  const pontosPorQuestao = (10 / totalQuestoesObjetivas).toFixed(1);

  // Gabarito da folha exatamente como impressa (ordem + embaralhamento desta versão)
  const LETRAS_GAB = ['A', 'B', 'C', 'D', 'E'];
  const opcoesImpressas = questoesObjetivas.map(q =>
    Math.min(5, (q.options && q.options.length > 0)
      ? q.options.length
      : (q.alternativas && q.alternativas.length > 0) ? q.alternativas.length : 5)
  );
  const respostasImpressas = questoesObjetivas.map(q => {
    const idx = (q.options && q.options.length > 0)
      ? q.options.findIndex(o => !!o.isCorrect)
      : (q.alternativas || []).findIndex(a => !!a.correta);
    return LETRAS_GAB[Math.max(0, Math.min(4, idx))];
  });
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
            <label className="text-xs font-bold text-slate-700 uppercase">Estudante / Versão:</label>
            <select
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
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-xl bg-catolica-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-catolica-primary/20 transition hover:bg-catolica-dark cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" /> Imprimir Prova Completa {modoFrenteVerso ? '(Frente/Verso)' : '(Apenas Frente)'}
        </button>
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

      <div className="space-y-8 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* PÁGINA 1: FOLHA DE RESPOSTAS E GABARITO (IDÊNTICO AO MODELO CATÓLICA SC) */}
        {/* ========================================================================= */}
        <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-lg print:border-none print:p-0 print:m-0 print:shadow-none sm:p-8 print:break-after-page">
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1.5">
              
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
                              const totalOpcoes = (q.options && q.options.length > 0)
                                ? q.options.length
                                : (q.alternativas && q.alternativas.length > 0)
                                  ? q.alternativas.length
                                  : 5;
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
          // O verso precisa estar realmente vazio na impressão duplex (RF09).
          // A altura fica abaixo da área útil do A4 com margens de @page.
          <div
            aria-hidden="true"
            data-testid="verso-gabarito-duplex"
            className="hidden print:block print:h-[260mm] print:break-after-page print:bg-white"
          />
        )}

        {/* ========================================================================= */}
        {/* PÁGINA 3 EM DIANTE: CADERNO DE QUESTÕES (IDÊNTICO AO MODELO DA IMAGEM 1)   */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg print:border-none print:shadow-none print:p-0 sm:p-8">
          
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

          {/* Lista de Questões Formatada (1), 2), 3) com alternativas a), b), c), d), e)) */}
          <div className="space-y-6">
            {questoesEmbaralhadas.map((q, idx) => (
              <div key={q.id || idx} className="text-xs space-y-2.5 border-b border-slate-100 pb-4 print:break-inside-avoid">
                <div className="flex justify-between font-bold text-slate-900 print:text-black">
                  <span className="text-xs sm:text-sm font-black">
                    {idx + 1}) {q.enunciado || q.statement}
                  </span>
                  <span className="text-[11px] font-mono shrink-0 ml-2">
                    ({q.pontuacao != null ? (Number.isInteger(q.pontuacao) ? q.pontuacao.toFixed(1) : q.pontuacao.toString()) : pontosPorQuestao} pts)
                  </span>
                </div>

                {/* Alternativas (a, b, c, d, e) com indentação e espaçamento idênticos à prova real */}
                {(q.tipo === 'objetiva' || q.type === 'OBJECTIVE') && q.alternativas && (
                  <div className="space-y-1.5 pl-4 pt-1">
                    {q.alternativas.map((alt, altIdx) => (
                      <div key={alt.id || altIdx} className="flex items-start gap-2 text-slate-800 print:text-black leading-relaxed">
                        <span className="font-bold w-4 shrink-0">
                          {String.fromCharCode(97 + altIdx)})
                        </span>
                        <span className="flex-1">{alt.texto}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Espaço para resposta discursiva */}
                {(q.tipo === 'discursiva' || q.type === 'DISCURSIVE') && (
                  <div className="mt-3 border border-dashed border-slate-300 print:border-slate-500 rounded-lg p-3 min-h-[90px] text-[10px] text-slate-400 italic">
                    Espaço reservado para a resposta discursiva do estudante...
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}

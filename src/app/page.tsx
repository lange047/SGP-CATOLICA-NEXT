'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu } from 'lucide-react';

// Camadas de Domínio (Models)
import { AlunoModel, TurmaModel } from '@/models';
import { UsuarioModel } from '@/models/UsuarioModel';

// Camadas de Serviços e Repositórios
import { 
  AlunoService, 
  TurmaService, 
  QuestionService, 
  OmrService, 
  ExportService,
  ProfessorService,
  ExamService
} from '@/services';
import { 
  AlunoRepository, 
  TurmaRepository, 
  QuestionRepository, 
  OmrRepository,
  UsuarioRepository,
  ExamRepository
} from '@/repositories';

// Camada de Tipos
import { 
  Question, 
  AlternativaCadastro, 
  LeituraOMRRegistro,
  AvaliacaoCiclo,
  UserSession,
  ProvaMontadaRegistro
} from '@/types';

// Camada de Componentes de Apresentação
import { Header } from '@/components/layout/Header';
import { Sidebar, TabType } from '@/components/layout/Sidebar';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { CadastrosTab } from '@/components/cadastros/CadastrosTab';
import { ProfessoresTab } from '@/components/professores/ProfessoresTab';
import { ModalProfessor } from '@/components/professores/ModalProfessor';
import { ModalTrocarSenha } from '@/components/auth/ModalTrocarSenha';
import { ModalAluno, FormAlunoState } from '@/components/cadastros/ModalAluno';
import { ModalTurma, FormTurmaState } from '@/components/cadastros/ModalTurma';
import { AlertaModal } from '@/components/common/AlertaModal';

import { MontadorTab } from '@/components/montador/MontadorTab';
import { ModalQuestao } from '@/components/montador/ModalQuestao';
import { ImpressaoTab } from '@/components/impressao/ImpressaoTab';
import { LeituraTab } from '@/components/leitura/LeituraTab';
import { RelatoriosTab } from '@/components/relatorios/RelatoriosTab';

export default function Home() {
  // Instâncias dos Serviços da Arquitetura em Camadas
  const alunoRepo = useMemo(() => new AlunoRepository(), []);
  const turmaRepo = useMemo(() => new TurmaRepository(), []);
  const questionRepo = useMemo(() => new QuestionRepository(), []);
  const omrRepo = useMemo(() => new OmrRepository(), []);
  const usuarioRepo = useMemo(() => new UsuarioRepository(), []);
  const examRepo = useMemo(() => new ExamRepository(), []);

  const alunoService = useMemo(() => new AlunoService(alunoRepo), [alunoRepo]);
  const turmaService = useMemo(() => new TurmaService(turmaRepo), [turmaRepo]);
  const questionService = useMemo(() => new QuestionService(questionRepo), [questionRepo]);
  const omrService = useMemo(() => new OmrService(omrRepo), [omrRepo]);
  const professorService = useMemo(() => new ProfessorService(usuarioRepo), [usuarioRepo]);
  const examService = useMemo(() => new ExamService(examRepo), [examRepo]);

  // Autenticação Real e Navegação
  const [session, setSession] = useState<UserSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('cadastros');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalTrocarSenhaAberto, setModalTrocarSenhaAberto] = useState(false);

  useEffect(() => {
    const savedSession = window.localStorage.getItem('sgp-user-session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        window.localStorage.removeItem('sgp-user-session');
      }
    }
    setSessionLoaded(true);
  }, []);

  const handleLogin = (userSession: UserSession) => {
    window.localStorage.setItem('sgp-user-session', JSON.stringify(userSession));
    setSession(userSession);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('sgp-user-session');
    setSession(null);
  };

  // Estados de Dados
  const [turmas, setTurmas] = useState<TurmaModel[]>([]);
  const [alunos, setAlunos] = useState<AlunoModel[]>([]);
  const [professores, setProfessores] = useState<UsuarioModel[]>([]);
  const [bancoQuestoes, setBancoQuestoes] = useState<Question[]>([]);
  const [provasMontadas, setProvasMontadas] = useState<ProvaMontadaRegistro[]>([]);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>('t1');

  useEffect(() => {
    turmaService.listarTurmas().then(setTurmas);
    alunoService.listarAlunos().then(setAlunos);
    questionService.listarQuestoes().then(setBancoQuestoes);
    professorService.listarProfessores().then(setProfessores);
    examService.listarProvas().then(setProvasMontadas);
  }, [turmaService, alunoService, questionService, professorService, examService]);

  // 1. ISOLAMENTO TOTAL POR PROFESSOR (MULTI-TENANCY / ESCOPO DE USUÁRIO)
  // Turmas do Professor: apenas onde professorId === session.id
  const turmasVisiveis = useMemo(() => {
    if (!session) return turmas;
    if (session.role === 'ADMIN') return turmas;
    return turmas.filter(t => t.professorId === session.id || !t.professorId);
  }, [session, turmas]);

  // Alunos do Professor: apenas matriculados nas turmas do professor
  const alunosVisiveis = useMemo(() => {
    if (!session) return alunos;
    if (session.role === 'ADMIN') return alunos;
    const turmasIds = new Set(turmasVisiveis.map(t => t.id));
    return alunos.filter(a => turmasIds.has(a.turmaId));
  }, [session, alunos, turmasVisiveis]);

  // Banco de Questões do Professor: apenas associadas ao professor ou às suas turmas
  const bancoQuestoesVisiveis = useMemo(() => {
    if (!session) return bancoQuestoes;
    if (session.role === 'ADMIN') return bancoQuestoes;
    const turmasIds = new Set(turmasVisiveis.map(t => t.id));
    return bancoQuestoes.filter(q => 
      (q.teacherId && q.teacherId === session.id) ||
      (q.turmaId && turmasIds.has(q.turmaId)) ||
      (!q.teacherId && !q.turmaId)
    );
  }, [session, bancoQuestoes, turmasVisiveis]);

  // Ajusta a turma selecionada para a primeira turma válida do professor
  useEffect(() => {
    if (turmasVisiveis.length > 0) {
      const existe = turmasVisiveis.some(t => t.id === turmaSelecionadaId);
      if (!existe) {
        setTurmaSelecionadaId(turmasVisiveis[0].id);
      }
    }
  }, [turmasVisiveis, turmaSelecionadaId]);

  // Leitura OMR & Histórico (Isoladas por Professor)
  const [leiturasOMR, setLeiturasOMR] = useState<LeituraOMRRegistro[]>([]);
  const [buscaRelatorio, setBuscaRelatorio] = useState('');

  const leiturasOMRVisiveis = useMemo(() => {
    if (!session) return [];
    if (session.role === 'ADMIN') return leiturasOMR;
    const idsTurmas = new Set(turmasVisiveis.map(t => t.id));
    return leiturasOMR.filter(l => 
      (l.turmaId && idsTurmas.has(l.turmaId)) || 
      (l.professorId && l.professorId === session.id)
    );
  }, [session, leiturasOMR, turmasVisiveis]);

  const provasMontadasVisiveis = useMemo(() => {
    if (!session) return provasMontadas;
    if (session.role === 'ADMIN') return provasMontadas;
    const idsTurmas = new Set(turmasVisiveis.map(t => t.id));
    return provasMontadas.filter(p => 
      (p.turmaId && idsTurmas.has(p.turmaId)) ||
      (p.professorId && p.professorId === session.id)
    );
  }, [session, provasMontadas, turmasVisiveis]);

  // Montador de Provas
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<Question[]>([]);
  const [tituloProva, setTituloProva] = useState('Avaliação Escrita N2 - Engenharia de Software');
  const [buscaQuestao, setBuscaQuestao] = useState('');

  // Carrega questões iniciais no caderno apenas uma vez no bootstrap
  // Não reinjeta quando o professor deliberadamente zera ou remove todas as questões
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (bancoQuestoesVisiveis.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setQuestoesSelecionadas([bancoQuestoesVisiveis[0], bancoQuestoesVisiveis[1]].filter(Boolean));
    }
  }, [bancoQuestoesVisiveis]);

  // Regras de Embaralhamento e Identificação
  const [shuffleQ, setShuffleQ] = useState(true);
  const [shuffleAlt, setShuffleAlt] = useState(true);
  const [withId, setWithId] = useState(true);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);

  // Estados de Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [questaoEmEdicaoId, setQuestaoEmEdicaoId] = useState<string | null>(null);
  const [novoEnunciado, setNovoEnunciado] = useState('');
  const [novoTipo, setNovoTipo] = useState<'objetiva' | 'discursiva'>('objetiva');
  const [novaPontuacao, setNovaPontuacao] = useState(2.5);
  const [novasTags, setNovasTags] = useState('N2, Qualidade, Engenharia');
  const [cicloSelecionado, setCicloSelecionado] = useState<AvaliacaoCiclo | 'TODAS'>('TODAS');
  const [filtroApenasTurma, setFiltroApenasTurma] = useState<boolean>(true);
  const [novaTurmaId, setNovaTurmaId] = useState<string>('');
  const [novaAvaliacao, setNovaAvaliacao] = useState<AvaliacaoCiclo>('N2');
  const [alternativasCadastro, setAlternativasCadastro] = useState<AlternativaCadastro[]>([
    { letra: 'A', texto: '', correta: true },
    { letra: 'B', texto: '', correta: false },
    { letra: 'C', texto: '', correta: false },
    { letra: 'D', texto: '', correta: false },
    { letra: 'E', texto: '', correta: false }
  ]);

  const [modalAlunoAberto, setModalAlunoAberto] = useState(false);
  const [alertaVisual, setAlertaVisual] = useState<{
    aberto: boolean;
    tipo: 'erro' | 'sucesso' | 'info';
    titulo?: string;
    mensagem: string;
  }>({
    aberto: false,
    tipo: 'erro',
    mensagem: ''
  });
  const [alunoEmEdicaoId, setAlunoEmEdicaoId] = useState<string | null>(null);
  const [formAluno, setFormAluno] = useState<FormAlunoState>({
    nome: '',
    ra: '',
    curso: 'ENGENHARIA DE SOFTWARE',
    turno: 'Noturno',
    turmaId: 't1',
    dataNascimento: '',
    naturalidade: 'Jaraguá do Sul',
    estadoNatal: 'SC',
    mae: '',
    pai: '',
    celular: '',
    cep: '89251500',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: 'Jaraguá do Sul',
    estado: 'SC'
  });

  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [turmaEmEdicaoId, setTurmaEmEdicaoId] = useState<string | null>(null);
  const [formTurma, setFormTurma] = useState<FormTurmaState>({
    nome: '',
    curso: 'Engenharia de Software',
    semestre: '2026/2',
    professorId: undefined
  });

  // Modal de Professor (Exclusivo Admin)
  const [modalProfessorAberto, setModalProfessorAberto] = useState(false);
  const [professorEmEdicao, setProfessorEmEdicao] = useState<UsuarioModel | null>(null);

  // Memos e Cálculos Derivados
  const alunosDaTurmaSelecionada = useMemo(() => {
    return alunosVisiveis.filter(a => a.turmaId === turmaSelecionadaId);
  }, [alunosVisiveis, turmaSelecionadaId]);

  const alunoAtual = alunosDaTurmaSelecionada[selectedVersionIdx] || alunosDaTurmaSelecionada[0] || alunosVisiveis[0];

  const pontuacaoTotal = useMemo(() => {
    return questionService.calcularPontuacaoTotal(questoesSelecionadas);
  }, [questionService, questoesSelecionadas]);

  const contagemCiclos = useMemo(() => {
    return questionService.contarQuestoesPorCiclo(bancoQuestoesVisiveis, turmaSelecionadaId, filtroApenasTurma);
  }, [questionService, bancoQuestoesVisiveis, turmaSelecionadaId, filtroApenasTurma]);

  const questoesFiltradas = useMemo(() => {
    return questionService.filtrarQuestoesAvancado(bancoQuestoesVisiveis, {
      termoBusca: buscaQuestao,
      turmaId: turmaSelecionadaId,
      apenasTurma: filtroApenasTurma,
      ciclo: cicloSelecionado
    });
  }, [questionService, bancoQuestoesVisiveis, buscaQuestao, turmaSelecionadaId, filtroApenasTurma, cicloSelecionado]);

  const alunosFiltradosRelatorio = useMemo(() => {
    return alunoService.filtrarAlunos(alunosVisiveis, buscaRelatorio);
  }, [alunoService, alunosVisiveis, buscaRelatorio]);

  // Exportação CSV via ExportService
  const exportarCSV = () => {
    ExportService.gerarCsvNotas(alunosVisiveis, turmasVisiveis, tituloProva);
  };

  // Exportação Excel (.xlsx) com 3 abas (Notas, Espelho, Estatística) via ExportService (TSK 40)
  const exportarExcel = (params?: {
    turmaId?: string;
    ciclo?: AvaliacaoCiclo | 'TODAS';
    semestre?: string;
  }) => {
    ExportService.gerarRelatorioExcelCompleto({
      alunos: alunosVisiveis,
      turmas: turmasVisiveis,
      leiturasOMR: leiturasOMRVisiveis,
      provasMontadas: provasMontadasVisiveis,
      bancoQuestoes: bancoQuestoesVisiveis,
      turmaId: params?.turmaId,
      filtroCiclo: params?.ciclo,
      filtroSemestre: params?.semestre,
      tituloProva
    });
  };

  // Handlers do Histórico de Provas Montadas
  const handleSalvarProva = async (novaProva: ProvaMontadaRegistro) => {
    const provaComProfessor: ProvaMontadaRegistro = {
      ...novaProva,
      professorId: session?.id
    };
    const saved = await examService.salvarProvaMontada(provaComProfessor);
    setProvasMontadas(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
  };

  const handleExcluirProva = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta avaliação arquivada?')) {
      await examService.excluirProvaMontada(id);
      setProvasMontadas(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleCarregarProvaParaReimpressao = (prova: ProvaMontadaRegistro) => {
    setTituloProva(prova.titulo);
    setTurmaSelecionadaId(prova.turmaId);
    setQuestoesSelecionadas(prova.questoesSnapshot || []);
    setShuffleQ(prova.shuffleQuestoes);
    setShuffleAlt(prova.shuffleAlternativas);
    setWithId(prova.nominalQrCode);
    setCurrentTab('impressao');
  };

  const handleIrParaRelatorioDaTurma = (turmaId: string) => {
    setTurmaSelecionadaId(turmaId);
    setCurrentTab('relatorios');
  };

  // Handlers do Montador (Flexibilidade total de quantidade: permite 0, 1, 2, 3... até 30)
  const adicionarNaProva = (q: Question) => {
    if (questoesSelecionadas.some(item => item.id === q.id)) return;
    if (!questionService.validarLimite(questoesSelecionadas)) {
      alert('Limite máximo de 30 questões atingido!');
      return;
    }
    setQuestoesSelecionadas(prev => [...prev, q]);
  };

  const removerDaProva = (id: string) => {
    // Permite remover livremente sem travas de quantidade mínima (pode zerar)
    setQuestoesSelecionadas(prev => prev.filter(q => q.id !== id));
  };

  // Handlers de Questões
  const abrirModalNovaQuestao = () => {
    setQuestaoEmEdicaoId(null);
    setNovoEnunciado('');
    setNovoTipo('objetiva');
    setNovaPontuacao(2.5);
    setNovasTags('N2, Qualidade, Engenharia');
    setNovaTurmaId(turmaSelecionadaId || turmasVisiveis[0]?.id || '');
    setNovaAvaliacao(cicloSelecionado !== 'TODAS' && cicloSelecionado !== 'N-1' ? cicloSelecionado : 'N2');
    setAlternativasCadastro([
      { letra: 'A', texto: '', correta: true },
      { letra: 'B', texto: '', correta: false },
      { letra: 'C', texto: '', correta: false },
      { letra: 'D', texto: '', correta: false },
      { letra: 'E', texto: '', correta: false }
    ]);
    setModalAberto(true);
  };

  const abrirModalEditarQuestao = (q: Question) => {
    setQuestaoEmEdicaoId(q.id);
    setNovoEnunciado(q.enunciado || q.statement || '');
    setNovoTipo((q.tipo || q.type || 'objetiva').toLowerCase() as any);
    setNovaPontuacao(q.pontuacao ?? q.points ?? 2.5);
    setNovasTags(q.tags.join(', '));
    setNovaTurmaId(q.turmaId || q.classId || '');
    setNovaAvaliacao(q.avaliacao || (q.stage as any) || 'N2');
    if ((q.tipo === 'objetiva' || q.type === 'OBJECTIVE') && (q.alternativas || q.options)) {
      setAlternativasCadastro(
        ['A', 'B', 'C', 'D', 'E'].map((letra, i) => {
          const altExistente = q.alternativas?.[i];
          const optExistente = q.options?.[i];
          return {
            letra,
            texto: altExistente ? altExistente.texto : (optExistente ? optExistente.text : ''),
            correta: altExistente ? !!altExistente.correta : (optExistente ? !!optExistente.isCorrect : i === 0)
          };
        })
      );
    }
    setModalAberto(true);
  };

  const excluirQuestao = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta questão do banco?')) {
      await questionService.excluirQuestao(id);
      setBancoQuestoes(prev => prev.filter(q => q.id !== id));
      setQuestoesSelecionadas(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleSaveQuestaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEnunciado.trim()) return;

    const turmaDestinoId = novaTurmaId || turmaSelecionadaId;

    const questaoFormatada: Question = {
      id: questaoEmEdicaoId || `q_${Date.now()}`,
      // Propriedades novas da especificação
      statement: novoEnunciado,
      type: novoTipo === 'objetiva' ? 'OBJECTIVE' : 'DISCURSIVE',
      points: Number(novaPontuacao),
      teacherId: session?.id,
      classId: turmaDestinoId,
      stage: novaAvaliacao as any,
      options: novoTipo === 'objetiva' ? alternativasCadastro
        .filter((alt, idx) => idx < 4 || alt.texto.trim().length > 0)
        .map((alt) => ({
          letter: alt.letra as any,
          text: alt.texto,
          isCorrect: alt.correta
        })) : undefined,
      // Propriedades legadas mantidas
      tipo: novoTipo,
      enunciado: novoEnunciado,
      pontuacao: Number(novaPontuacao),
      tags: novasTags.split(',').map(t => t.trim()).filter(Boolean),
      turmaId: turmaDestinoId,
      avaliacao: novaAvaliacao,
      alternativas: novoTipo === 'objetiva' ? alternativasCadastro
        .filter((alt, idx) => idx < 4 || alt.texto.trim().length > 0)
        .map((alt) => ({
          id: `alt_${questaoEmEdicaoId || Date.now()}_${alt.letra}`,
          letraOriginal: alt.letra,
          texto: alt.texto,
          correta: alt.correta
        })) : undefined
    };

    const saved = await questionService.salvarQuestao(questaoFormatada);

    if (questaoEmEdicaoId) {
      setBancoQuestoes(prev => prev.map(q => q.id === questaoEmEdicaoId ? saved : q));
      setQuestoesSelecionadas(prev => prev.map(q => q.id === questaoEmEdicaoId ? saved : q));
    } else {
      setBancoQuestoes(prev => [saved, ...prev]);
    }

    setModalAberto(false);
  };

  // Handlers de Alunos
  const abrirModalNovoAluno = () => {
    if (turmasVisiveis.length === 0) {
      setAlertaVisual({
        aberto: true,
        tipo: 'erro',
        titulo: 'Validação de Cadastro',
        mensagem: 'Cadastre a turma antes!'
      });
      return;
    }

    setAlunoEmEdicaoId(null);
    setFormAluno({
      nome: '',
      ra: '',
      curso: 'ENGENHARIA DE SOFTWARE',
      turno: 'Noturno',
      turmaId: turmasVisiveis[0]?.id || '',
      dataNascimento: '',
      naturalidade: 'Jaraguá do Sul',
      estadoNatal: 'SC',
      mae: '',
      pai: '',
      celular: '',
      cep: '89251500',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: 'Jaraguá do Sul',
      estado: 'SC'
    });
    setModalAlunoAberto(true);
  };

  const abrirModalEditarAluno = (aluno: AlunoModel) => {
    setAlunoEmEdicaoId(aluno.id);
    setFormAluno({
      nome: aluno.nome,
      ra: aluno.ra,
      curso: aluno.curso,
      turno: aluno.turno,
      turmaId: aluno.turmaId,
      dataNascimento: aluno.dataNascimento ? String(aluno.dataNascimento) : '',
      naturalidade: aluno.naturalidade || '',
      estadoNatal: aluno.estadoNatal || '',
      mae: aluno.filiacao?.mae || '',
      pai: aluno.filiacao?.pai || '',
      celular: aluno.contato?.celular || '',
      cep: aluno.endereco?.cep || '',
      logradouro: aluno.endereco?.logradouro || '',
      numero: aluno.endereco?.numero || '',
      bairro: aluno.endereco?.bairro || '',
      cidade: aluno.endereco?.cidade || '',
      estado: aluno.endereco?.estado || ''
    });
    setModalAlunoAberto(true);
  };

  const excluirAluno = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      await alunoService.excluirAluno(id);
      setAlunos(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSaveAlunoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (turmasVisiveis.length === 0 || !formAluno.turmaId || formAluno.turmaId.trim() === '') {
      setAlertaVisual({
        aberto: true,
        tipo: 'erro',
        titulo: 'Validação Obrigatória de Turma',
        mensagem: 'Cadastre a turma antes!'
      });
      return;
    }

    const raTrim = formAluno.ra.trim();
    if (!formAluno.nome.trim() || !raTrim) return;

    const raDuplicado = alunosVisiveis.some(aluno => {
      const raExistente = aluno.ra ? String(aluno.ra).trim() : '';
      const mesmoId = alunoEmEdicaoId && aluno.id === alunoEmEdicaoId;
      return !mesmoId && raExistente.toLowerCase() === raTrim.toLowerCase();
    });

    if (raDuplicado) {
      setAlertaVisual({
        aberto: true,
        tipo: 'erro',
        titulo: 'Validação de Registro Acadêmico',
        mensagem: 'RA duplicado!'
      });
      return;
    }

    const alunoFormatado = new AlunoModel({
      id: alunoEmEdicaoId || `alu-${Date.now()}`,
      nome: formAluno.nome,
      ra: formAluno.ra,
      curso: formAluno.curso,
      turno: formAluno.turno,
      turmaId: formAluno.turmaId,
      dataNascimento: formAluno.dataNascimento || '',
      naturalidade: formAluno.naturalidade,
      estadoNatal: formAluno.estadoNatal,
      filiacao: {
        mae: formAluno.mae,
        pai: formAluno.pai
      },
      contato: {
        celular: formAluno.celular
      },
      endereco: {
        cep: formAluno.cep,
        logradouro: formAluno.logradouro,
        numero: formAluno.numero,
        bairro: formAluno.bairro,
        cidade: formAluno.cidade,
        estado: formAluno.estado
      }
    });

    const saved = await alunoService.salvarAluno(alunoFormatado);

    if (alunoEmEdicaoId) {
      setAlunos(prev => prev.map(a => a.id === alunoEmEdicaoId ? saved : a));
    } else {
      setAlunos(prev => [...prev, saved]);
    }
    setModalAlunoAberto(false);
  };

  // Handlers de Turmas
  const abrirModalNovaTurma = () => {
    setTurmaEmEdicaoId(null);
    setFormTurma({
      nome: '',
      curso: 'Engenharia de Software',
      semestre: '2026/2',
      professorId: session?.role === 'PROFESSOR' ? session.id : undefined
    });
    setModalTurmaAberto(true);
  };

  const abrirModalEditarTurma = (turma: TurmaModel) => {
    setTurmaEmEdicaoId(turma.id);
    setFormTurma({
      nome: turma.nome,
      curso: turma.curso,
      semestre: turma.semestre,
      professorId: turma.professorId || undefined
    });
    setModalTurmaAberto(true);
  };

  const excluirTurma = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
      await turmaService.excluirTurma(id);
      setTurmas(prev => prev.filter(t => t.id !== id));
      if (turmaSelecionadaId === id && turmasVisiveis.length > 1) {
        setTurmaSelecionadaId(turmasVisiveis.find(t => t.id !== id)?.id || '');
      }
    }
  };

  const handleSaveTurmaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const profAtribuido = formTurma.professorId || (session?.role === 'PROFESSOR' ? session.id : undefined);

    if (turmaEmEdicaoId) {
      const turmaAtualizada = new TurmaModel({
        id: turmaEmEdicaoId,
        nome: formTurma.nome,
        curso: formTurma.curso,
        semestre: formTurma.semestre,
        professorId: profAtribuido
      });
      const saved = await turmaService.salvarTurma(turmaAtualizada);
      setTurmas(prev => prev.map(t => t.id === turmaEmEdicaoId ? saved : t));
    } else {
      const novaTurma = new TurmaModel({
        nome: formTurma.nome,
        curso: formTurma.curso,
        semestre: formTurma.semestre,
        professorId: profAtribuido
      });
      const saved = await turmaService.salvarTurma(novaTurma);
      setTurmas(prev => [...prev, saved]);
    }
    setModalTurmaAberto(false);
  };

  // Handlers de Professores (Exclusivo Admin)
  const abrirModalNovoProfessor = () => {
    setProfessorEmEdicao(null);
    setModalProfessorAberto(true);
  };

  const abrirModalEditarProfessor = (prof: UsuarioModel) => {
    setProfessorEmEdicao(prof);
    setModalProfessorAberto(true);
  };

  const handleSaveProfessorSubmit = async (dados: { nome: string; email: string; senha?: string; disciplina: string }) => {
    const profFormatado = new UsuarioModel({
      id: professorEmEdicao?.id || `usr_prof_${Date.now()}`,
      nome: dados.nome,
      email: dados.email,
      senha: dados.senha || undefined,
      role: 'PROFESSOR',
      disciplina: dados.disciplina
    });

    const saved = await professorService.salvarProfessor(profFormatado, session?.role || 'ADMIN');

    if (professorEmEdicao) {
      setProfessores(prev => prev.map(p => p.id === professorEmEdicao.id ? saved : p));
    } else {
      setProfessores(prev => [...prev, saved]);
    }
  };

  const excluirProfessor = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este professor?')) {
      await professorService.excluirProfessor(id, session?.role || 'ADMIN');
      setProfessores(prev => prev.filter(p => p.id !== id));
    }
  };

  if (!sessionLoaded) return <div className="min-h-screen bg-slate-100" />;

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 md:block md:h-screen">
      {/* SIDEBAR NAVEGAÇÃO MODULAR */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        session={session}
        onLogout={handleLogout}
        onOpenTrocarSenha={() => setModalTrocarSenhaAberto(true)}
      />

      {/* CONTEÚDO PRINCIPAL EM CAMADAS */}
      <main className="w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 md:ml-64 md:h-screen md:w-auto print:ml-0 print:h-auto">
        <div className="print:hidden">
          <div className="mb-4 flex items-center rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 transition hover:bg-slate-800"
              aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-2 flex items-center gap-2 text-sm font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-catolica-primary">C</span>
              SGP Católica
            </div>
          </div>
          <Header currentTab={currentTab} />
        </div>

        {/* 1. ABA CADASTROS (ALUNOS E TURMAS DO PROFESSOR) */}
        {currentTab === 'cadastros' && (
          <CadastrosTab
            alunos={alunosVisiveis}
            turmas={turmasVisiveis}
            onOpenNovoAluno={abrirModalNovoAluno}
            onOpenNovaTurma={abrirModalNovaTurma}
            onEditAluno={abrirModalEditarAluno}
            onDeleteAluno={excluirAluno}
            onEditTurma={abrirModalEditarTurma}
            onDeleteTurma={excluirTurma}
          />
        )}

        {/* 2. ABA GESTÃO DE PROFESSORES (EXCLUSIVO ADMIN) */}
        {currentTab === 'professores' && session.role === 'ADMIN' && (
          <ProfessoresTab
            professores={professores}
            turmas={turmas}
            onOpenNovoProfessor={abrirModalNovoProfessor}
            onEditProfessor={abrirModalEditarProfessor}
            onDeleteProfessor={excluirProfessor}
          />
        )}

        {/* 3. ABA MONTADOR DE PROVAS (COM ABAS DE TURMA E SUB-ABAS N1, N2, N3, N-1) */}
        {currentTab === 'montador' && (
          <MontadorTab
            bancoQuestoes={bancoQuestoesVisiveis}
            questoesFiltradas={questoesFiltradas}
            questoesSelecionadas={questoesSelecionadas}
            turmas={turmasVisiveis}
            turmaSelecionadaId={turmaSelecionadaId}
            setTurmaSelecionadaId={setTurmaSelecionadaId}
            tituloProva={tituloProva}
            setTituloProva={setTituloProva}
            buscaQuestao={buscaQuestao}
            setBuscaQuestao={setBuscaQuestao}
            cicloSelecionado={cicloSelecionado}
            setCicloSelecionado={setCicloSelecionado}
            filtroApenasTurma={filtroApenasTurma}
            setFiltroApenasTurma={setFiltroApenasTurma}
            contagemCiclos={contagemCiclos}
            shuffleQ={shuffleQ}
            setShuffleQ={setShuffleQ}
            shuffleAlt={shuffleAlt}
            setShuffleAlt={setShuffleAlt}
            withId={withId}
            setWithId={setWithId}
            pontuacaoTotal={pontuacaoTotal}
            provasMontadas={provasMontadasVisiveis}
            onSalvarProva={handleSalvarProva}
            onExcluirProva={handleExcluirProva}
            onCarregarProvaParaReimpressao={handleCarregarProvaParaReimpressao}
            onIrParaRelatorioDaTurma={handleIrParaRelatorioDaTurma}
            onOpenNovaQuestao={abrirModalNovaQuestao}
            onEditQuestao={abrirModalEditarQuestao}
            onDeleteQuestao={excluirQuestao}
            onAdicionarNaProva={adicionarNaProva}
            onRemoverDaProva={removerDaProva}
            onIrParaImpressao={() => setCurrentTab('impressao')}
          />
        )}

        {/* 4. ABA IMPRESSÃO (CADERNO & GABARITO) */}
        {currentTab === 'impressao' && (
          <ImpressaoTab
            alunosDaTurmaSelecionada={alunosDaTurmaSelecionada}
            selectedVersionIdx={selectedVersionIdx}
            setSelectedVersionIdx={setSelectedVersionIdx}
            alunoAtual={alunoAtual}
            tituloProva={tituloProva}
            turmaSelecionadaId={turmaSelecionadaId}
            withId={withId}
            questoesSelecionadas={questoesSelecionadas}
            shuffleQ={shuffleQ}
            shuffleAlt={shuffleAlt}
            turmas={turmasVisiveis}
            teacherId={session?.id}
            stage={cicloSelecionado === 'TODAS' ? 'N1' : cicloSelecionado}
          />
        )}

        {/* 5. ABA LEITURA & CORREÇÃO (ISOLADA POR PROFESSOR) */}
        {currentTab === 'leitura' && (
          <LeituraTab
            alunos={alunosVisiveis}
            turmas={turmasVisiveis}
            turmaSelecionadaId={turmaSelecionadaId}
            questoesSelecionadas={questoesSelecionadas}
            bancoQuestoes={bancoQuestoesVisiveis}
            tituloProva={tituloProva}
            shuffleQ={shuffleQ}
            shuffleAlt={shuffleAlt}
            leiturasOMR={leiturasOMRVisiveis}
            provasMontadas={provasMontadas}
            onSelecionarTurma={(tId) => {
              if (tId !== 'TODAS') {
                setTurmaSelecionadaId(tId);
              }
            }}
            onSalvarLeitura={async (registro, alunoAtualizado) => {
              const registroComProfessor = {
                ...registro,
                professorId: session?.id,
                teacherId: session?.id
              };
              // Persistência atômica via transação Prisma: LeituraOMR + Nota do Aluno (N1/N2/N3/N-1)
              const resultado = await omrService.registrarLeituraComTransacao(registroComProfessor, registro.stage);
              const alunoFinal = resultado.aluno || alunoAtualizado;
              const leituraFinal = resultado.leitura || registroComProfessor;

              setAlunos(prevAlunos => prevAlunos.map(a => a.id === alunoFinal.id ? alunoFinal : a));
              setLeiturasOMR(prev => [leituraFinal, ...prev]);
            }}
          />
        )}

        {/* 6. ABA RELATÓRIOS & HISTÓRICO (MÉTRICAS EXCLUSIVAS DO PROFESSOR LOGADO) */}
        {currentTab === 'relatorios' && (
          <RelatoriosTab
            alunos={alunosVisiveis}
            leiturasOMR={leiturasOMRVisiveis}
            turmas={turmasVisiveis}
            provasMontadas={provasMontadasVisiveis}
            bancoQuestoes={bancoQuestoesVisiveis}
            buscaRelatorio={buscaRelatorio}
            setBuscaRelatorio={setBuscaRelatorio}
            alunosFiltradosRelatorio={alunosFiltradosRelatorio}
            onExportarCsv={exportarCSV}
            onExportarExcel={exportarExcel}
          />
        )}

        {/* MODAL DE PROFESSOR (EXCLUSIVO ADMIN) */}
        {session.role === 'ADMIN' && (
          <ModalProfessor
            isOpen={modalProfessorAberto}
            onClose={() => setModalProfessorAberto(false)}
            professorEmEdicao={professorEmEdicao}
            onSave={handleSaveProfessorSubmit}
          />
        )}

        {/* MODAL DE TROCA DE SENHA (TODOS OS PERFIS AUTENTICADOS) */}
        <ModalTrocarSenha
          isOpen={modalTrocarSenhaAberto}
          onClose={() => setModalTrocarSenhaAberto(false)}
          session={session}
        />

        {/* MODAL DE CADASTRO/EDIÇÃO DE QUESTÃO */}
        <ModalQuestao
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          questaoEmEdicaoId={questaoEmEdicaoId}
          novoEnunciado={novoEnunciado}
          setNovoEnunciado={setNovoEnunciado}
          novoTipo={novoTipo}
          setNovoTipo={setNovoTipo}
          novaPontuacao={novaPontuacao}
          setNovaPontuacao={setNovaPontuacao}
          novasTags={novasTags}
          setNovasTags={setNovasTags}
          novaTurmaId={novaTurmaId}
          setNovaTurmaId={setNovaTurmaId}
          novaAvaliacao={novaAvaliacao}
          setNovaAvaliacao={setNovaAvaliacao}
          turmas={turmasVisiveis}
          alternativasCadastro={alternativasCadastro}
          setAlternativasCadastro={setAlternativasCadastro}
          onSubmit={handleSaveQuestaoSubmit}
        />

        {/* MODAL DE CADASTRO/EDIÇÃO DE ALUNO */}
        <ModalAluno
          isOpen={modalAlunoAberto}
          onClose={() => setModalAlunoAberto(false)}
          isEditing={!!alunoEmEdicaoId}
          formAluno={formAluno}
          setFormAluno={setFormAluno}
          onSubmit={handleSaveAlunoSubmit}
          turmas={turmasVisiveis}
          alunosExistentes={alunosVisiveis}
          alunoEmEdicaoId={alunoEmEdicaoId}
          onAlertaErro={(msg) => {
            setAlertaVisual({
              aberto: true,
              tipo: 'erro',
              titulo: 'Atenção no Cadastro',
              mensagem: msg
            });
          }}
        />

        {/* MODAL DE ALERTA VISUAL GLOBAL (POPUPS E TOASTS) */}
        <AlertaModal
          isOpen={alertaVisual.aberto}
          onClose={() => setAlertaVisual(prev => ({ ...prev, aberto: false }))}
          titulo={alertaVisual.titulo}
          mensagem={alertaVisual.mensagem}
          tipo={alertaVisual.tipo}
        />

        {/* MODAL DE CADASTRO/EDIÇÃO DE TURMA */}
        <ModalTurma
          isOpen={modalTurmaAberto}
          onClose={() => setModalTurmaAberto(false)}
          isEditing={!!turmaEmEdicaoId}
          formTurma={formTurma}
          setFormTurma={setFormTurma}
          onSubmit={handleSaveTurmaSubmit}
          professores={professores}
          isAdmin={session.role === 'ADMIN'}
        />
      </main>
    </div>
  );
}

import { Question } from '@/types';
import { AlunoModel } from '@/models/AlunoModel';
import { shuffleArray } from '@/lib/shuffle';

/** Mesmas sementes para prévia, impressão individual e lote. Não altera o banco de questões. */
export function preparePrintQuestions(base: Question[], index: number, shuffleQuestions: boolean, shuffleAlternatives: boolean): Question[] {
  let questions: Question[] = JSON.parse(JSON.stringify(base));
  if (shuffleQuestions) questions = shuffleArray(questions, index + 1);
  if (shuffleAlternatives) questions = questions.map((question, position) => {
    const seed = (index + 1) * 10 + position + 1;
    return {
      ...question,
      alternativas: question.alternativas?.length ? shuffleArray(question.alternativas, seed) : undefined,
      options: question.options?.length ? shuffleArray(question.options, seed) : undefined
    };
  });
  return questions;
}

export function printedAlternatives(question: Question): { text: string; correct: boolean }[] {
  return question.alternativas?.length
    ? question.alternativas.map(option => ({ text: option.texto, correct: !!option.correta }))
    : (question.options || []).map(option => ({ text: option.text, correct: !!option.isCorrect }));
}

export interface StudentPrintPacket {
  student: AlunoModel;
  versionIndex: number;
  questions: Question[];
}

export function buildClassPrintPackets(students: AlunoModel[], classId: string, questions: Question[], shuffleQuestions: boolean, shuffleAlternatives: boolean): StudentPrintPacket[] {
  const selected = students.filter(student => student.turmaId === classId);
  if (!classId || !selected.length) throw new Error('A turma selecionada não possui alunos para imprimir.');
  if (!questions.length) throw new Error('Selecione as questões antes de imprimir.');
  if (questions.length > 30) throw new Error('O limite é de 30 questões por prova.');
  const ids = new Set<string>(), ras = new Set<string>();
  for (const student of selected) {
    if (!student.id || !student.ra?.trim() || ids.has(student.id) || ras.has(student.ra.trim().toLowerCase())) {
      throw new Error('Confira os identificadores e RAs da turma: há dados ausentes ou duplicados.');
    }
    ids.add(student.id); ras.add(student.ra.trim().toLowerCase());
  }
  return selected.map((student, versionIndex) => ({ student, versionIndex, questions: preparePrintQuestions(questions, versionIndex, shuffleQuestions, shuffleAlternatives) }));
}

/** Aguarda recursos reais antes de abrir o diálogo para não imprimir QR/imagens incompletos. */
export async function waitForPrintResources(root: HTMLElement): Promise<void> {
  await document.fonts?.ready;
  await Promise.all(Array.from(root.querySelectorAll('img')).map(image => new Promise<void>((resolve, reject) => {
    if (image.complete) { image.naturalWidth ? resolve() : reject(new Error('Não foi possível carregar uma imagem da prova.')); return; }
    const cleanup = () => { clearTimeout(timer); image.removeEventListener('load', loaded); image.removeEventListener('error', failed); };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Não foi possível carregar uma imagem da prova.')); };
    const timer = setTimeout(failed, 15000);
    image.addEventListener('load', loaded); image.addEventListener('error', failed);
  })));
  // QRCodeWrapper é montado por efeito; duas pinturas completam a preparação do lote.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (root.querySelector('[data-qr-pending]')) throw new Error('Os QR Codes ainda estão sendo preparados. Tente novamente.');
}

import { AlunoModel } from '@/models/AlunoModel';
import { Question } from '@/types';
export const students = Array.from({ length: 6 }, (_, i) => new AlunoModel({ id: `student-${i}`, nome: `Estudante Exemplo ${i + 1}`, ra: `2026${String(i + 1).padStart(3, '0')}`, turmaId: 'class-1' }));
export const questions: Question[] = Array.from({ length: 5 }, (_, i) => ({
  id: `question-${i}`, tipo: 'objetiva', enunciado: `Questão ${i + 1}: identifique a alternativa correta.`, pontuacao: 2, tags: [],
  alternativas: ['Resposta correta', 'Distrator um', 'Distrator dois', 'Distrator três'].map((texto, j) => ({ id: `alternative-${i}-${j}`, letraOriginal: String.fromCharCode(65 + j), texto, correta: j === 0 })),
  options: ['Resposta correta', 'Distrator um', 'Distrator dois', 'Distrator três'].map((text, j) => ({ letter: String.fromCharCode(65 + j) as 'A' | 'B' | 'C' | 'D', text, isCorrect: j === 0 }))
}));

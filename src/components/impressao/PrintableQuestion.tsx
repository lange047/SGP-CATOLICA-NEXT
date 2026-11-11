import { Question } from '@/types';
import { printedAlternatives } from '@/lib/printVersions';

interface PrintableQuestionProps {
  question: Question;
  number: number;
  defaultPoints: string;
  answerNumber?: number;
}

export function PrintableQuestion({ question: q, number, defaultPoints, answerNumber }: PrintableQuestionProps) {
  return (
    <div data-question-id={q.id} className="text-xs space-y-2.5 border-b border-slate-100 pb-4 print:break-inside-avoid sgp-question">
      <div className="flex justify-between font-bold text-slate-900 print:text-black">
        <span className="text-xs sm:text-sm font-black">
          {number}) {q.enunciado || q.statement}
        </span>
        <span className="text-[11px] font-mono shrink-0 ml-2">
          ({q.pontuacao != null ? (Number.isInteger(q.pontuacao) ? q.pontuacao.toFixed(1) : q.pontuacao.toString()) : defaultPoints} pts)
        </span>
      </div>

      {answerNumber !== undefined && answerNumber !== number && (
        <p className="text-[10px]">Folha de respostas: Q.{String(answerNumber).padStart(2, '0')}</p>
      )}

      {/* Alternativas (a, b, c, d, e) com indentação e espaçamento idênticos à prova real */}
      {(q.tipo === 'objetiva' || q.type === 'OBJECTIVE') && (
        <div className="space-y-1.5 pl-4 pt-1">
          {printedAlternatives(q).map((alt, altIdx) => (
            <div key={altIdx} className="sgp-question-option flex items-start gap-2 text-slate-800 print:text-black leading-relaxed">
              <span className="font-bold w-4 shrink-0">
                {String.fromCharCode(97 + altIdx)})
              </span>
              <span className="flex-1">{alt.text}</span>
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
  );
}

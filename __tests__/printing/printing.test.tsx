import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ImpressaoTab } from '@/components/impressao/ImpressaoTab';
import { students, questions } from '../../test-utils/printFixtures';
import { decodificarGabaritoQr, sementeGabarito } from '@/lib/answerKey';
jest.mock('lucide-react', () => ({ Printer: () => null, CheckSquare: () => null, Sliders: () => null, RotateCcw: () => null, Check: () => null, Sparkles: () => null, Plus: () => null, Trash2: () => null, FileText: () => null, Layers: () => null }));
jest.mock('@/components/common/QRCodeWrapper', () => ({ QRCodeWrapper: ({ value }: { value: string }) => <div data-testid="qr-payload">{value}</div> }));
const props = { alunosDaTurmaSelecionada: students, selectedVersionIdx: 1, setSelectedVersionIdx: jest.fn(), alunoAtual: students[1], tituloProva: 'Prova de teste', turmaSelecionadaId: 'class-1', withId: false, questoesSelecionadas: questions, shuffleQ: true, shuffleAlt: true, teacherId: 'teacher-1' };

describe('Impressão individual e em lote', () => {
  const originalPrint = window.print;
  beforeEach(() => { window.print = jest.fn(); });
  afterEach(() => { cleanup(); window.print = originalPrint; });
  it('imprime a turma nominal mesmo com identificação desligada na prévia, uma chamada ao diálogo', async () => {
    const { container } = render(<ImpressaoTab {...props} />);
    fireEvent.change(screen.getByLabelText('Modo de impressão'), { target: { value: 'turma' } });
    fireEvent.click(screen.getByRole('button', { name: /Imprimir turma inteira/ }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    const batch = container.querySelector('.sgp-print-batch')!;
    expect(batch.querySelectorAll('.sgp-student-packet')).toHaveLength(6);
    const qrNodes = batch.querySelectorAll('[data-testid="qr-payload"]');
    expect(qrNodes).toHaveLength(6);
    qrNodes.forEach((node, index) => {
      const payload = JSON.parse(node.textContent!);
      expect(payload.studentRa).toBe(students[index].ra);
      expect(payload.studentId).toBe(students[index].id);
      expect(payload.studentName).toBe(students[index].nome);
      const key = decodificarGabaritoQr(payload, sementeGabarito(payload.examId, payload.studentRa, payload.examVersion));
      const booklet = batch.querySelectorAll('.sgp-student-packet')[index].querySelector('.sgp-question-booklet')!;
      booklet.querySelectorAll('.sgp-question').forEach((q, i) => {
        const alts = Array.from(q.querySelectorAll('.sgp-question-option')).map(alt => alt.textContent);
        const expected = String.fromCharCode(65 + alts.findIndex(text => text?.includes('Resposta correta')));
        expect(key?.gabarito[i + 1]).toBe(expected);
      });
    });
    fireEvent(window, new Event('afterprint'));
    expect(container.querySelector('.sgp-print-batch')).not.toBeInTheDocument();
  });
  it('imprime apenas o aluno selecionado sem misturar seu gabarito ao da prévia', async () => {
    const { container } = render(<ImpressaoTab {...props} withId />);
    const preview = screen.getAllByTestId('qr-payload')[0].textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir aluno selecionado' }));
    await waitFor(() => expect(window.print).toHaveBeenCalled());
    expect(container.querySelector('.sgp-print-batch')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('qr-payload').map(node => node.textContent)).toEqual([preview]);
  });
  it('desabilita impressão para turma ou prova vazia', () => {
    const { rerender } = render(<ImpressaoTab {...props} alunosDaTurmaSelecionada={[]} />);
    expect(screen.getByRole('button', { name: 'Imprimir aluno selecionado' })).toBeDisabled();
    rerender(<ImpressaoTab {...props} questoesSelecionadas={[]} />);
    expect(screen.getByRole('button', { name: 'Imprimir aluno selecionado' })).toBeDisabled();
  });
});

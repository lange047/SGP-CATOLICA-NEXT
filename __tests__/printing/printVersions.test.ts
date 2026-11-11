import { buildClassPrintPackets, preparePrintQuestions, waitForPrintResources } from '@/lib/printVersions';
import { students, questions } from '../../test-utils/printFixtures';
import { AlunoModel } from '@/models/AlunoModel';

describe('TSK-52 — versões nominais em lote', () => {
  it('prepara cada aluno uma vez, exclui outras turmas e mantém ordem da prévia individual', () => {
    const outside = new AlunoModel({ id: 'outside', ra: '999', turmaId: 'other' });
    const before = JSON.stringify(questions);
    const packets = buildClassPrintPackets([...students, outside], 'class-1', questions, true, true);
    expect(packets).toHaveLength(6);
    packets.forEach((packet, index) => {
      expect(packet.student.id).toBe(students[index].id);
      expect(packet.questions).toEqual(preparePrintQuestions(questions, index, true, true));
      packet.questions.forEach(q => expect(q.alternativas?.map(a => a.texto)).toEqual(q.options?.map(o => o.text)));
    });
    expect(packets[0].questions).not.toEqual(packets[1].questions);
    expect(packets[0].questions).not.toEqual(packets[4].questions); // letra A repetida, pacote nominal distinto
    expect(JSON.stringify(questions)).toBe(before);
  });
  it('respeita as opções de embaralhamento', () => {
    expect(preparePrintQuestions(questions, 2, false, false)).toEqual(questions);
    expect(preparePrintQuestions(questions, 2, false, true).map(q => q.id)).toEqual(questions.map(q => q.id));
  });
  it('impede lote vazio, questões ausentes, excesso de questões e identificação duplicada', () => {
    expect(() => buildClassPrintPackets([], 'class-1', questions, true, true)).toThrow('não possui alunos');
    expect(() => buildClassPrintPackets(students, 'class-1', [], true, true)).toThrow('Selecione');
    expect(() => buildClassPrintPackets(students, 'class-1', Array(31).fill(questions[0]), true, true)).toThrow('30 questões');
    expect(() => buildClassPrintPackets([...students, students[0]], 'class-1', questions, true, true)).toThrow('duplicados');
    expect(() => buildClassPrintPackets([new AlunoModel({ id: 's1', ra: '', turmaId: 'class-1' })], 'class-1', questions, true, true)).toThrow('ausentes');
  });
  it('recusa imagem que falhou e QR ainda não montado', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<img src="invalid" />';
    const image = root.querySelector('img')!;
    Object.defineProperty(image, 'complete', { value: true });
    Object.defineProperty(image, 'naturalWidth', { value: 0 });
    await expect(waitForPrintResources(root)).rejects.toThrow('imagem');
    root.innerHTML = '<div data-qr-pending></div>';
    await expect(waitForPrintResources(root)).rejects.toThrow('QR Codes');
  });
});

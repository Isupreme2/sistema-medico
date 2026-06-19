import { describe, it, expect } from 'vitest';
import { checkPrescription, tieneConflictos } from './drugSafety';

describe('checkPrescription — alergias', () => {
  it('detecta un medicamento que choca con una alergia', () => {
    const r = checkPrescription([{ nombre: 'Penicilina G 500mg' }], ['penicilina']);
    expect(r.alergias).toHaveLength(1);
    expect(r.alergias[0].alergia).toBe('penicilina');
  });

  it('es insensible a mayúsculas/minúsculas', () => {
    const r = checkPrescription([{ nombre: 'AMOXICILINA 875' }], ['Amoxicilina']);
    expect(r.alergias).toHaveLength(1);
  });

  it('no marca alergias si no hay coincidencia', () => {
    const r = checkPrescription([{ nombre: 'Paracetamol 500mg' }], ['penicilina']);
    expect(r.alergias).toHaveLength(0);
  });

  it('no falla con lista de alergias vacía', () => {
    const r = checkPrescription([{ nombre: 'Paracetamol' }], []);
    expect(r.alergias).toHaveLength(0);
  });
});

describe('checkPrescription — interacciones', () => {
  it('detecta una interacción conocida entre dos medicamentos', () => {
    const r = checkPrescription(
      [{ nombre: 'Warfarina 5mg' }, { nombre: 'Aspirina 100mg' }],
      [],
    );
    expect(r.interacciones).toHaveLength(1);
    expect(r.interacciones[0].descripcion).toMatch(/sangrado/i);
  });

  it('detecta la interacción sin importar el orden', () => {
    const r = checkPrescription(
      [{ nombre: 'Aspirina' }, { nombre: 'Warfarina' }],
      [],
    );
    expect(r.interacciones).toHaveLength(1);
  });

  it('no inventa interacciones entre fármacos seguros', () => {
    const r = checkPrescription(
      [{ nombre: 'Paracetamol' }, { nombre: 'Loratadina' }],
      [],
    );
    expect(r.interacciones).toHaveLength(0);
  });
});

describe('tieneConflictos', () => {
  it('es true cuando hay alergia o interacción', () => {
    expect(tieneConflictos({ alergias: [{ medicamento: 'x', alergia: 'y' }], interacciones: [] })).toBe(true);
    expect(
      tieneConflictos({ alergias: [], interacciones: [{ entre: ['a', 'b'], descripcion: 'z' }] }),
    ).toBe(true);
  });

  it('es false cuando no hay nada', () => {
    expect(tieneConflictos({ alergias: [], interacciones: [] })).toBe(false);
  });
});

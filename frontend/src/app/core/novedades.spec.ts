import { NOVEDADES, novedadesPendientes, versionActual } from './novedades';

describe('novedadesPendientes', () => {
  it('las enseña todas a quien no ha visto ninguna', () => {
    expect(novedadesPendientes(null).length).toBe(NOVEDADES.length);
  });

  it('no enseña nada a quien ya vio la última', () => {
    expect(novedadesPendientes(versionActual())).toEqual([]);
  });

  it('enseña solo lo salido desde la última vez', () => {
    const pendientes = novedadesPendientes('2000.01.01');

    expect(pendientes.length).toBe(NOVEDADES.length);
    expect(pendientes[0].version).toBe(versionActual());
  });

  it('no enseña nada de una versión anterior a la vista', () => {
    expect(novedadesPendientes('2999.12.31')).toEqual([]);
  });

  it('las devuelve de la más reciente a la más antigua', () => {
    const versiones = novedadesPendientes(null).map((n) => n.version);

    expect(versiones).toEqual([...versiones].sort((a, b) => b.localeCompare(a)));
  });

  it('cada versión aparece una sola vez y la más reciente es la actual', () => {
    const versiones = NOVEDADES.map((n) => n.version);

    expect(new Set(versiones).size).toBe(versiones.length);
    expect(versionActual()).toBe([...versiones].sort((a, b) => b.localeCompare(a))[0]);
  });
});

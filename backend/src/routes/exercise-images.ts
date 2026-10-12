import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';

export const exerciseImagesRouter = Router();

/**
 * Buscador de imágenes en free-exercise-db (dominio público, licencia Unlicense).
 *
 * Se guarda el enlace a la imagen, nunca una copia: ni engorda la base ni
 * redistribuye nada. El catálogo se descarga una vez y se cachea en memoria.
 */
const DATASET = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const BASE_IMAGENES = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const TTL_MS = 12 * 60 * 60 * 1000;

interface EjercicioLibre {
  id: string;
  name: string;
  equipment?: string | null;
  level?: string | null;
  primaryMuscles?: string[];
  images?: string[];
}

let cache: { cargado: number; datos: EjercicioLibre[] } | null = null;

async function catalogo(): Promise<EjercicioLibre[]> {
  if (cache && Date.now() - cache.cargado < TTL_MS) return cache.datos;

  const respuesta = await fetch(DATASET);
  if (!respuesta.ok) throw new Error(`free-exercise-db respondió ${respuesta.status}`);

  const datos = (await respuesta.json()) as EjercicioLibre[];
  cache = { cargado: Date.now(), datos };
  return datos;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * El catálogo libre está en inglés y el nuestro en español, así que buscar
 * "press banca" no encontraba nada. Esto traduce los términos que de verdad
 * aparecen en nuestro catálogo; lo que no esté aquí se busca tal cual, y
 * siempre se puede escribir la consulta a mano en inglés.
 */
const TERMINOS: Record<string, string[]> = {
  abductores: ['abduction', 'abductor'],
  adductores: ['adduction', 'adductor'],
  abdominales: ['crunch', 'abdominal'],
  anillas: ['ring'],
  aperturas: ['fly', 'flyes'],
  arrancada: ['snatch'],
  banca: ['bench'],
  barra: ['barbell'],
  biceps: ['biceps', 'curl'],
  bici: ['bike', 'cycling'],
  boca: [],
  brazos: ['arm'],
  bulgara: ['bulgarian', 'split squat'],
  cadera: ['hip'],
  cardio: ['cardio'],
  cinta: ['treadmill'],
  contractora: ['pec deck', 'fly'],
  core: ['core', 'abdominal'],
  crunch: ['crunch'],
  cuadriceps: ['quadriceps', 'leg extension'],
  curl: ['curl'],
  dominadas: ['pullup', 'pull up', 'chin up'],
  dorsal: ['lat'],
  elevaciones: ['raise'],
  eliptica: ['elliptical'],
  encogimientos: ['shrug'],
  escaladora: ['stair', 'climber'],
  espalda: ['back', 'row'],
  estatico: ['hold', 'isometric'],
  extension: ['extension'],
  face: ['face'],
  femoral: ['leg curl', 'hamstring'],
  flexiones: ['pushup', 'push up'],
  fondos: ['dip'],
  frances: ['skullcrusher', 'lying triceps'],
  gemelo: ['calf'],
  glúteo: ['glute'],
  gluteo: ['glute'],
  goma: ['band'],
  hombro: ['shoulder'],
  hombros: ['shoulder'],
  inclinado: ['incline'],
  isometrica: ['isometric', 'hold'],
  jalon: ['pulldown', 'lat pulldown'],
  lastradas: ['weighted'],
  lastrado: ['weighted'],
  lastre: ['weighted'],
  laterales: ['lateral', 'side'],
  maquina: ['machine'],
  mancuerna: ['dumbbell'],
  mancuernas: ['dumbbell'],
  martillo: ['hammer'],
  militar: ['military', 'overhead press'],
  muerto: ['deadlift'],
  negativas: ['negative', 'eccentric'],
  pantorrilla: ['calf'],
  pecho: ['chest'],
  pierna: ['leg'],
  plancha: ['plank'],
  polea: ['cable'],
  pollo: [],
  prensa: ['leg press'],
  press: ['press'],
  pullover: ['pullover'],
  puente: ['bridge'],
  remo: ['row'],
  rumano: ['romanian'],
  sentadilla: ['squat'],
  sumo: ['sumo'],
  talon: ['heel'],
  tiron: ['pull'],
  triceps: ['triceps'],
  vertical: ['overhead'],
  zancadas: ['lunge'],
};

/** Palabras que no aportan nada a la búsqueda y solo restan precisión. */
const VACIAS = new Set(['de', 'del', 'la', 'el', 'en', 'con', 'sin', 'por', 'a', 'y', 'o', 'al', 'los', 'las', 'un', 'una']);

function expandir(palabras: string[]): string[] {
  const salida = new Set<string>();
  for (const palabra of palabras) {
    if (VACIAS.has(palabra)) continue;
    const traducciones = TERMINOS[palabra];
    if (traducciones?.length) for (const t of traducciones) salida.add(t);
    else if (!traducciones) salida.add(palabra);
  }
  return [...salida];
}

// GET /api/exercise-images?q=press%20banca
exerciseImagesRouter.get('/', asyncHandler(async (req, res) => {
  const consulta = normalizar(String(req.query.q ?? '')).trim();
  if (consulta.length < 2) return res.json([]);

  const palabras = expandir(consulta.split(/\s+/).filter(Boolean));
  if (!palabras.length) return res.json([]);

  const datos = await catalogo();

  const resultados = datos
    .filter((e) => e.images?.length)
    .map((e) => {
      const nombre = normalizar(e.name);
      const aciertos = palabras.filter((p) => nombre.includes(p)).length;
      return { e, aciertos, exacto: nombre === consulta };
    })
    .filter((r) => r.aciertos > 0)
    .sort((a, b) => Number(b.exacto) - Number(a.exacto) || b.aciertos - a.aciertos || a.e.name.length - b.e.name.length)
    .slice(0, 24)
    .map(({ e }) => ({
      id: e.id,
      name: e.name,
      equipment: e.equipment ?? null,
      level: e.level ?? null,
      primaryMuscles: e.primaryMuscles ?? [],
      images: (e.images ?? []).map((ruta) => BASE_IMAGENES + ruta),
    }));

  res.json(resultados);
}));

/**
 * Buscador de imágenes en wger (wger.de), proyecto libre cuyas imágenes están
 * bajo Creative Commons: se pueden usar citando al autor, y eso se guarda junto
 * a la imagen. Se guarda el enlace, nunca una copia.
 *
 * El catálogo se descarga una vez y se cachea: son dos listas, la de imágenes y
 * la de nombres traducidos, que juntas permiten buscar en español.
 */
const API = 'https://wger.de/api/v2';
const TTL_MS = 12 * 60 * 60 * 1000;
const IDIOMA_ES = 4;
const IDIOMA_EN = 2;

const LICENCIAS: Record<number, string> = {
  1: 'CC-BY-SA 3.0',
  2: 'CC-BY-SA 4.0',
  3: 'CC0',
  4: 'CC-BY 4.0',
  5: 'ODbL',
};

interface ImagenWger {
  id: number;
  exercise: number;
  image: string;
  thumbnails?: { small?: string; medium?: string };
  is_main: boolean;
  license: number;
  license_author: string | null;
}

interface TraduccionWger {
  exercise: number;
  language: number;
  name: string;
}

interface Candidato {
  id: string;
  name: string;
  nameEn: string | null;
  image: string;
  thumbnail: string;
  author: string | null;
  license: string;
}

let cache: { cargado: number; candidatos: Candidato[] } | null = null;

async function pedir<T>(ruta: string): Promise<{ results: T[]; next: string | null }> {
  const respuesta = await fetch(ruta.startsWith('http') ? ruta : `${API}${ruta}`);
  if (!respuesta.ok) throw new Error(`wger respondió ${respuesta.status} en ${ruta}`);
  return (await respuesta.json()) as { results: T[]; next: string | null };
}

async function todas<T>(ruta: string, maxPaginas = 8): Promise<T[]> {
  const salida: T[] = [];
  let siguiente: string | null = ruta;
  for (let i = 0; i < maxPaginas && siguiente; i++) {
    const pagina: { results: T[]; next: string | null } = await pedir<T>(siguiente);
    salida.push(...pagina.results);
    siguiente = pagina.next;
  }
  return salida;
}

async function catalogo(): Promise<Candidato[]> {
  if (cache && Date.now() - cache.cargado < TTL_MS) return cache.candidatos;

  const [imagenes, traducciones] = await Promise.all([
    todas<ImagenWger>('/exerciseimage/?format=json&limit=500'),
    todas<TraduccionWger>(`/exercise-translation/?format=json&limit=500`),
  ]);

  const nombres = new Map<number, { es?: string; en?: string }>();
  for (const t of traducciones) {
    if (t.language !== IDIOMA_ES && t.language !== IDIOMA_EN) continue;
    const actual = nombres.get(t.exercise) ?? {};
    if (t.language === IDIOMA_ES) actual.es = t.name;
    else actual.en = t.name;
    nombres.set(t.exercise, actual);
  }

  const candidatos = imagenes
    .map((img) => {
      const nombre = nombres.get(img.exercise);
      const titulo = nombre?.es ?? nombre?.en;
      if (!titulo) return null;
      return {
        id: String(img.id),
        name: titulo,
        nameEn: nombre?.en ?? null,
        image: img.image,
        thumbnail: img.thumbnails?.medium ?? img.thumbnails?.small ?? img.image,
        author: img.license_author || null,
        license: LICENCIAS[img.license] ?? 'Creative Commons',
      } satisfies Candidato;
    })
    .filter((c): c is Candidato => c !== null);

  cache = { cargado: Date.now(), candidatos };
  return candidatos;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Algunos nombres nuestros no existen en wger ni en español ni en inglés, así
 * que se traducen los términos que de verdad aparecen en nuestro catálogo.
 */
const TERMINOS: Record<string, string[]> = {
  abductores: ['abduccion', 'abductor', 'abduction'],
  adductores: ['aduccion', 'adductor', 'adduction'],
  anillas: ['anillas', 'ring'],
  aperturas: ['apertura', 'fly'],
  banca: ['banca', 'bench'],
  barra: ['barra', 'barbell'],
  biceps: ['biceps', 'curl'],
  bici: ['bicicleta', 'bike'],
  bulgara: ['bulgara', 'bulgarian'],
  cinta: ['cinta', 'treadmill'],
  crunch: ['crunch', 'abdominales'],
  cuadriceps: ['cuadriceps', 'quadriceps'],
  dominadas: ['dominadas', 'pull up', 'pullup', 'chin up'],
  elevaciones: ['elevacion', 'raise'],
  eliptica: ['eliptica', 'elliptical'],
  encogimientos: ['encogimiento', 'shrug'],
  escaladora: ['escaladora', 'stair'],
  espalda: ['espalda', 'back'],
  femoral: ['femoral', 'leg curl', 'hamstring'],
  flexiones: ['flexiones', 'push up', 'pushup'],
  fondos: ['fondos', 'dip'],
  frances: ['frances', 'skullcrusher'],
  gemelo: ['gemelo', 'calf'],
  gluteo: ['gluteo', 'glute'],
  goma: ['banda', 'band'],
  hombro: ['hombro', 'shoulder'],
  inclinado: ['inclinado', 'incline'],
  jalon: ['jalon', 'pulldown'],
  lastradas: ['lastradas', 'weighted'],
  lastre: ['lastre', 'weighted'],
  laterales: ['lateral'],
  maquina: ['maquina', 'machine'],
  mancuerna: ['mancuerna', 'dumbbell'],
  mancuernas: ['mancuernas', 'dumbbell'],
  martillo: ['martillo', 'hammer'],
  militar: ['militar', 'military', 'overhead'],
  muerto: ['muerto', 'deadlift'],
  pecho: ['pecho', 'chest'],
  pierna: ['pierna', 'leg'],
  plancha: ['plancha', 'plank'],
  polea: ['polea', 'cable'],
  prensa: ['prensa', 'leg press'],
  press: ['press'],
  puente: ['puente', 'bridge'],
  remo: ['remo', 'row'],
  rumano: ['rumano', 'romanian'],
  sentadilla: ['sentadilla', 'squat'],
  sumo: ['sumo'],
  tiron: ['tiron', 'pull'],
  triceps: ['triceps'],
  zancadas: ['zancada', 'lunge'],
};

const VACIAS = new Set(['de', 'del', 'la', 'el', 'en', 'con', 'sin', 'por', 'a', 'y', 'o', 'al', 'los', 'las', 'un', 'una']);

function expandir(palabras: string[]): string[] {
  const salida = new Set<string>();
  for (const palabra of palabras) {
    if (VACIAS.has(palabra)) continue;
    salida.add(palabra);
    for (const t of TERMINOS[palabra] ?? []) salida.add(t);
  }
  return [...salida];
}

export function buscarImagenes(candidatos: Candidato[], consulta: string, limite = 24): Candidato[] {
  const texto = normalizar(consulta).trim();
  if (texto.length < 2) return [];

  const palabras = expandir(texto.split(/\s+/).filter(Boolean));
  if (!palabras.length) return [];

  return candidatos
    .map((c) => {
      const heno = `${normalizar(c.name)} ${normalizar(c.nameEn ?? '')}`;
      const aciertos = palabras.filter((p) => heno.includes(p)).length;
      return { c, aciertos, exacto: normalizar(c.name) === texto };
    })
    .filter((r) => r.aciertos > 0)
    .sort((a, b) => Number(b.exacto) - Number(a.exacto) || b.aciertos - a.aciertos || a.c.name.length - b.c.name.length)
    .slice(0, limite)
    .map(({ c }) => c);
}

export { catalogo as catalogoWger, expandir, normalizar };
export type { Candidato };

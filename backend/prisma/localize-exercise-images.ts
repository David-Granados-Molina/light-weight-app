import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

/**
 * Se trae a `frontend/public/exercises` las imágenes que hasta ahora se pedían
 * a wger, reducidas y en WebP, y deja escrita la migración que apunta el
 * catálogo a la copia local. Así la galería no depende de que wger esté en pie
 * y las imágenes viajan por el mismo dominio que la aplicación.
 *
 * Necesita `sharp`, que no va en las dependencias del proyecto para no cargar
 * el despliegue de la API con sus binarios: `npm i --no-save sharp` antes.
 *
 * Las imágenes de wger son CC-BY-SA: copiarlas está permitido citando al autor
 * y manteniendo la licencia, y eso es lo que hace CREDITOS.md.
 */

const prisma = new PrismaClient();

const SQL = process.argv.includes('--sql');
const DESTINO = path.resolve(__dirname, '../../frontend/public/exercises');
const PUBLICA = '/exercises';
const ANCHO_MAX = 720;
const CALIDAD = 78;

function slug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function comilla(valor: string): string {
  return "'" + valor.split("'").join("''") + "'";
}

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: { createdById: null, imageUrl: { startsWith: 'http' } },
    orderBy: { name: 'asc' },
    select: { name: true, imageUrl: true, imageAuthor: true, imageLicense: true },
  });

  if (!exercises.length) {
    console.log('No queda ninguna imagen apuntando a wger.');
    return;
  }

  await fs.mkdir(DESTINO, { recursive: true });

  const ficheros = new Map<string, { fichero: string; usan: string[]; autor: string | null; licencia: string | null }>();
  for (const ex of exercises) {
    const url = ex.imageUrl!;
    const ya = ficheros.get(url);
    if (ya) {
      ya.usan.push(ex.name);
      continue;
    }
    ficheros.set(url, { fichero: `${slug(ex.name)}.webp`, usan: [ex.name], autor: ex.imageAuthor, licencia: ex.imageLicense });
  }

  if (!SQL) console.log(`${exercises.length} ejercicios, ${ficheros.size} imágenes distintas.`);

  let total = 0;
  const sql: string[] = [];
  const creditos: string[] = [];

  for (const [url, dato] of ficheros) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}`);

    const original = Buffer.from(await respuesta.arrayBuffer());
    const animada = url.toLowerCase().endsWith('.gif');
    const reducida = await sharp(original, { animated: animada })
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toBuffer();

    await fs.writeFile(path.join(DESTINO, dato.fichero), reducida);
    total += reducida.length;

    if (!SQL) {
      const kb = (n: number) => (n / 1024).toFixed(0) + ' kB';
      console.log(`  ${dato.fichero.padEnd(34)} ${kb(original.length).padStart(8)} -> ${kb(reducida.length).padStart(7)}  (${dato.usan.length})`);
    }

    for (const nombre of dato.usan) {
      sql.push(
        `UPDATE "Exercise" SET "imageUrl" = ${comilla(`${PUBLICA}/${dato.fichero}`)} ` +
          `WHERE "name" = ${comilla(nombre)} AND "createdById" IS NULL;`,
      );
    }

    creditos.push(
      `| \`${dato.fichero}\` | ${dato.usan.join(', ')} | ${dato.autor ?? '—'} | ${dato.licencia ?? 'CC-BY-SA'} | ${url} |`,
    );
  }

  await fs.writeFile(
    path.join(DESTINO, 'CREDITOS.md'),
    [
      '# Créditos de las imágenes',
      '',
      'Vienen de [wger.de](https://wger.de), proyecto libre, y están bajo licencia',
      'Creative Commons. Se han reducido a 720 px y convertido a WebP; por lo demás',
      'son las originales. La licencia obliga a citar al autor y a mantenerla, y eso',
      'es lo que hace esta tabla.',
      '',
      '| Fichero | Ejercicios | Autor | Licencia | Original |',
      '|---|---|---|---|---|',
      ...creditos,
      '',
    ].join('\n'),
    'utf8',
  );

  if (SQL) {
    console.log('-- El catálogo apunta a las copias locales de las imágenes, en frontend/public/exercises.');
    console.log('-- Generado por prisma/localize-exercise-images.ts, que es quien las descarga y reduce.');
    console.log(sql.join('\n'));
    return;
  }

  console.log(`\n${(total / 1024 / 1024).toFixed(1)} MB en ${ficheros.size} ficheros, en ${DESTINO}`);
  console.log('CREDITOS.md escrito. Con --sql imprime la migración que apunta el catálogo a estas copias.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

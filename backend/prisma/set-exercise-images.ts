import { PrismaClient } from '@prisma/client';
import { catalogoWger, type Candidato } from '../src/lib/wger';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const SQL = process.argv.includes('--sql');

/**
 * Qué imagen de wger le toca a cada ejercicio del catálogo base. La pareja se
 * elige a mano: emparejar por nombre acertaba dos de cada tres y los fallos eran
 * de los que se ven —una imagen de curl femoral en «Curl bíceps»—.
 *
 * `null` es deliberado: wger no tiene nada de ese ejercicio, y una imagen
 * aproximada confunde más que el hueco.
 */
const MAPA: Record<string, string | null> = {
  'Abductores': 'Abducción en máquina',
  'Adductores': 'Aducción de Cadera en Máquina',
  'Advanced tuck front lever': null,
  'Advanced tuck planche': 'Tuck planche',
  'Advanced tuck planche (gimnasia)': 'Tuck planche',
  'Agarrar peso estático': null,
  'Aperturas con mancuernas': 'Aperturas con Mancuernas',
  'Aperturas en máquina': 'Aperturas en máquina',
  'Bicho muerto': null,
  'Bici estática': 'Cardio en bicicleta estática',
  'Burpees': null,
  'Búlgara tronco inclinado': 'Sentadilla búlgara con mancuernas',
  'Carrera exterior': null,
  'Cinta': 'Cinta de correr',
  'Cinta de correr': 'Cinta de correr',
  'Contractora (pec deck)': 'Aperturas en Máquina para Pecho',
  'Crunch en polea': 'Crunch con peso',
  'Crunch en suelo con peso': 'Crunch con peso',
  'Curl bíceps': 'Curl con barra',
  'Curl de bíceps': 'Curl de bíceps con mancuerna',
  'Curl de bíceps con goma': 'Curl de Bíceps en Polea',
  'Curl de isquios': 'Curl femoral',
  'Curl en polea': 'Curl de Bíceps en Polea',
  'Curl femoral': 'Curl femoral',
  'Curl femoral unilateral': 'Curl de piernas (tumbado)',
  'Curl martillo': 'Curl Martillo',
  'Dead hang': null,
  'Dominadas': 'Dominadas',
  'Dominadas agarre supino': 'Dominadas con Agarre Supino',
  'Dominadas asistidas con banda': 'Dominadas',
  'Dominadas escapulares': 'Dominadas',
  'Dominadas lastre': 'Dominadas',
  'Dominadas negativas': 'Dominadas',
  'Dominadas pronas lastre': 'Dominadas',
  'Dominadas supinas lastre': 'Dominadas con Agarre Supino',
  'Elevaciones laterales': 'Elevación lateral con mancuernas',
  'Elevación de piernas colgado': 'Elevaciones de Piernas en Barra',
  'Elíptica': null,
  'Encogimientos': 'Encogimiento de hombros',
  'Escaladora': null,
  'Extensión de cuádriceps': 'Curl cuadriceps',
  'Extensión de tríceps con goma': 'Extensión de tríceps en polea con cuerda',
  'Extensión tríceps': 'Extensión de triceps',
  'Extensión tríceps cabeza': 'Extensión de tríceps por encima de la cabeza',
  'Face pull': 'Face pull inclinado con mancuernas',
  'Flexiones': 'Push-Up',
  'Flexiones a pino': 'Flexiones en pino',
  'Flexiones abiertas profundas': 'Push-Up',
  'Flexiones declinadas': 'Flexiones | declinadas (decline)',
  'Flexiones declinadas lastre': 'Flexiones con peso',
  'Flexiones diamante': 'Flexiones con agarre estrecho',
  'Flexiones diamante lastre': 'Flexiones con peso',
  'Flexiones en pared': 'Push-Up',
  'Flexiones pica': 'Flexiones de pica',
  'Flexiones pica rodillas altura': 'Flexiones de pica',
  'Flexiones profundas lastre': 'Flexiones con peso',
  'Fondos': 'Fondos en Paralelas',
  'Fondos en banco': 'Fondos entre Bancos',
  'Fondos lastrados': 'Fondos en Paralelas',
  'Front lever': null,
  'Front lever a una pierna': null,
  'Gemelo de pie': 'Elevación de talón de pie',
  'HIIT': null,
  'Hip thrust': 'Empuje de cadera con mancuerna',
  'Hiperextensiones': 'Extensiones lumbares a 45°',
  'Hollow body': 'Hollow hold',
  'Jalón al pecho': 'Jalón al pecho con agarre neutro',
  'L-sit': null,
  'Lean planche': 'Tuck planche',
  'Muscle-up': null,
  'Muscle-up negativo': null,
  'Paseo del granjero': null,
  'Peso muerto': 'Peso Muerto Convencional',
  'Peso muerto rumano': 'Peso muerto rumano con barra',
  'Peso muerto rumano bilateral': 'Peso muerto rumano con barra',
  'Pino': 'Flexiones en pino',
  'Pino a la pared': 'Flexiones en pino',
  'Plancha': 'Plancha de antebrazo',
  'Planche': 'Tuck planche',
  'Planche (gimnasia)': 'Tuck planche',
  'Prensa': 'Prensa de piernas',
  'Prensa/Extensión': 'Prensa de piernas',
  'Press Arnold': 'Press Militar mancuerna',
  'Press banca': 'Press de Banca',
  'Press banca con mancuernas': 'Press de banca con mancuernas',
  'Press de hombro vertical con goma': 'Press Militar mancuerna',
  'Press de pecho con goma': 'Press de Pecho en Máquina',
  'Press francés': 'Press Francés con Barra SZ',
  'Press hombro mancuernas': 'Press Militar mancuerna',
  'Press inclinado': 'Press de banca inclinado',
  'Press militar': 'Press militar',
  'Puente de glúteo': 'Puente de glúteos',
  'Pull-over': 'Pullover con Mancuerna',
  'Remo anillas': 'Remo en TRX',
  'Remo con barra': 'Remo Inclinado con Barra (agarre prono)',
  'Remo con garrafa': 'Remo con mancuernas',
  'Remo con goma': 'Remo sentado',
  'Remo con mancuerna': 'Remo con mancuernas',
  'Remo en máquina': 'Remo sentado (máquina)',
  'Remo en polea': 'Remo gironda agarre cerrado',
  'Remo ergómetro': null,
  'Remo invertido': 'Remo invertido',
  'Remo unilateral': 'Remo a un brazo',
  'Remos lastre': 'Remo invertido',
  'Reverse crunch': 'Elevaciones de piernas tumbado',
  'Rueda abdominal': 'Rueda abdominal',
  'Salto al cajón': null,
  'Sentadilla': 'Sentadilla profunda con barra',
  'Sentadilla búlgara': 'Sentadilla búlgara izquierda',
  'Sentadilla búlgara con salto': 'Sentadilla búlgara izquierda',
  'Sentadilla búlgara libre con salto': 'Sentadilla búlgara izquierda',
  'Sentadilla isométrica': 'Sentadilla isometrica al fallo',
  'Sentadilla multipower': 'Sentadilla multipower',
  'Sentadilla pistol': 'Sentadillas en pistol izquierda',
  'Sentadilla profunda': 'Sentadilla lenta',
  'Sentadilla profunda con salto': 'Sentadilla lenta',
  'Sentadilla sumo': null,
  'Sentadilla unilateral': 'Sentadillas en pistol izquierda',
  'Straddle front lever': null,
  'Straddle planche': 'Tuck planche',
  'Straddle planche (gimnasia)': 'Tuck planche',
  'Subir escalón': 'Subida a peldaño',
  'Superman': null,
  'Tuck L-sit': 'Seated Knee Tuck',
  'Tuck front lever': null,
  'Tuck planche': 'Tuck planche',
  'Tuck planche (gimnasia)': 'Tuck planche',
  'V-sit': 'Abdominales en V con Balón Medicinal',
  'Zancadas': 'Zancadas con peso',
  'Zancadas con mancuernas': 'Zancadas Caminando con Mancuernas',
};

function comilla(valor: string | null): string {
  if (valor === null) return 'NULL';
  const escapado = valor.split("'").join("''");
  return "'" + escapado + "'";
}

async function main() {
  const candidatos = await catalogoWger();
  const porNombre = new Map<string, Candidato>();
  for (const c of candidatos) {
    const clave = c.name.toLowerCase();
    if (!porNombre.has(clave)) porNombre.set(clave, c);
  }

  const exercises = await prisma.exercise.findMany({
    where: { createdById: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const sql: string[] = [];
  const sinImagen: string[] = [];
  const sinPareja: string[] = [];
  let puestas = 0;

  for (const ex of exercises) {
    if (!(ex.name in MAPA)) {
      sinPareja.push(ex.name);
      continue;
    }

    const buscado = MAPA[ex.name];
    if (buscado === null) {
      sinImagen.push(ex.name);
      continue;
    }

    const candidato = porNombre.get(buscado.toLowerCase());
    if (!candidato) {
      sinPareja.push(ex.name + ' -> "' + buscado + '" ya no está en wger');
      continue;
    }

    puestas++;
    if (!SQL) console.log('  ' + ex.name.padEnd(36) + ' -> ' + candidato.name);
    sql.push(
      'UPDATE "Exercise" SET "imageUrl" = ' +
        comilla(candidato.image) +
        ', "imageAuthor" = ' +
        comilla(candidato.author) +
        ', "imageLicense" = ' +
        comilla(candidato.license) +
        ' WHERE "name" = ' +
        comilla(ex.name) +
        ' AND "createdById" IS NULL;',
    );

    if (APPLY) {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { imageUrl: candidato.image, imageAuthor: candidato.author, imageLicense: candidato.license },
      });
    }
  }

  if (SQL) {
    console.log('-- Imagen por defecto de cada ejercicio del catálogo base, de wger.de (CC-BY-SA).');
    console.log('-- Generado por prisma/set-exercise-images.ts, donde está la tabla de parejas.');
    console.log(sql.join('\n'));
    return;
  }

  console.log('\n' + puestas + ' con imagen.');
  console.log(sinImagen.length + ' sin ella a propósito: ' + sinImagen.join(', '));
  if (sinPareja.length) console.log('\nSIN PAREJA EN LA TABLA (' + sinPareja.length + '): ' + sinPareja.join(', '));
  if (!APPLY) console.log('\nSimulación: no se ha escrito nada. --apply escribe en la base, --sql imprime la migración.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

export type ParsedSet = { reps?: number; weight?: number; time?: number };
export type ParsedExercise = { name: string; exerciseId: string | null; sets: ParsedSet[] };
export type ParsedWorkout = {
  category: 'gym' | 'calistenia';
  type: 'empuje' | 'tiron' | 'pierna' | 'core';
  exercises: ParsedExercise[];
  warnings: string[];
};

const TOOL_NAME = 'registrar_entreno';

function buildTool(catalogNames: string[]) {
  return {
    name: TOOL_NAME,
    description:
      'Registra el entreno descrito por el usuario, normalizando los nombres de ejercicio al catálogo proporcionado cuando sea posible.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', enum: ['gym', 'calistenia'] },
        type: { type: 'string', enum: ['empuje', 'tiron', 'pierna', 'core'] },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: `Nombre del ejercicio. Usa exactamente uno de estos si aplica: ${catalogNames.join(', ')}. Si no encaja ninguno, usa el nombre tal cual lo dice el usuario.`,
              },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    reps: { type: 'number' },
                    weight: { type: 'number', description: 'Peso en kg, si aplica' },
                    time: { type: 'number', description: 'Tiempo en segundos, si aplica (planchas, L-sit, pino...)' },
                  },
                },
              },
            },
            required: ['name', 'sets'],
          },
        },
      },
      required: ['category', 'type', 'exercises'],
    },
  };
}

export class NoApiKeyError extends Error {
  constructor() {
    super(
      'Falta ANTHROPIC_API_KEY en el backend. Añádela al archivo .env de backend para activar el registro por WhatsApp/Claude.',
    );
    this.name = 'NoApiKeyError';
  }
}

/**
 * Convierte un mensaje en lenguaje natural (ej. WhatsApp) en un entreno
 * estructurado, usando Claude para interpretar el texto y el catálogo de
 * ejercicios de la BBDD para resolver los IDs.
 *
 * Requiere la variable de entorno ANTHROPIC_API_KEY.
 */
export async function parseWorkoutMessage(message: string): Promise<ParsedWorkout> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new NoApiKeyError();
  }

  const catalog = await prisma.exercise.findMany();
  const catalogByName = new Map(catalog.map((e) => [e.name.toLowerCase(), e]));

  const anthropic = new Anthropic({ apiKey });
  const tool = buildTool(catalog.map((e) => e.name));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Hoy es ${new Date().toLocaleDateString('es-ES')}. El usuario describe el entreno que ha hecho hoy. Extrae la categoría (gym o calistenia), el tipo de entreno (empuje, tiron, pierna o core) y, para cada ejercicio, las series realizadas con sus repeticiones y, si aplica, el peso en kg o el tiempo en segundos.\n\nMensaje del usuario:\n"""${message}"""`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude no devolvió un entreno estructurado');
  }

  const input = toolUse.input as {
    category: 'gym' | 'calistenia';
    type: 'empuje' | 'tiron' | 'pierna' | 'core';
    exercises: { name: string; sets: ParsedSet[] }[];
  };

  const warnings: string[] = [];
  const exercises: ParsedExercise[] = input.exercises.map((ex) => {
    const match = catalogByName.get(ex.name.toLowerCase());
    if (!match) warnings.push(`No se ha encontrado "${ex.name}" en el catálogo. Revísalo manualmente.`);
    return { name: ex.name, exerciseId: match?.id ?? null, sets: ex.sets };
  });

  return { category: input.category, type: input.type, exercises, warnings };
}

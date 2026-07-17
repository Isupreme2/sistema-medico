import Anthropic from '@anthropic-ai/sdk';
import { User } from '../../models/user.model';
import { UserRole } from '../../constants/roles';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { construirContexto } from './aiAnalysis.context';

export type NivelRiesgo = 'bajo' | 'medio' | 'alto';
export type AnalysisEstado = 'ok' | 'datos_insuficientes' | 'error';

export interface CategoriaRiesgo {
  nombre: string;
  probabilidad: number; // 0-100
  nivel: NivelRiesgo;
  justificacion: string;
}

export interface AiAnalysisResult {
  pacienteId: string;
  generadoEn: string;
  modo: 'ia' | 'demo';
  modelo: string;
  estado: AnalysisEstado;
  categorias: CategoriaRiesgo[];
  resumen: string;
  recomendaciones: string[];
  senalesAlarma: string[];
  disclaimer: string;
}

const DISCLAIMER =
  'Este análisis es un apoyo generado por IA a partir del historial del paciente. ' +
  'NO constituye un diagnóstico médico. La decisión clínica es responsabilidad del profesional tratante.';

/** ¿Hay credenciales para el modo real? Si no, se usa el modo demo. */
export function aiMode(): 'ia' | 'demo' {
  return env.ANTHROPIC_API_KEY ? 'ia' : 'demo';
}

const SYSTEM_PROMPT = `Eres un asistente clínico de apoyo a la decisión para un médico en Perú. \
Analizas la historia longitudinal de un paciente (motivos de sus citas a lo largo del tiempo, \
diagnósticos, signos vitales, tratamientos y recetas) y estimas riesgos clínicos de forma \
probabilística para orientar al médico. NUNCA emites un diagnóstico definitivo: das apoyo. \
Escribe en español, con lenguaje clínico claro y prudente. \
Devuelve porcentajes (0-100) por cada categoría de riesgo relevante que identifiques \
(por ejemplo cardiovascular, metabólico, respiratorio, u otras que la evidencia sugiera), \
con una justificación breve basada en los datos del paciente. \
Incluye un resumen ejecutivo, recomendaciones accionables para el médico y señales de alarma a vigilar. \
Si los datos son escasos, dilo explícitamente y sé conservador en los porcentajes.`;

/** Esquema de salida estructurada (JSON Schema soportado por structured outputs). */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    categorias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          probabilidad: { type: 'integer', description: 'Probabilidad estimada 0-100' },
          nivel: { type: 'string', enum: ['bajo', 'medio', 'alto'] },
          justificacion: { type: 'string' },
        },
        required: ['nombre', 'probabilidad', 'nivel', 'justificacion'],
        additionalProperties: false,
      },
    },
    resumen: { type: 'string' },
    recomendaciones: { type: 'array', items: { type: 'string' } },
    senalesAlarma: { type: 'array', items: { type: 'string' } },
  },
  required: ['categorias', 'resumen', 'recomendaciones', 'senalesAlarma'],
  additionalProperties: false,
} as const;

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  if (!cliente) cliente = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cliente;
}

/**
 * Genera un análisis clínico asistido por IA para un paciente. Solo médico o
 * admin. En modo demo (sin API key) devuelve un análisis simulado y etiquetado.
 */
export async function analizarPaciente(
  pacienteId: string,
  requester: AccessTokenPayload,
): Promise<AiAnalysisResult> {
  if (requester.role !== UserRole.MEDICO && requester.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Solo el personal clínico puede solicitar este análisis');
  }
  const paciente = await User.findById(pacienteId);
  if (!paciente || paciente.rol !== UserRole.PACIENTE) {
    throw AppError.notFound('Paciente no encontrado');
  }

  const contexto = await construirContexto(pacienteId);
  const base = {
    pacienteId,
    generadoEn: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };

  if (!contexto || contexto.totalConsultas < 1) {
    return {
      ...base,
      modo: aiMode(),
      modelo: aiMode() === 'ia' ? env.ANTHROPIC_MODEL : 'demo',
      estado: 'datos_insuficientes',
      categorias: [],
      resumen: 'No hay consultas registradas suficientes para un análisis.',
      recomendaciones: [],
      senalesAlarma: [],
    };
  }

  // --- Modo demo: sin API key, análisis simulado y claramente etiquetado ---
  if (aiMode() === 'demo') {
    return {
      ...base,
      modo: 'demo',
      modelo: 'demo',
      estado: 'ok',
      categorias: [
        {
          nombre: 'Ejemplo (modo demostración)',
          probabilidad: 40,
          nivel: 'medio',
          justificacion:
            `Análisis simulado sobre ${contexto.totalConsultas} consulta(s). ` +
            'Configura ANTHROPIC_API_KEY para obtener el análisis real de la IA.',
        },
      ],
      resumen:
        'Modo demostración: no hay API de IA configurada. Este texto es de ejemplo y no ' +
        'refleja un análisis real del paciente.',
      recomendaciones: ['Configurar la clave de API de Claude para habilitar el análisis real.'],
      senalesAlarma: [],
    };
  }

  // --- Modo IA: llamada real a Claude con salida estructurada ---
  try {
    const msg = await getCliente().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            'Analiza la siguiente historia clínica y responde en el formato JSON indicado.\n\n' +
            contexto.texto,
        },
      ],
    });

    if (msg.stop_reason === 'refusal') {
      logger.warn('El modelo rehusó el análisis clínico');
      return { ...base, modo: 'ia', modelo: env.ANTHROPIC_MODEL, estado: 'error', categorias: [], resumen: 'El modelo no pudo procesar esta solicitud.', recomendaciones: [], senalesAlarma: [] };
    }

    const texto = msg.content.find((b) => b.type === 'text');
    const parsed = JSON.parse((texto as { text: string }).text) as {
      categorias: CategoriaRiesgo[];
      resumen: string;
      recomendaciones: string[];
      senalesAlarma: string[];
    };

    return {
      ...base,
      modo: 'ia',
      modelo: env.ANTHROPIC_MODEL,
      estado: 'ok',
      categorias: (parsed.categorias ?? []).map((c) => ({
        nombre: c.nombre,
        probabilidad: clampPct(c.probabilidad),
        nivel: c.nivel,
        justificacion: c.justificacion,
      })),
      resumen: parsed.resumen ?? '',
      recomendaciones: parsed.recomendaciones ?? [],
      senalesAlarma: parsed.senalesAlarma ?? [],
    };
  } catch (err) {
    logger.error('Fallo el análisis con IA:', err);
    return {
      ...base,
      modo: 'ia',
      modelo: env.ANTHROPIC_MODEL,
      estado: 'error',
      categorias: [],
      resumen: 'No se pudo completar el análisis con IA en este momento.',
      recomendaciones: [],
      senalesAlarma: [],
    };
  }
}

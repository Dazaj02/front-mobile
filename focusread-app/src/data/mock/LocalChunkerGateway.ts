import type { ArticleWithDoses, ProcessArticleRequest, ProcessArticleResponse } from '../../domain/contract';
import { ProcessArticleRequestSchema } from '../../domain/contract';
import { ChunkError, chunkText, normalizeText } from '../../domain/chunker';
import type { AIGateway, ByokProviderId, ProviderInfo, UsageInfo } from '../../domain/ports';
import { AppError } from '../../lib/errors';
import { newId } from '../../lib/ids';

export interface ArticleSaver {
  save(article: ArticleWithDoses): Promise<void>;
}

export interface LocalChunkerGatewayOptions {
  articles: ArticleSaver;
  idGen?: () => string;
  now?: () => Date;
}

export const URL_NEEDS_SERVER_MESSAGE = 'La importación de enlaces requiere conexión con el servidor';
const MIN_TEXT_CHARS = 300;
const MAX_TEXT_CHARS = 50_000;
const TITLE_WORDS = 8;

export function titleFromText(text: string): string {
  const words = normalizeText(text).split(/\s+/).slice(0, TITLE_WORDS);
  const raw = words.join(' ').replace(/[\s.,;:!?…-]+$/, '');
  return (raw.charAt(0).toUpperCase() + raw.slice(1)).slice(0, 300) || 'Texto sin título';
}

// Gateway del modo mock: fragmenta texto localmente. NUNCA inventa contenido:
// sin resumen (summaryPoints = []), sin quiz, y los enlaces se rechazan.
export class LocalChunkerGateway implements AIGateway {
  private readonly idGen: () => string;
  private readonly now: () => Date;

  constructor(private readonly options: LocalChunkerGatewayOptions) {
    this.idGen = options.idGen ?? newId;
    this.now = options.now ?? (() => new Date());
  }

  // Lista fija para poder mostrar y probar la pantalla "Motor de IA" sin servidor.
  // Los proveedores con key propia solo funcionan con el servidor (live).
  async listProviders(): Promise<ProviderInfo[]> {
    const byok: [ProviderInfo['id'], string][] = [
      ['deepseek', 'DeepSeek'],
      ['openai', 'OpenAI'],
      ['gemini', 'Google Gemini'],
      ['openrouter', 'OpenRouter'],
      ['groq', 'Groq'],
    ];
    return [
      {
        id: 'focusread',
        name: 'FocusRead (incluido)',
        requiresUserKey: false,
        models: [{ id: 'local', label: 'Fragmentador local' }],
        defaultModel: 'local',
      },
      ...byok.map(([id, name]) => ({
        id,
        name,
        requiresUserKey: true,
        models: [{ id: 'default', label: 'Modelo por defecto' }],
        defaultModel: 'default',
      })),
    ];
  }

  async testProvider(_provider: ByokProviderId, _model: string | undefined, _key: string): Promise<void> {
    throw new AppError('PROVIDER_UNAVAILABLE', 'Disponible con el servidor');
  }

  async usage(): Promise<UsageInfo> {
    return { used: 0, limit: 0, resetsAt: new Date(this.now().getTime() + 86_400_000).toISOString() };
  }

  async process(req: ProcessArticleRequest): Promise<ProcessArticleResponse> {
    if (req.provider && req.provider !== 'focusread') {
      throw new AppError('PROVIDER_UNAVAILABLE', 'Los proveedores con key propia requieren el servidor');
    }
    if (req.source.type === 'url') {
      throw new AppError('URL_FETCH_FAILED', URL_NEEDS_SERVER_MESSAGE);
    }
    const text = req.source.text;
    if (text.trim().length < MIN_TEXT_CHARS) {
      throw new AppError('CONTENT_TOO_SHORT', `El texto debe tener al menos ${MIN_TEXT_CHARS} caracteres`);
    }
    if (text.length > MAX_TEXT_CHARS) {
      throw new AppError('CONTENT_TOO_LONG', `El texto no puede superar ${MAX_TEXT_CHARS} caracteres`);
    }
    const parsed = ProcessArticleRequestSchema.safeParse(req);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'La solicitud no es válida', { cause: parsed.error });
    const { targetDoseMinutes } = parsed.data;

    let chunks;
    try {
      chunks = chunkText(text, targetDoseMinutes);
    } catch (e) {
      if (e instanceof ChunkError) {
        throw new AppError(e.code === 'CONTENT_TOO_LONG' ? 'CONTENT_TOO_LONG' : 'CONTENT_TOO_SHORT', e.message, { cause: e });
      }
      throw e;
    }

    const articleId = this.idGen();
    const doses = chunks.map((c, position) => ({
      id: this.idGen(),
      articleId,
      position,
      title: null,
      content: c.content,
      estMinutes: c.estMinutes,
      quiz: null,
    }));
    const article: ArticleWithDoses = {
      id: articleId,
      title: req.source.title?.trim() || titleFromText(text),
      category: null,
      sourceType: 'text',
      sourceUrl: null,
      summaryPoints: [],
      totalMinutes: Math.round(doses.reduce((n, d) => n + d.estMinutes, 0) * 10) / 10,
      doseCount: doses.length,
      bookmarked: false,
      aiProvider: null,
      aiModel: null,
      createdAt: this.now().toISOString(),
      doses,
    };
    await this.options.articles.save(article);
    return { article, warnings: [] };
  }
}

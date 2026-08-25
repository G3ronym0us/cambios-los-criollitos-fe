import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import type {
  AnalysisOutput,
  AnalysisPage,
  AnalysisQuery,
  AnalysisStats,
} from '@/types/analysis';

export class AnalysisService {
  // El listado que se revisa: qué leyó el bot y qué dedujo, del más reciente al más viejo.
  async getAnalyses(query: AnalysisQuery = {}): Promise<ApiResponse<AnalysisPage>> {
    const sp = new URLSearchParams();
    sp.set('days', String(query.days ?? 7));
    sp.set('limit', String(query.limit ?? 100));
    sp.set('skip', String(query.skip ?? 0));
    if (query.onlyPending) sp.set('only_pending', 'true');
    if (query.untracked !== undefined) sp.set('untracked', String(query.untracked));
    if (query.phone) sp.set('phone', query.phone);
    if (query.search) sp.set('search', query.search);
    const result = await httpClient.get<AnalysisPage>(`/analyses?${sp.toString()}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async getStats(days = 7): Promise<ApiResponse<AnalysisStats>> {
    const result = await httpClient.get<AnalysisStats>(`/analyses/stats?days=${days}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // El mismo resumen que sale por WhatsApp una vez al día, bajo demanda.
  async getDigest(hours = 24): Promise<ApiResponse<{ hours: number; text: string | null }>> {
    const result = await httpClient.get<{ hours: number; text: string | null }>(
      `/analyses/digest?hours=${hours}`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // La lectura correcta, a mano, para los casos que el join con la operación no resuelve.
  async setLabel(uuid: string, label: AnalysisOutput): Promise<ApiResponse<unknown>> {
    const result = await httpClient.patch<unknown>(`/analyses/${uuid}/label`, {
      label,
      source: 'manual',
    });
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const analysisService = new AnalysisService();

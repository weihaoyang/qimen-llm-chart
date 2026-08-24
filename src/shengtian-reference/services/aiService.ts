import { BattlefieldState, CardAsset, AsymmetricStrategyPackage, InterviewMessage, AnonymousCaseStudy } from '../types';
import { sessionApi } from '../session/api';

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
export const resolveJob = async (battleId: string, initial: unknown) => {
  if (!initial || typeof initial !== 'object') return initial;
  const job = initial as Record<string, unknown>;
  const jobId = typeof job.jobId === 'string' ? job.jobId : typeof job.id === 'string' ? job.id : null;
  if (!jobId) return initial;
  let current = job;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = current.status;
    if (status === 'succeeded' || status === 'failed' || status === 'timed_out') {
      if (status !== 'succeeded') throw new Error(typeof current.errorMessage === 'string' ? current.errorMessage : 'AI 任务未完成。');
      return current.result;
    }
    await wait(500);
    current = (await sessionApi.aiJob(battleId, jobId)).job;
  }
  throw new Error('AI 任务等待超时，请稍后从战局恢复。');
};

export interface RedTeamResponse {
  critique: string;
  biasWarning?: string;
  failureProbability: number;
  fatalVulnerability: string;
  suggestedFocus: string;
}

export class TacticalAIService {
  public static async generateCaseStudyReview(battleId: string, caseStudy: AnonymousCaseStudy, choiceId: string): Promise<Record<string, unknown>> {
    const choice = caseStudy.choices.find((item) => item.id === choiceId);
    const response = await fetch(`/api/battles/${battleId}/ai/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `case-study:${battleId}:${caseStudy.id}:${choiceId}` },
      body: JSON.stringify({
        idempotencyKey: `case-study:${battleId}:${caseStudy.id}:${choiceId}`,
        question: `请对官方匿名案例“${caseStudy.title}”进行用户选择复盘。用户选择：${choice?.name ?? choiceId}。案例困境：${caseStudy.coreDilemma}。严格返回 review JSON。`,
        caseStudy: { id: caseStudy.id, title: caseStudy.title, dilemma: caseStudy.coreDilemma, choice },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `案例复盘请求失败（${response.status}）`);
    const result = await resolveJob(battleId, data.job);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('案例复盘没有返回结构化结果。');
    return result as Record<string, unknown>;
  }

  public static async answerInterview(
    history: InterviewMessage[],
    userReply: string,
    currentBattle: Partial<BattlefieldState>
  ): Promise<{ text: string; parameterExtracted?: { key: string; label: string; value: string | number } }> {
    try {
      const response = await fetch(`/api/battles/${currentBattle.id}/ai/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userReply,
          history: history.map((item) => ({ role: item.sender === 'ai' ? 'assistant' : 'user', content: item.text }))
        })
      });
      if (!response.ok) throw new Error(`采访服务请求失败（${response.status}）`);
      const data = await response.json();
      const rawResult = await resolveJob(String(currentBattle.id), data.job);
      const rawText = typeof rawResult === 'object' && rawResult ? String((rawResult as { assistantMessage?: unknown; summary?: unknown }).assistantMessage ?? (rawResult as { summary?: unknown }).summary ?? JSON.stringify(rawResult)) : String(rawResult ?? data.analysis ?? data.text ?? '');
      
      let text = rawText;
      let parameterExtracted = undefined;

      if (rawText.includes('[PARAMETER_EXTRACTED]')) {
        const parts = rawText.split('[PARAMETER_EXTRACTED]');
        text = parts[0].replace('[RESPONSE]', '').trim();
        const paramMatch = parts[1].trim().match(/^([^:]+):([^:]+):(.+)$/m);
        if (paramMatch) {
          parameterExtracted = {
            key: paramMatch[1].trim(),
            label: paramMatch[2].trim(),
            value: paramMatch[3].trim()
          };
        }
      } else {
        text = text.replace('[RESPONSE]', '').trim();
      }

      return { text, parameterExtracted };
    } catch (e) {
      console.error(e);
      throw e instanceof Error ? e : new Error('采访服务暂时不可用，请重试。');
    }
  }

  public static async generateRedTeamAttack(
    userPlan: string,
    battlefield: BattlefieldState
  ): Promise<RedTeamResponse> {
    try {
      const response = await fetch(`/api/battles/${battlefield.id}/red-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `作为红队审查官攻击以下策略，并严格返回 JSON：${userPlan}`
        })
      });
      if (!response.ok) throw new Error(`红队服务请求失败（${response.status}）`);
      const data = await response.json();
      const result = await resolveJob(String(battlefield.id), data.job);
      const text = JSON.stringify(result ?? data.analysis ?? data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (e) {
      throw e instanceof Error ? e : new Error('红队服务暂时不可用，请重试。');
    }
  }

  public static async generateFatalQuestion(strategyName: string, battlefield: BattlefieldState): Promise<string> {
    try {
      const response = await fetch(`/api/battles/${battlefield.id}/ai/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `请针对策略“${strategyName}”提出一个致命且具体的单句问题。` })
      });
      if (!response.ok) throw new Error(`致命问题服务请求失败（${response.status}）`);
      const data = await response.json();
      const result = await resolveJob(String(battlefield.id), data.job);
      return String(typeof result === 'string' ? result : result ? (result as { summary?: unknown }).summary ?? JSON.stringify(result) : data.analysis || data.text || '').trim();
    } catch (e) {
      throw e instanceof Error ? e : new Error('致命问题服务暂时不可用，请重试。');
    }
  }
}

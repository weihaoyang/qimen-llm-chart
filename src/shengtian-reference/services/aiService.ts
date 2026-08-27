import { BattlefieldState, CardAsset, AsymmetricStrategyPackage, InterviewMessage, AnonymousCaseStudy } from '../types';
import { sessionApi } from '../session/api';

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const asJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

/** Extract the one user-visible question from the interview contract.
 *
 * The fatal-question affordance deliberately reuses the audited interview
 * job. It must therefore understand its full structured result instead of
 * expecting the model to return an ad-hoc text or summary field.
 */
export const fatalQuestionFromInterviewResult = (value: unknown): string | null => {
  const result = asJsonObject(value);
  if (!result) return typeof value === 'string' && value.trim() ? value.trim() : null;
  for (const key of ['assistantMessage', 'nextQuestion', 'summary'] as const) {
    const candidate = result[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
};

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
  ): Promise<{ text: string; parameterExtracted?: { key: string; label: string; value: string | number }; extractedFacts?: Array<{ kind: 'fact'|'assumption'|'unknown'|'goal'|'emotion'; content: string; confidence: number }>; extractedConstraints?: Array<{ kind: string; label: string; description: string; hard: boolean; severity: number }> }> {
    try {
      const battleId = String(currentBattle.id ?? '');
      const historyFingerprint = history.map((item) => `${item.sender}:${item.text.trim()}`).join('|').slice(-800);
      const idempotencyKey = `interview:${battleId}:${historyFingerprint}:${userReply.trim().slice(0, 240)}`;
      const response = await fetch(`/api/battles/${currentBattle.id}/ai/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          idempotencyKey,
          question: userReply,
          history: history.map((item) => ({ role: item.sender === 'ai' ? 'assistant' : 'user', content: item.text }))
        })
      });
      if (!response.ok) throw new Error(`采访服务请求失败（${response.status}）`);
      const data = await response.json();
      const rawResult = await resolveJob(String(currentBattle.id), data.job);
      const structured = rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult) ? rawResult as Record<string, unknown> : {};
      const rawText = typeof rawResult === 'object' && rawResult ? String((structured.assistantMessage ?? structured.summary ?? JSON.stringify(rawResult))) : String(rawResult ?? data.analysis ?? data.text ?? '');
      
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

      const extractedFacts = Array.isArray(structured.extractedFacts) ? structured.extractedFacts.flatMap((item) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; const kind = value.kind; const content = typeof value.content === 'string' ? value.content.trim() : ''; const confidence = typeof value.confidence === 'number' ? Math.max(0, Math.min(100, value.confidence)) : 70; return ['fact','assumption','unknown','goal','emotion'].includes(String(kind)) && content ? [{ kind: kind as 'fact'|'assumption'|'unknown'|'goal'|'emotion', content, confidence }] : []; }) : [];
      const extractedConstraints = Array.isArray(structured.extractedConstraints) ? structured.extractedConstraints.flatMap((item) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; const label = typeof value.label === 'string' ? value.label.trim() : ''; const description = typeof value.description === 'string' ? value.description.trim() : ''; return label && description ? [{ kind: typeof value.kind === 'string' ? value.kind : 'other', label, description, hard: value.hard !== false, severity: typeof value.severity === 'number' ? Math.max(1, Math.min(5, value.severity)) : 3 }] : []; }) : [];
      return { text, parameterExtracted, extractedFacts, extractedConstraints };
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
      const idempotencyKey = `red-team:${battlefield.id}:${userPlan.trim().slice(0, 160)}`;
      const response = await fetch(`/api/battles/${battlefield.id}/red-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          idempotencyKey,
          question: `作为红队审查官攻击以下策略，并严格返回 JSON：${userPlan}`
        })
      });
      if (!response.ok) throw new Error(`红队服务请求失败（${response.status}）`);
      const data = await response.json();
      const result = await resolveJob(String(battlefield.id), data.job);
      const text = JSON.stringify(result ?? data.analysis ?? data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text) as RedTeamResponse;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.failureProbability !== 'number') throw new Error('红队结果缺少有效失败概率。');
      return { ...parsed, failureProbability: parsed.failureProbability <= 1 ? parsed.failureProbability * 100 : Math.min(100, parsed.failureProbability) };
    } catch (e) {
      throw e instanceof Error ? e : new Error('红队服务暂时不可用，请重试。');
    }
  }

  public static async generateFatalQuestion(strategyName: string, battlefield: BattlefieldState): Promise<string> {
    try {
      const idempotencyKey = `fatal-question:${battlefield.id}:${strategyName.trim()}`;
      const response = await fetch(`/api/battles/${battlefield.id}/ai/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          idempotencyKey,
          history: [],
          question: `请针对策略“${strategyName}”提出一个致命且具体的单句问题。必须严格返回 interview JSON：assistantMessage 为该问题；extractedFacts、extractedConstraints、updatedFields 均为 []；nextQuestion 为同一问题；confidence 为 0 到 1 的数字。不要返回 Markdown 或其他字段。`,
        })
      });
      if (!response.ok) throw new Error(`致命问题服务请求失败（${response.status}）`);
      const data = await response.json();
      const result = await resolveJob(String(battlefield.id), data.job);
      const question = fatalQuestionFromInterviewResult(result ?? data.analysis ?? data.text);
      if (!question) throw new Error('致命问题服务没有返回 interview 合约中的问题文本。');
      return question;
    } catch (e) {
      throw e instanceof Error ? e : new Error('致命问题服务暂时不可用，请重试。');
    }
  }

  public static async generateReview(
    battlefield: BattlefieldState,
    strategyName: string,
    reflection: string,
    fatalQuestion: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`/api/battles/${battlefield.id}/ai/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: `breakthrough-review:${battlefield.id}:${strategyName.trim()}:${fatalQuestion.trim()}:${reflection.trim().slice(0, 160)}`,
        question: `请复盘战局“${battlefield.title}”中策略“${strategyName}”。致命问题：${fatalQuestion}。用户反思：${reflection}。严格返回 review JSON，并把可执行的决策DNA规律放入 facts 或 nextAdjustment。`,
        review: { strategyName, fatalQuestion, reflection },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `复盘请求失败（${response.status}）`);
    const result = await resolveJob(battlefield.id, data.job);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('复盘没有返回结构化结果。');
    return result as Record<string, unknown>;
  }
}

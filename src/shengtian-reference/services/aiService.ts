import { BattlefieldState, CardAsset, AsymmetricStrategyPackage, InterviewMessage } from '../types';

export interface RedTeamResponse {
  critique: string;
  biasWarning?: string;
  failureProbability: number;
  fatalVulnerability: string;
  suggestedFocus: string;
}

export class TacticalAIService {
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
      const data = await response.json();
      const rawResult = data.job && typeof data.job === 'object' ? (data.job as { result?: unknown }).result : undefined;
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
      return { text: "通信线路受到干扰，请重试。" };
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
      const data = await response.json();
      const result = data.job && typeof data.job === 'object' ? (data.job as { result?: unknown }).result : undefined;
      const text = JSON.stringify(result ?? data.analysis ?? data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (e) {
      return {
        critique: "无法连接红队引擎。",
        failureProbability: 99,
        fatalVulnerability: "通信中断",
        suggestedFocus: "恢复系统连接"
      };
    }
  }

  public static async generateFatalQuestion(strategyName: string, battlefield: BattlefieldState): Promise<string> {
    try {
      const response = await fetch(`/api/battles/${battlefield.id}/ai/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `请针对策略“${strategyName}”提出一个致命且具体的单句问题。` })
      });
      const data = await response.json();
      const result = data.job && typeof data.job === 'object' ? (data.job as { result?: unknown }).result : undefined;
      return String(typeof result === 'string' ? result : result ? (result as { summary?: unknown }).summary ?? JSON.stringify(result) : data.analysis || data.text || '').trim();
    } catch (e) {
      return "如果在最坏的假设下，你是否依然能存活？";
    }
  }
}

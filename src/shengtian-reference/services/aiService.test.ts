import { describe, expect, it } from 'vitest';
import { fatalQuestionFromInterviewResult } from './aiService';

describe('fatalQuestionFromInterviewResult', () => {
  it('uses the primary interview message rather than an optional summary', () => {
    expect(fatalQuestionFromInterviewResult({
      assistantMessage: '如果客户拒绝私有化部署，你还能保住什么？',
      nextQuestion: '如果客户拒绝私有化部署，你还能保住什么？',
      summary: '不应优先读取这个摘要。',
    })).toBe('如果客户拒绝私有化部署，你还能保住什么？');
  });

  it('accepts a serialized structured interview result', () => {
    expect(fatalQuestionFromInterviewResult(JSON.stringify({
      assistantMessage: '哪项已验证事实会让这条策略立刻失效？',
      extractedFacts: [],
      extractedConstraints: [],
      updatedFields: [],
      nextQuestion: '哪项已验证事实会让这条策略立刻失效？',
      confidence: 0.8,
    }))).toBe('哪项已验证事实会让这条策略立刻失效？');
  });

  it('does not turn an object without a question into JSON shown to users', () => {
    expect(fatalQuestionFromInterviewResult({ facts: 'only facts' })).toBeNull();
  });
});

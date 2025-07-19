import { GoogleGenAI } from "@google/genai";
import { AgentState } from "../types";
import { translations, Language, TranslationKey } from '../i18n/translations';

let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const t = (key: TranslationKey, lang: Language, params?: Record<string, string | number>): string => {
    let str = translations[lang][key] || translations['en'][key];
    if (params) {
        Object.entries(params).forEach(([pKey, pValue]) => {
            str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pValue));
        });
    }
    return str;
};


export const isGeminiAvailable = (): boolean => {
    return !!ai;
};

const getActionText = (action: number, lang: Language): string => {
    const key = `q_action.${action}` as TranslationKey;
    const translation = t(key, lang);
    return translation || `Action ${action}`;
}

const commonPromptSetup = (agentState: AgentState, language: Language): string => {
    const { id, emotion, drives, currentGoal, discretizedState, qValues, lastAction } = agentState;
    
    const chosenActionText = getActionText(lastAction, language);
    const goalKey = `goal.${currentGoal.replace(/_/g, '-')}` as TranslationKey;
    const translatedGoal = t(goalKey, language);

    return `
**${t('gemini.prompt.agent_data', language)}:**
- **${t('gemini.prompt.agent_id', language)}:** ${id}
- **${t('gemini.prompt.current_goal', language)}:** ${translatedGoal}
- **${t('gemini.prompt.emotions', language)}:** ${t('gemini.prompt.emotions.valence', language)}: ${emotion.valence.toFixed(2)}, ${t('gemini.prompt.emotions.arousal', language)}: ${emotion.arousal.toFixed(2)}, ${t('gemini.prompt.emotions.dominance', language)}: ${emotion.dominance.toFixed(2)}
- **${t('gemini.prompt.drives', language)}:** ${t('gemini.prompt.drives.curiosity', language)}: ${drives.curiosity.toFixed(2)}, ${t('gemini.prompt.drives.frustration', language)}: ${drives.frustration.toFixed(2)}
- **${t('gemini.prompt.state', language)}:** "${discretizedState}"

**${t('gemini.prompt.decision_data', language)}:**
- **${t('gemini.prompt.q_values', language)}:** 
  - ${getActionText(0, language)}: ${qValues[0].toFixed(4)}
  - ${getActionText(1, language)}: ${qValues[1].toFixed(4)}
- **${t('gemini.prompt.action_chosen', language)}:** ${t('gemini.prompt.action_chosen_text', language, {lastAction, actionText: chosenActionText})}
`;
}

export const getExplanation = async (agentState: AgentState, language: Language): Promise<string> => {
    if (!ai) {
        return "Gemini API key is not configured. Please set the API_KEY environment variable.";
    }

    const prompt = `
${t('gemini.prompt.title', language)}
${t('gemini.prompt.intro', language)}

${commonPromptSetup(agentState, language)}
**${t('gemini.prompt.task', language)}:**
${t('gemini.prompt.task_instruction', language)}
${t('gemini.prompt.language_instruction', language, { lang: language === 'de' ? 'German' : 'English' })}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error) {
            return `Failed to get explanation from Gemini: ${error.message}`;
        }
        return "An unknown error occurred while contacting the Gemini API.";
    }
};


export const getCounterfactualExplanation = async (agentState: AgentState, alternativeAction: number, language: Language): Promise<string> => {
    if (!ai) {
        return "Gemini API key is not configured.";
    }

    const alternativeActionText = getActionText(alternativeAction, language);

    const prompt = `
${t('gemini.prompt.counterfactual.title', language)}
${t('gemini.prompt.intro', language)}

${commonPromptSetup(agentState, language)}
**${t('gemini.prompt.counterfactual.task', language)}:**
${t('gemini.prompt.counterfactual.task_instruction', language, { alternativeAction, alternativeActionText })}
${t('gemini.prompt.language_instruction', language, { lang: language === 'de' ? 'German' : 'English' })}
`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Counterfactual API call failed:", error);
        if (error instanceof Error) {
            return `Failed to get explanation from Gemini: ${error.message}`;
        }
        return "An unknown error occurred while contacting the Gemini API.";
    }
}
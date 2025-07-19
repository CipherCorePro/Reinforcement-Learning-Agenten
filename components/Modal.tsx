import React, { useEffect } from 'react';
import clsx from 'clsx';
import { AgentState } from '../types';
import { BrainIcon, QuestionMarkCircleIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';

interface ExplanationState {
    isOpen: boolean;
    isLoading: boolean;
    isCfLoading: boolean;
    content: string;
    cfContent: string;
    agentState: AgentState | null;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    explanation: ExplanationState;
    onCounterfactual: (agentState: AgentState, alternativeAction: number) => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, explanation, onCounterfactual }) => {
    const { t } = useLanguage();
    const { isLoading, isCfLoading, content, cfContent, agentState } = explanation;

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) {
        return null;
    }
    
    const alternativeAction = agentState ? 1 - agentState.lastAction : -1;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={clsx(
                    'bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl transform transition-all',
                    isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-cyan-400">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="max-h-[80vh] overflow-y-auto">
                    {children}

                    {!isLoading && content && agentState && (
                        <div className="p-4 border-t border-gray-700/50">
                            <h3 className="text-md font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                <QuestionMarkCircleIcon className="w-5 h-5"/>
                                {t('modal.counterfactual_title')}
                            </h3>
                            {cfContent ? (
                                <div className="p-3 bg-gray-900/50 rounded-md text-gray-300 whitespace-pre-wrap">{cfContent}</div>
                            ) : isCfLoading ? (
                                <div className="flex items-center justify-center gap-2 p-4">
                                    <BrainIcon className="w-6 h-6 animate-pulse text-yellow-400" />
                                    <span className="text-gray-300">{t('modal.loading_cf')}</span>
                                </div>
                            ) : (
                                 <button
                                    onClick={() => onCounterfactual(agentState, alternativeAction)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-yellow-600/20 border border-yellow-600/50 hover:bg-yellow-600/40 text-sm font-semibold text-yellow-200 transition-all duration-200"
                                >
                                    <span>{t('modal.counterfactual_button', { action: alternativeAction })}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
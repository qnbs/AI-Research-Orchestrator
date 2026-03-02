import React, { useState, useEffect } from 'react';
import { saveApiKey, getApiKey, removeApiKey, hasApiKey, validateApiKeyFormat } from '../../services/apiKeyService';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { EyeSlashIcon } from '../icons/EyeSlashIcon';
import { KeyIcon } from '../icons/KeyIcon';

interface ApiKeySettingsProps {
    onKeyChange?: (hasKey: boolean) => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onKeyChange }) => {
    const [apiKey, setApiKey] = useState('');
    const [hasStoredKey, setHasStoredKey] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        checkStoredKey();
    }, []);

    const checkStoredKey = async () => {
        setIsLoading(true);
        try {
            const stored = await hasApiKey();
            setHasStoredKey(stored);
            onKeyChange?.(stored);
        } catch (err) {
            console.error('Error checking API key:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(null);

        if (!apiKey.trim()) {
            setError('Bitte geben Sie einen API-Key ein.');
            return;
        }

        if (!validateApiKeyFormat(apiKey.trim())) {
            setError('Der API-Key hat ein ungültiges Format. Gemini API-Keys beginnen mit "AIza" und sind 39 Zeichen lang.');
            return;
        }

        setIsSaving(true);
        try {
            await saveApiKey(apiKey.trim());
            setHasStoredKey(true);
            setApiKey('');
            setSuccess('API-Key wurde sicher gespeichert.');
            onKeyChange?.(true);
        } catch (err) {
            setError('Fehler beim Speichern des API-Keys.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        setIsSaving(true);
        try {
            await removeApiKey();
            setHasStoredKey(false);
            setSuccess('API-Key wurde entfernt.');
            onKeyChange?.(false);
        } catch (err) {
            setError('Fehler beim Entfernen des API-Keys.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleShowCurrentKey = async () => {
        try {
            const key = await getApiKey();
            if (key) {
                setApiKey(key);
                setShowKey(true);
            }
        } catch (err) {
            setError('Fehler beim Abrufen des API-Keys.');
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-4 bg-border rounded w-1/3"></div>
                <div className="h-10 bg-border rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Security Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-amber-500 mb-1">Sicherheitshinweis</p>
                        <p className="text-text-secondary">
                            Ihr API-Key wird <strong>verschlüsselt</strong> in Ihrem Browser gespeichert und niemals an unsere Server gesendet. 
                            Die Kommunikation erfolgt direkt zwischen Ihrem Browser und der Google Gemini API.
                        </p>
                        <p className="text-text-secondary mt-2">
                            <strong>Empfehlung:</strong> Beschränken Sie Ihren API-Key in der{' '}
                            <a 
                                href="https://aistudio.google.com/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-brand-accent hover:underline"
                            >
                                Google AI Studio Console
                            </a>
                            {' '}auf diese Domain für zusätzliche Sicherheit.
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-hover/30">
                {hasStoredKey ? (
                    <>
                        <ShieldCheckIcon className="h-6 w-6 text-green-500" />
                        <div className="flex-1">
                            <p className="font-medium text-text-primary">API-Key konfiguriert</p>
                            <p className="text-sm text-text-secondary">Ihr Gemini API-Key ist sicher gespeichert und einsatzbereit.</p>
                        </div>
                        <button
                            onClick={handleShowCurrentKey}
                            className="text-sm text-brand-accent hover:underline"
                        >
                            Anzeigen
                        </button>
                    </>
                ) : (
                    <>
                        <KeyIcon className="h-6 w-6 text-text-secondary" />
                        <div className="flex-1">
                            <p className="font-medium text-text-primary">Kein API-Key konfiguriert</p>
                            <p className="text-sm text-text-secondary">
                                Bitte geben Sie Ihren{' '}
                                <a 
                                    href="https://aistudio.google.com/apikey" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-brand-accent hover:underline"
                                >
                                    Gemini API-Key
                                </a>
                                {' '}ein, um die KI-Funktionen zu nutzen.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Input Form */}
            <div className="space-y-3">
                <label htmlFor="api-key-input" className="block font-medium text-text-primary">
                    {hasStoredKey ? 'API-Key aktualisieren' : 'API-Key eingeben'}
                </label>
                <div className="relative">
                    <input
                        id="api-key-input"
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                            setError(null);
                            setSuccess(null);
                        }}
                        placeholder="AIza..."
                        className="w-full bg-input-bg border border-border rounded-lg px-4 py-3 pr-20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={showKey ? 'Key verbergen' : 'Key anzeigen'}
                    >
                        {showKey ? (
                            <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                            <EyeIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>
                
                {/* Error/Success Messages */}
                {error && (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        {error}
                    </p>
                )}
                {success && (
                    <p className="text-sm text-green-400 flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4" />
                        {success}
                    </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !apiKey.trim()}
                        className="flex-1 px-4 py-2.5 bg-brand-accent text-brand-text-on-accent font-medium rounded-lg hover:bg-brand-accent/90 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSaving ? 'Speichern...' : 'Speichern'}
                    </button>
                    {hasStoredKey && (
                        <button
                            onClick={handleRemove}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Entfernen
                        </button>
                    )}
                </div>
            </div>

            {/* Help Text */}
            <div className="text-sm text-text-secondary border-t border-border pt-4 space-y-2">
                <p><strong>So erhalten Sie einen API-Key:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Besuchen Sie <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Google AI Studio</a></li>
                    <li>Melden Sie sich mit Ihrem Google-Konto an</li>
                    <li>Klicken Sie auf "Get API key" → "Create API key"</li>
                    <li>Kopieren Sie den generierten Key und fügen Sie ihn hier ein</li>
                </ol>
                <p className="mt-3 text-xs text-text-secondary/70">
                    Die Nutzung der Gemini API kann Kosten verursachen. Überwachen Sie Ihre Nutzung in der Google Cloud Console.
                </p>
            </div>
        </div>
    );
};

export default ApiKeySettings;

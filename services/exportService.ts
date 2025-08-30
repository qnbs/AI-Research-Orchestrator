import { AggregatedArticle, ResearchReport, Settings, KnowledgeBaseEntry } from '../types';

// --- Web Worker Communication ---

let exportWorker: Worker | null = null;

function getExportWorker(): Worker {
    if (!exportWorker) {
        exportWorker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
    }
    return exportWorker;
}

async function performExport(type: string, payload: any): Promise<{ blob: Blob, filename: string }> {
    return new Promise((resolve, reject) => {
        const worker = getExportWorker();

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SUCCESS') {
                resolve({ blob: event.data.blob, filename: event.data.filename });
                cleanup();
            } else if (event.data.type === 'ERROR') {
                reject(new Error(event.data.error));
                cleanup();
            }
        };

        const handleError = (error: ErrorEvent) => {
            reject(new Error(`Export worker error: ${error.message}`));
            cleanup();
        };
        
        const cleanup = () => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
        }

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({ type, payload });
    });
}

function triggerDownload(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// --- Export Trigger Functions ---

export const exportToPdf = async (report: ResearchReport, input: any, settings: Settings['export']['pdf']): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_PDF_REPORT', { report, input, settings });
    triggerDownload(blob, filename);
};

export const exportKnowledgeBaseToPdf = async (
    articlesToExport: AggregatedArticle[], 
    title: string,
    findRelatedInsights: (pmid: string) => { question: string, answer: string, supportingArticles: string[] }[],
    settings: Settings['export']['pdf']
): Promise<void> => {
    // Functions cannot be cloned to a worker. We need to serialize it.
    const findRelatedInsightsFnStr = findRelatedInsights.toString();
    const { blob, filename } = await performExport('EXPORT_PDF_KB', { 
        articles: articlesToExport, 
        title, 
        findRelatedInsightsFnStr, 
        settings 
    });
    triggerDownload(blob, filename);
};

export const exportToCsv = async (articlesToExport: AggregatedArticle[], topic: string, settings: Settings['export']['csv']): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_CSV', { articles: articlesToExport, topic, settings });
    triggerDownload(blob, filename);
};

export const exportInsightsToCsv = async (insights: ResearchReport['aiGeneratedInsights'], topic: string): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_INSIGHTS_CSV', { insights, topic });
    triggerDownload(blob, filename);
};

export const exportCitations = async (
    articles: AggregatedArticle[], 
    format: 'bib' | 'ris', 
    settings: Settings['export']['citation']
): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_CITATIONS', { articles, format, settings });
    triggerDownload(blob, filename);
};

// --- JSON Export with Metadata ---

export const exportHistoryToJson = async (entries: KnowledgeBaseEntry[]): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_JSON_HISTORY', { entries });
    triggerDownload(blob, filename);
};

export const exportKnowledgeBaseToJson = async (articles: AggregatedArticle[]): Promise<void> => {
    const { blob, filename } = await performExport('EXPORT_JSON_KB', { articles });
    triggerDownload(blob, filename);
};

export const exportCompleteBackup = async (settings: Settings, presets: any[], knowledgeBase: KnowledgeBaseEntry[]): Promise<void> => {
     const data = {
        settings,
        presets,
        knowledgeBase,
    };
    const { blob, filename } = await performExport('EXPORT_JSON_COMPLETE', { data });
    triggerDownload(blob, filename);
};
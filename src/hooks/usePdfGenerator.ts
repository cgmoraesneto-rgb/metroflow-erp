import { useState, useCallback, useRef } from 'react';
import { generateCertificatePdf } from '../utils/pdfGenerator';
import { CalibrationRecord, Client, Procedure, StandardInstrument, CertificateMask } from '../types';
import { toast } from 'sonner';

export type PdfGenerationState = 'idle' | 'generating' | 'ready';

interface UsePdfGeneratorResult {
  pdfState: PdfGenerationState;
  previewUrl: string | null;
  generate: (
    record: CalibrationRecord,
    client: Client | undefined,
    procedures: Procedure[],
    standardInstruments: StandardInstrument[],
    certificateMasks: CertificateMask[],
    employees?: any[],
    preview?: boolean,
    isInternalMemory?: boolean,
    documentTemplates?: any[]
  ) => void;
  reset: () => void;
}

/**
 * ISO 17025 Async PDF hook
 * Wraps generateCertificatePdf in a non-blocking state machine to
 * prevent UI freeze during large PDF generation.
 *
 * States:
 *  idle       — no generation in progress, no URL ready
 *  generating — spinner/progress shown; UI remains responsive
 *  ready      — URL is available for preview or download
 */
export function usePdfGenerator(): UsePdfGeneratorResult {
  const [pdfState, setPdfState] = useState<PdfGenerationState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setPdfState('idle');
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [previewUrl]);

  const generate = useCallback((
    record: CalibrationRecord,
    client: Client | undefined,
    procedures: Procedure[],
    standardInstruments: StandardInstrument[],
    certificateMasks: CertificateMask[],
    employees: any[] = [],
    preview: boolean = true,
    isInternalMemory: boolean = false,
    documentTemplates: any[] = []
  ) => {
    // Clean up old blob
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPdfState('generating');

    // Defer generation to the next event loop tick so spinner renders first
    timerRef.current = setTimeout(async () => {
      try {
        const result = await generateCertificatePdf(
          record, 
          client, 
          procedures, 
          standardInstruments, 
          certificateMasks, 
          employees, 
          preview, 
          isInternalMemory, 
          documentTemplates
        );
        if (typeof result === 'string') {
          setPreviewUrl(result);
          setPdfState('ready');
        } else {
          setPdfState('idle');
        }
      } catch (err) {
        console.error('PDF generation error:', err);
        toast.error('Erro ao gerar PDF. Verifique os dados do registro.');
        setPdfState('idle');
      }
    }, 80); // Small delay is enough to flush React state and render spinner
  }, [previewUrl]);

  return { pdfState, previewUrl, generate, reset };
}

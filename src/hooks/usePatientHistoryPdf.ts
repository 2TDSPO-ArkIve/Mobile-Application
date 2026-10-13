import { useCallback, useRef, useState } from 'react';
import { downloadPatientHistoryPdf, buildPatientHistoryPdfFilename } from '../services/patientHistoryService';
import { describePatientHistoryPdfError } from '../utils/errorMessages';
import { sharePdfBytes } from '../utils/pdfHandoff';

/**
 * Mirrors `useConsultaResumoPdf` exactly (same authenticated-fetch ->
 * platform-hand-off shape, via the shared `sharePdfBytes`) — kept as its own
 * small hook rather than a generalized "any PDF" hook, since the two fetch
 * from different services/error-mapping functions and there's nothing else
 * to meaningfully share beyond the hand-off step already extracted.
 */
export function usePatientHistoryPdf(animalId: number, animalNome?: string | null) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const share = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsPending(true);
    setErrorMessage(null);

    try {
      const { bytes } = await downloadPatientHistoryPdf(animalId);
      const filename = buildPatientHistoryPdfFilename(animalId, animalNome);
      await sharePdfBytes(bytes, filename);
    } catch (err) {
      setErrorMessage(describePatientHistoryPdfError(err));
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  }, [animalId, animalNome]);

  return { share, isPending, errorMessage };
}

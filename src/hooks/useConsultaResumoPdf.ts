import { useCallback, useRef, useState } from 'react';
import { downloadConsultaResumoPdf, buildConsultaPdfFilename } from '../services/consultaPdfService';
import { describeConsultaPdfError } from '../utils/errorMessages';
import { sharePdfBytes } from '../utils/pdfHandoff';

/**
 * Owns the whole "share/download the owner-facing PDF" action end to end:
 * authenticated fetch -> platform-appropriate hand-off (native share sheet /
 * web browser download, via the shared `sharePdfBytes`). Nothing here ever
 * persists the bytes beyond that — matching the backend's own
 * `Cache-Control: no-store` on this endpoint.
 */
export function useConsultaResumoPdf(consultaId: number, animalNome?: string | null) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Guards against a double-tap starting a second fetch/share while the
  // first is still in flight — `isPending` alone can lag one render behind
  // a rapid second tap, this ref cannot.
  const inFlightRef = useRef(false);

  const share = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsPending(true);
    setErrorMessage(null);

    try {
      const { bytes } = await downloadConsultaResumoPdf(consultaId);
      const filename = buildConsultaPdfFilename(consultaId, animalNome);
      await sharePdfBytes(bytes, filename);
    } catch (err) {
      setErrorMessage(describeConsultaPdfError(err));
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  }, [consultaId, animalNome]);

  return { share, isPending, errorMessage };
}

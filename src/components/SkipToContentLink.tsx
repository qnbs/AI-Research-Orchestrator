import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const MAIN_CONTENT_ID = 'main-content';

/**
 * WS-F: first Tab stop — jump past fixed chrome into `#main-content`.
 * Uses preventDefault so hash-based view routing (`#orchestrator`, …) is not overwritten.
 */
export const SkipToContentLink: React.FC<
  React.ComponentPropsWithoutRef<'a'> & { inert?: boolean }
> = ({ inert, onClick, ...rest }) => {
  const { t } = useTranslation();

  const handleActivate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;
    main.focus({ preventScroll: false });
    onClick?.(event);
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="skip-to-content focus-ring-aa"
      onClick={handleActivate}
      inert={inert}
      {...rest}
    >
      {t('a11y.skip_to_content')}
    </a>
  );
};

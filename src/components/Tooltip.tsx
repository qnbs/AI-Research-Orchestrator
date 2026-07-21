import React, { useState, useId } from 'react';
import { InfoIcon } from './icons/InfoIcon';
import { XIcon } from './icons/XIcon';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{
    'aria-describedby'?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    tabIndex?: number;
    children?: React.ReactNode;
  }>;
  detailedContent?: React.ReactNode;
}

// True if at least one immediate child contributes to the accessible-name computation on its
// own (non-empty text, or an element that isn't aria-hidden) — i.e. the trigger doesn't need a
// synthesized aria-label to avoid being an unlabeled focus stop. Only looks one level deep: a
// deeply-nested all-aria-hidden subtree won't be detected, but no current caller does that, and
// fully replicating DOM accessible-name computation here isn't proportionate for this helper.
function hasAccessibleChildContent(node: React.ReactNode): boolean {
  return React.Children.toArray(node).some((child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return child.toString().trim() !== '';
    }
    if (React.isValidElement(child)) {
      const hidden = (child.props as { 'aria-hidden'?: boolean | 'true' | 'false' })['aria-hidden'];
      return hidden !== true && hidden !== 'true';
    }
    return false;
  });
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, detailedContent }) => {
  const [isHoverVisible, setIsHoverVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const id = useId();

  const show = () => setIsHoverVisible(true);

  const hide = () => {
    // Don't hide if the detail view is open
    if (!isDetailVisible) {
      setIsHoverVisible(false);
    }
  };

  const handleWrapperBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Only hide when focus leaves the whole wrapper (trigger + bubble). Without this check,
    // tabbing from the trigger into the "Show details"/"Hide details" buttons inside the bubble
    // itself blurs the trigger and immediately hides the bubble those buttons live in, making
    // them permanently unreachable via keyboard.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    hide();
  };

  const handleDetailToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailVisible((prev) => !prev);
    // Ensure the tooltip becomes visible when detail is opened
    if (!isDetailVisible) {
      setIsHoverVisible(true);
    }
  };

  const forceHide = () => {
    setIsDetailVisible(false);
    setIsHoverVisible(false);
  };

  const isVisible = isHoverVisible || isDetailVisible;

  // Clone the child element to add aria-describedby directly to it for better accessibility,
  // merging with (not overwriting) any describedby the caller already set. Also enforce a
  // focusable trigger (tabIndex 0 unless the child already sets one) since the wrapper's
  // onFocus/onBlur can only fire once the trigger itself can receive keyboard focus — callers
  // frequently pass non-focusable elements (an InfoIcon, a plain div) as children.
  //
  // The tooltip's own content is only ever used as a SYNTHESIZED aria-label for children with
  // no accessible name of their own (a bare icon, an empty div) — never for a child that already
  // has one, whether via aria-labelledby, its own aria-label, or its own visible (non-hidden)
  // content (a labeled button, text). Overwriting a naturally-named element's name with the
  // tooltip description would make a screen reader announce something that disagrees with
  // what's on screen; aria-labelledby additionally takes precedence over aria-label in the
  // accessible-name computation regardless, so setting one alongside it would just be noise.
  const hasOwnAccessibleContent = hasAccessibleChildContent(children.props.children);
  const hasLabelledBy = Boolean(children.props['aria-labelledby']);
  const rawExistingLabel = children.props['aria-label'];
  const existingLabel =
    rawExistingLabel && rawExistingLabel.trim() !== '' ? rawExistingLabel : undefined;
  const hasExistingAccessibleName =
    hasLabelledBy || existingLabel !== undefined || hasOwnAccessibleContent;
  const fallbackLabel =
    !hasExistingAccessibleName && typeof content === 'string' && content.trim() !== ''
      ? content
      : undefined;
  const resolvedLabel = existingLabel ?? fallbackLabel;
  // A trigger can end up with SOME accessible name once rendered either because it already has
  // one, or because we're synthesizing one — either way it's safe (and necessary, for the
  // keyboard-access fix above) to make it focusable.
  const canHaveAccessibleName = hasExistingAccessibleName || resolvedLabel !== undefined;
  const existingDescribedBy = children.props['aria-describedby'];
  const describedBy = isVisible
    ? [existingDescribedBy, id].filter(Boolean).join(' ')
    : existingDescribedBy;
  const triggerWithAria = React.cloneElement(children, {
    'aria-describedby': describedBy || undefined,
    tabIndex: children.props.tabIndex ?? (canHaveAccessibleName ? 0 : undefined),
    'aria-label': resolvedLabel,
  });

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- pure hover/focus positioning wrapper around the real trigger element (children); onFocus/onBlur already make this keyboard-accessible, and it's not itself a widget that should be in the tab order.
    <div
      className="relative flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={handleWrapperBlur}
    >
      {triggerWithAria}
      {isVisible && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- keeps the tooltip open while the mouse is over the bubble itself; the trigger element (not this bubble) is the keyboard-accessible widget, matching the standard tooltip pattern. Deliberately not role="tooltip" here: that role must stay purely descriptive, and this bubble also hosts the interactive "Show details"/"Hide details" controls below.
        <div
          // Keep it open when mouse is over the tooltip itself
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-background border border-border rounded-lg shadow-lg text-xs text-text-secondary z-10 transition-opacity animate-fadeIn"
          style={{ animationDuration: '150ms' }}
        >
          <div className="flex justify-between items-start gap-2">
            <div id={id} role="tooltip" className="flex-grow">
              {content}
            </div>
            <div className="flex-shrink-0 flex items-center">
              {detailedContent && !isDetailVisible && (
                <button
                  onClick={handleDetailToggle}
                  className="text-text-secondary hover:text-brand-accent"
                  aria-expanded={isDetailVisible}
                  aria-label="Show details"
                >
                  <InfoIcon className="h-4 w-4" />
                </button>
              )}
              {isDetailVisible && (
                <button
                  onClick={forceHide}
                  className="text-text-secondary hover:text-text-primary"
                  aria-label="Hide details"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {isDetailVisible && detailedContent && (
            <div
              className="mt-2 pt-2 border-t border-border/50 text-text-primary/90 animate-fadeIn"
              style={{ animationDuration: '300ms' }}
            >
              {detailedContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

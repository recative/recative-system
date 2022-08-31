import * as React from 'react';

export const useContextMenuRemovalHandler = (
  containerRef: React.RefObject<HTMLDivElement>,
) => {
  const $container = containerRef.current;

  React.useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    $container?.addEventListener(
      'contextmenu',
      handleContextMenu,
    );

    return () => {
      $container?.removeEventListener(
        'contextmenu',
        handleContextMenu,
      );
    };
  }, [$container]);
};

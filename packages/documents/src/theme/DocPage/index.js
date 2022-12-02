import React from 'react';
import DocPage from '@theme-original/DocPage';

export default function DocPageWrapper(props) {
  return (
    <div className="recative__doc_page_wrap">
      <DocPage {...props} />
    </div>
  );
}

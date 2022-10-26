if (
  window.location.pathname.endsWith('index.html')
  || window.location.pathname.endsWith('index.htm')
) {
  document.title = 'Recative AP Renderer';
  import('./shell');
} else {
  import('@recative/ap-preview/src/web');
}

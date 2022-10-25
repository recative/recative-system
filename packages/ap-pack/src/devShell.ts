if (
  window.location.pathname === 'index.html'
  || window.location.pathname === 'index.htm'
) {
  import('./shell');
} else {
  import('@recative/ap-preview/src/web');
}
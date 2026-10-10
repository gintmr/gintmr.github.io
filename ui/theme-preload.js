/* gintmr-ui · 主题预载片段
   这段必须【内联】在 <head> 里、且排在任何样式表之前，否则深色主题会闪一下白。
   站点可以在它之前设 window.gintmrUIThemeColor 覆盖 theme-color 的两个取值。

   ★ 用客户端路由的站点（Astro ClientRouter 等）：给这个内联脚本加 rerun 标记
     （Astro 是 data-astro-rerun）。换页时路由会把 <html> 的属性同步成新文档那一份，
     本片段写上去的 data-gintmr_ui-theme 与 data-gintmr_ui-js 会被抹掉，
     新页面会先以浅色、且顶栏工具按钮隐藏的状态画一帧。详见 README「用客户端路由的站点」。 */
(function () {
  var root = document.documentElement;
  root.setAttribute('data-gintmr_ui-js', '');

  var colors = window.gintmrUIThemeColor || { light: '#fffaff', dark: '#191919' };
  var theme;
  try {
    theme = localStorage.getItem('gintmr_ui-theme');
  } catch (_) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-gintmr_ui-theme', theme);

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? colors.dark : colors.light);
})();

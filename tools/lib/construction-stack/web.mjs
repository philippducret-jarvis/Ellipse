import { readStaticTemplate } from './io.mjs';

export async function buildConstructionWebFiles() {
  const [constructionMapHtml, constructionMapCss, constructionMapJs, systemsBoardHtml, systemsBoardCss, systemsBoardJs, operatingModelHtml, operatingModelCss, operatingModelJs] = await Promise.all([
    readStaticTemplate('./static/construction-map/template.html', import.meta.url),
    readStaticTemplate('./static/construction-map/template.css', import.meta.url),
    readStaticTemplate('./static/construction-map/template.js', import.meta.url),
    readStaticTemplate('./static/systems-board/template.html', import.meta.url),
    readStaticTemplate('./static/systems-board/template.css', import.meta.url),
    readStaticTemplate('./static/systems-board/template.js', import.meta.url),
    readStaticTemplate('./static/operating-model/template.html', import.meta.url),
    readStaticTemplate('./static/operating-model/template.css', import.meta.url),
    readStaticTemplate('./static/operating-model/template.js', import.meta.url),
  ]);

  return {
    constructionMapHtml,
    constructionMapCss,
    constructionMapJs,
    systemsBoardHtml,
    systemsBoardCss,
    systemsBoardJs,
    operatingModelHtml,
    operatingModelCss,
    operatingModelJs,
  };
}

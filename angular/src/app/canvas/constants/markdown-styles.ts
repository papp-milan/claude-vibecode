/**
 * Eine einzige Quelle für das Markdown-Styling: wird sowohl in der Live-Ansicht
 * (MarkdownViewComponent) als auch im PNG-Export (SVG <style>) verwendet.
 */
export const MARKDOWN_CSS = `
.sbx-md{font:400 1rem/1.5 system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;overflow-wrap:anywhere;color:inherit}
.sbx-md>:first-child{margin-top:0}
.sbx-md>:last-child{margin-bottom:0}
.sbx-md h1,.sbx-md h2,.sbx-md h3,.sbx-md h4,.sbx-md h5,.sbx-md h6{margin:1.1em 0 .4em;line-height:1.25;font-weight:650}
.sbx-md h1{font-size:1.75rem}
.sbx-md h2{font-size:1.45rem}
.sbx-md h3{font-size:1.2rem}
.sbx-md h4{font-size:1.05rem}
.sbx-md h5{font-size:.95rem}
.sbx-md h6{font-size:.85rem;opacity:.75}
.sbx-md p,.sbx-md ul,.sbx-md ol,.sbx-md blockquote,.sbx-md pre,.sbx-md table{margin:.6em 0}
.sbx-md ul,.sbx-md ol{padding-left:1.5rem}
.sbx-md li>input[type=checkbox]{margin:0 .4rem 0 -1.1rem;vertical-align:middle}
.sbx-md blockquote{margin-left:0;padding:.1rem 0 .1rem .9rem;border-left:.25rem solid rgba(128,128,128,.6)}
.sbx-md code{font:.875em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:rgba(128,128,128,.22);padding:.1em .35em;border-radius:.25rem}
.sbx-md pre{background:#0d1117;color:#e6edf3;padding:.75rem;border-radius:.4rem}
.sbx-md pre code{background:none;padding:0;color:inherit;white-space:pre-wrap}
.sbx-md table{border-collapse:collapse;width:100%}
.sbx-md th,.sbx-md td{border:.0625rem solid rgba(128,128,128,.55);padding:.3rem .55rem;text-align:left}
.sbx-md th{background:rgba(128,128,128,.2)}
.sbx-md hr{border:0;border-top:.0625rem solid rgba(128,128,128,.6);margin:1rem 0}
.sbx-md img{max-width:100%}
.sbx-md a{color:#4fc3f7;text-decoration:underline}
.sbx-md del{opacity:.7}
.sbx-md .hljs-comment,.sbx-md .hljs-quote{color:#8b949e;font-style:italic}
.sbx-md .hljs-keyword,.sbx-md .hljs-selector-tag,.sbx-md .hljs-literal{color:#ff7b72}
.sbx-md .hljs-string,.sbx-md .hljs-regexp,.sbx-md .hljs-addition{color:#a5d6ff}
.sbx-md .hljs-number,.sbx-md .hljs-built_in,.sbx-md .hljs-meta{color:#79c0ff}
.sbx-md .hljs-title,.sbx-md .hljs-section{color:#d2a8ff}
.sbx-md .hljs-attr,.sbx-md .hljs-attribute,.sbx-md .hljs-variable,.sbx-md .hljs-template-variable,.sbx-md .hljs-type{color:#ffa657}
.sbx-md .hljs-deletion{color:#ffa198}
.sbx-md .hljs-emphasis{font-style:italic}
.sbx-md .hljs-strong{font-weight:700}
`;

export const TEXT_BOX_CSS = `
.text-box{box-sizing:border-box;width:100%;height:100%;padding:.75rem;overflow:hidden;border-radius:.25rem}
.text-box.note{box-shadow:0 .25rem .75rem rgba(0,0,0,.35)}
`;

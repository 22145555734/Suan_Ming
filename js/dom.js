/**
 * 极小的 DOM 工具。没有依赖，只负责把数据变成节点。
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * el('div', { class: 'x', text: '...' }, [child, 'text'])
 */
export function el(tag, props, children) {
  const node = document.createElement(tag);
  if (props) {
    for (const key of Object.keys(props)) {
      const val = props[key];
      if (val == null || val === false) continue;
      if (key === 'class') node.className = val;
      else if (key === 'text') node.textContent = val;
      else if (key === 'dataset') Object.assign(node.dataset, val);
      else if (key === 'on') {
        for (const evt of Object.keys(val)) node.addEventListener(evt, val[evt]);
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(node.style, val);
      } else {
        node.setAttribute(key, val === true ? '' : String(val));
      }
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  if (children == null) return node;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else if (child instanceof Node) node.appendChild(child);
    else node.appendChild(document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function frag(children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

/** 一屏只显示一个 section */
export function showScreen(name) {
  ['cover', 'input', 'result'].forEach((key) => {
    const node = document.getElementById('screen-' + key);
    if (!node) return;
    const active = key === name;
    node.hidden = !active;
    node.classList.toggle('is-active', active);
  });
  window.scrollTo(0, 0);
  document.documentElement.dataset.screen = name;
}

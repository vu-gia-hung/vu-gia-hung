function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAttribute(tag, name) {
  const attributeName = escapeRegExp(name);
  const match = new RegExp(`(?:^|\\s)${attributeName}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag);
  return match ? match[2] : null;
}

function setAttribute(tag, name, value) {
  const attributeName = escapeRegExp(name);
  const pattern = new RegExp(`(\\s${attributeName}\\s*=\\s*)(["'])(.*?)\\2`, 'i');
  const escapedValue = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  if (pattern.test(tag)) {
    return tag.replace(pattern, (_match, prefix, quote) => `${prefix}${quote}${escapedValue}${quote}`);
  }

  return tag.replace(/\s*\/?>$/, closing => ` ${name}="${escapedValue}"${closing.trimStart()}`);
}

function hasClass(tag, className) {
  const classes = getAttribute(tag, 'class');
  return classes ? classes.split(/\s+/).includes(className) : false;
}

function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceColorMappings(svg, mappings, label, alreadyStyledPattern = null) {
  let replacements = 0;
  let result = svg;

  for (const [pattern, replacement] of mappings) {
    result = result.replace(pattern, () => {
      replacements += 1;
      return replacement;
    });
  }

  if (replacements === 0) {
    const alreadyStyled = alreadyStyledPattern && alreadyStyledPattern.test(result);
    if (!alreadyStyled) {
      throw new Error(`No recognized source colors found in ${label}; the SVG palette may have changed.`);
    }
  }

  return { svg: result, replacements };
}

module.exports = {
  escapeXmlText,
  getAttribute,
  hasClass,
  replaceColorMappings,
  setAttribute
};

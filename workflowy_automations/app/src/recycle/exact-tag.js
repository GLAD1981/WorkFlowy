function hasExactTag(name, tag) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escapedTag}(?=$|\\s)`).test(name);
}

module.exports = { hasExactTag };

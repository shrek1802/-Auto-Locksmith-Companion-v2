function selectLogoSource(downloadedLogo, bundledIcon) {
  if (typeof downloadedLogo === 'string' && downloadedLogo.trim()) return 'downloaded';
  if (bundledIcon) return 'bundled';
  return 'initials';
}

module.exports = { selectLogoSource };

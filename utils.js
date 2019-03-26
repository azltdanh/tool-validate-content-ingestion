exports.utils = {
  normalize: (array) => {
    return array.map(item => { return item.toLowerCase().trim() });
  },
  capitalize: (text) => {
    return text.toLowerCase()
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ');
  }
};
const https = require('https');
https.get('https://tikzjax.com/v1/tikzjax.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const idx = data.indexOf('window.onload');
    console.log(data.substring(idx, idx + 2000));
  });
});





